import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'

export const dynamic = 'force-dynamic'

const issueRoles = ['owner', 'manager', 'inventory_clerk']
const recipientRoles = ['barman', 'kitchen', 'waiter', 'cashier']

export async function GET() {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, [...issueRoles, ...recipientRoles])
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  const profile = auth.profile!
  if (!profile.business_id || !profile.branch_id) return NextResponse.json({ error: 'No business branch is assigned.' }, { status: 403 })

  const admin = createAdminDatabaseClient()
  const canIssue = auth.roles.some((role) => issueRoles.includes(role))
  const canReceive = auth.roles.some((role) => recipientRoles.includes(role))

  try {
    const [profilesResult, handoversResult] = await Promise.all([
      canIssue
        ? admin.from('profiles').select('id,full_name,role')
          .eq('business_id', profile.business_id)
          .eq('branch_id', profile.branch_id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .neq('id', auth.user!.id)
        : Promise.resolve({ data: [], error: null }),
      (() => {
        let query = admin.from('stock_handovers')
        .select('id,request_id,business_id,branch_id,issued_by_clerk_id,received_by_user_id,product_id,recipient_shift_id,custody_shift_id,quantity_issued,status,dispute_reason,issued_at,verified_at')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        if (!canIssue) query = query.eq('received_by_user_id', auth.user!.id)
        return query
        .order('issued_at', { ascending: false })
        .limit(50)
      })(),
    ])
    if (profilesResult.error || handoversResult.error) throw profilesResult.error ?? handoversResult.error

    const activeProfileIds = (profilesResult.data ?? []).map((row) => row.id)
    let recipients: Array<{ id: string; name: string }> = []
    if (canIssue && activeProfileIds.length) {
      const profiles = profilesResult.data ?? []
      const ids = profiles.map((row) => row.id)
      const { data: assignments, error: assignmentsError } = ids.length
        ? await admin.from('profile_roles').select('profile_id,role_name').in('profile_id', ids)
        : { data: [], error: null }
      if (assignmentsError) throw assignmentsError
      const rolesById = new Map<string, Set<string>>()
      for (const row of profiles ?? []) rolesById.set(row.id, new Set(row.role ? [row.role] : []))
      for (const assignment of assignments ?? []) rolesById.get(assignment.profile_id)?.add(assignment.role_name)
      recipients = (profiles ?? [])
        .filter((row) => [...(rolesById.get(row.id) ?? [])].some((role) => recipientRoles.includes(role)))
        .map((row) => ({ id: row.id, name: row.full_name || 'Staff member' }))
    }

    const rows = handoversResult.data ?? []
    let custodyReports: Array<{
      id: string
      recipientName: string
      openedAt: string
      closedAt: string | null
      status: string
      lines: unknown[]
    }> = []
    if (canIssue) {
      const { data: closedShifts, error: closedShiftsError } = await admin
        .from('custody_shifts')
        .select('id,user_id,opened_at,closed_at')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .eq('status', 'CLOSED')
        .order('closed_at', { ascending: false })
        .limit(50)
      if (closedShiftsError) throw closedShiftsError
      const closedIds = (closedShifts ?? []).map((shift) => shift.id)
      if (closedIds.length) {
        const [reportResult, userResult] = await Promise.all([
          admin.from('custody_shift_reconciliations')
            .select('custody_shift_id,status,accepted_stock_snapshot,physical_count_snapshot,reconciled_at')
            .in('custody_shift_id', closedIds),
          admin.from('profiles')
            .select('id,full_name')
            .eq('business_id', profile.business_id)
            .in('id', [...new Set((closedShifts ?? []).map((shift) => shift.user_id))]),
        ])
        if (reportResult.error || userResult.error) throw reportResult.error ?? userResult.error
        const reportsByShift = new Map((reportResult.data ?? []).map((row) => [row.custody_shift_id, row]))
        const usersById = new Map((userResult.data ?? []).map((row) => [row.id, row.full_name || 'Staff member']))
        custodyReports = (closedShifts ?? []).flatMap((shift) => {
          const report = reportsByShift.get(shift.id)
          if (!report) return []
          return [{
            id: shift.id,
            recipientName: usersById.get(shift.user_id) ?? 'Staff member',
            openedAt: shift.opened_at,
            closedAt: shift.closed_at,
            status: report.status,
            lines: Array.isArray(report.accepted_stock_snapshot) ? report.accepted_stock_snapshot : [],
          }]
        })
      }
    }
    let custody: {
      id: string
      openedAt: string
      status: string
      canReconcile: boolean
      reconciliationStatus: string | null
      lines: Array<{ productId: string; productName: string; productNameAm: string | null; quantityIssued: number; soldQuantity: number }>
      reconciliation: unknown
    } | null = null
    if (canReceive && !canIssue) {
      const { data: activeShift, error: activeShiftError } = await admin
        .from('custody_shifts')
        .select('id,opened_at,status,close_reason')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .eq('user_id', auth.user!.id)
        .eq('status', 'ACTIVE')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeShiftError) throw activeShiftError

      let custodyShift = activeShift
      let reconciliation: { status: string; accepted_stock_snapshot: unknown; physical_count_snapshot: unknown; reconciled_at: string | null } | null = null
      if (!custodyShift) {
        const { data: closedShifts, error: closedShiftsError } = await admin
          .from('custody_shifts')
          .select('id,opened_at,status,close_reason,closed_at')
          .eq('business_id', profile.business_id)
          .eq('branch_id', profile.branch_id)
          .eq('user_id', auth.user!.id)
          .eq('status', 'CLOSED')
          .in('close_reason', ['branch_report_close', 'recipient_reconciliation'])
          .order('closed_at', { ascending: false })
          .limit(20)
        if (closedShiftsError) throw closedShiftsError
        const closedIds = (closedShifts ?? []).map((shift) => shift.id)
        if (closedIds.length) {
          const { data: reports, error: reportsError } = await admin
            .from('custody_shift_reconciliations')
            .select('custody_shift_id,status,accepted_stock_snapshot,physical_count_snapshot,reconciled_at')
            .in('custody_shift_id', closedIds)
          if (reportsError) throw reportsError
          const reportByShift = new Map((reports ?? []).map((report) => [report.custody_shift_id, report]))
          custodyShift = (closedShifts ?? []).find((shift) => {
            const report = reportByShift.get(shift.id)
            return report?.status === 'submitted'
              || (shift.close_reason === 'branch_report_close' && report?.status === 'not_submitted')
          }) ?? null
          reconciliation = custodyShift ? reportByShift.get(custodyShift.id) ?? null : null
        }
      }

      if (custodyShift) {
        const { data: custodyEntries, error: custodyEntriesError } = await admin
          .from('custody_shift_inventory')
          .select('product_id,quantity_received')
          .eq('business_id', profile.business_id)
          .eq('branch_id', profile.branch_id)
          .eq('custody_shift_id', custodyShift.id)
      if (custodyEntriesError) throw custodyEntriesError
        const { data: soldAllocations, error: soldAllocationsError } = await admin
          .from('kot_sale_allocations')
          .select('product_id,quantity')
          .eq('business_id', profile.business_id)
          .eq('branch_id', profile.branch_id)
          .eq('custody_shift_id', custodyShift.id)
        if (soldAllocationsError) throw soldAllocationsError
        if (!reconciliation) {
          const { data: report, error: reportError } = await admin
            .from('custody_shift_reconciliations')
            .select('status,accepted_stock_snapshot,physical_count_snapshot,reconciled_at')
            .eq('custody_shift_id', custodyShift.id)
            .maybeSingle()
          if (reportError) throw reportError
          reconciliation = report
        }
        const custodyProductIds = [...new Set((custodyEntries ?? []).map((entry) => entry.product_id))]
        const { data: custodyProducts, error: custodyProductsError } = custodyProductIds.length
          ? await admin.from('products').select('id,name,name_am').eq('business_id', profile.business_id).in('id', custodyProductIds)
          : { data: [], error: null }
        if (custodyProductsError) throw custodyProductsError
        const custodyProductMap = new Map((custodyProducts ?? []).map((product) => [product.id, product]))
        const issuedByProduct = new Map<string, number>()
        const soldByProduct = new Map<string, number>()
        for (const entry of custodyEntries ?? []) {
          issuedByProduct.set(entry.product_id, (issuedByProduct.get(entry.product_id) ?? 0) + Number(entry.quantity_received || 0))
        }
        for (const allocation of soldAllocations ?? []) {
          soldByProduct.set(allocation.product_id, (soldByProduct.get(allocation.product_id) ?? 0) + Number(allocation.quantity || 0))
        }
        custody = {
          id: custodyShift.id,
          openedAt: custodyShift.opened_at,
          status: custodyShift.status,
          canReconcile: custodyShift.status === 'ACTIVE'
            || (custodyShift.close_reason === 'branch_report_close' && reconciliation?.status === 'not_submitted'),
          reconciliationStatus: reconciliation?.status ?? null,
          lines: [...issuedByProduct].map(([productId, quantityIssued]) => {
            const product = custodyProductMap.get(productId)
            return {
              productId,
              productName: product?.name ?? 'Product',
              productNameAm: product?.name_am ?? null,
              quantityIssued,
              soldQuantity: soldByProduct.get(productId) ?? 0,
            }
          }),
          reconciliation: reconciliation?.status === 'submitted'
            ? { lines: reconciliation.accepted_stock_snapshot, physicalCounts: reconciliation.physical_count_snapshot, reconciledAt: reconciliation.reconciled_at }
            : null,
        }
      }
    }
    const personIds = [...new Set(rows.flatMap((row) => [row.issued_by_clerk_id, row.received_by_user_id]))]
    const productIds = [...new Set(rows.map((row) => row.product_id))]
    const [peopleResult, productsResult] = await Promise.all([
      personIds.length ? admin.from('profiles').select('id,full_name').in('id', personIds) : Promise.resolve({ data: [], error: null }),
      productIds.length ? admin.from('products').select('id,name,name_am').in('id', productIds).eq('business_id', profile.business_id) : Promise.resolve({ data: [], error: null }),
    ])
    if (peopleResult.error || productsResult.error) throw peopleResult.error ?? productsResult.error
    const people = new Map((peopleResult.data ?? []).map((row) => [row.id, row.full_name || 'Staff member']))
    const products = new Map((productsResult.data ?? []).map((row) => [row.id, { name: row.name, nameAm: row.name_am }]))
    const handovers = rows.map((row) => ({
      ...row,
      issuerName: people.get(row.issued_by_clerk_id) ?? 'Staff member',
      recipientName: people.get(row.received_by_user_id) ?? 'Staff member',
      product: products.get(row.product_id) ?? { name: 'Product', nameAm: null },
      canVerify: canReceive && row.received_by_user_id === auth.user!.id && row.status === 'pending_verification',
    }))

    return NextResponse.json({
      canIssue,
      isStationRecipient: !canIssue && canReceive,
      recipients,
      handovers,
      custody,
      custodyReports,
    })
  } catch (error) {
    console.error('[STOCK HANDOVER] Failed to load handovers:', error)
    return NextResponse.json({ error: 'Could not load stock handovers.' }, { status: 500 })
  }
}
