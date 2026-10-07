import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'
import { buildCustodyCountLines } from '@/lib/kitchen/custody-stock'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const recipientRoles = ['barman', 'kitchen', 'waiter', 'cashier']

type ReconciliationLineInput = {
  productId: string
  usedQuantity: number
  returnedQuantity: number
  wastedQuantity: number
  physicalCount: number
}

export async function POST(request: Request) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, recipientRoles)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  }

  const profile = auth.profile!
  if (!profile.business_id || !profile.branch_id) {
    return NextResponse.json({ error: 'No business branch is assigned.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    requestId?: unknown
    lines?: unknown
  } | null
  if (typeof body?.requestId !== 'string' || !UUID.test(body.requestId) || !Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 500) {
    return NextResponse.json({ error: 'Submit a stock count for each product.' }, { status: 400 })
  }

  const lines: ReconciliationLineInput[] = []
  const seenProducts = new Set<string>()
  for (const raw of body.lines) {
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'The stock count contains an invalid product row.' }, { status: 400 })
    }
    const line = raw as Record<string, unknown>
    const quantities = [line.usedQuantity, line.returnedQuantity, line.wastedQuantity, line.physicalCount]
    if (typeof line.productId !== 'string' || !UUID.test(line.productId)
      || seenProducts.has(line.productId)
      || quantities.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ error: 'Enter zero or a valid quantity for every product.' }, { status: 400 })
    }
    seenProducts.add(line.productId)
    lines.push({
      productId: line.productId,
      usedQuantity: line.usedQuantity as number,
      returnedQuantity: line.returnedQuantity as number,
      wastedQuantity: line.wastedQuantity as number,
      physicalCount: line.physicalCount as number,
    })
  }

  const admin = createAdminDatabaseClient()
  const { data: activeProfile, error: profileError } = await admin
    .from('profiles')
    .select('is_active')
    .eq('id', auth.user!.id)
    .eq('business_id', profile.business_id)
    .eq('branch_id', profile.branch_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Could not verify your staff account.' }, { status: 500 })
  if (!activeProfile?.is_active) return NextResponse.json({ error: 'Your staff account is inactive.' }, { status: 403 })

  const { data: activeShift, error: activeShiftError } = await admin
    .from('custody_shifts')
    .select('id')
    .eq('business_id', profile.business_id)
    .eq('branch_id', profile.branch_id)
    .eq('user_id', auth.user!.id)
    .eq('status', 'ACTIVE')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (activeShiftError) return NextResponse.json({ error: 'Could not load your active stock custody.' }, { status: 500 })

  let custodyShiftId = activeShift?.id ?? null
  if (!custodyShiftId) {
    const { data: closedShifts, error: closedShiftsError } = await admin
      .from('custody_shifts')
      .select('id,closed_at')
      .eq('business_id', profile.business_id)
      .eq('branch_id', profile.branch_id)
      .eq('user_id', auth.user!.id)
      .eq('status', 'CLOSED')
      .eq('close_reason', 'branch_report_close')
      .order('closed_at', { ascending: false })
      .limit(20)
    if (closedShiftsError) return NextResponse.json({ error: 'Could not load your pending stock count.' }, { status: 500 })
    const shiftIds = (closedShifts ?? []).map((shift) => shift.id)
    if (shiftIds.length) {
      const { data: pendingCounts, error: pendingCountsError } = await admin
        .from('custody_shift_reconciliations')
        .select('custody_shift_id')
        .in('custody_shift_id', shiftIds)
        .eq('status', 'not_submitted')
      if (pendingCountsError) return NextResponse.json({ error: 'Could not load your pending stock count.' }, { status: 500 })
      const pendingIds = new Set((pendingCounts ?? []).map((row) => row.custody_shift_id))
      custodyShiftId = (closedShifts ?? []).find((shift) => pendingIds.has(shift.id))?.id ?? null
    }
  }

  const soldByProduct = new Map<string, number>()
  const issuedByProduct = new Map<string, number>()
  if (custodyShiftId) {
    const [issuedResult, soldResult] = await Promise.all([
      admin.from('custody_shift_inventory')
        .select('product_id,quantity_received')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .eq('custody_shift_id', custodyShiftId),
      admin.from('kot_sale_allocations')
        .select('product_id,quantity')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .eq('custody_shift_id', custodyShiftId),
    ])
    if (issuedResult.error || soldResult.error) {
      return NextResponse.json({ error: 'Could not load accepted stock and completed sales.' }, { status: 500 })
    }
    for (const row of issuedResult.data ?? []) {
      issuedByProduct.set(row.product_id, (issuedByProduct.get(row.product_id) ?? 0) + Number(row.quantity_received || 0))
    }
    for (const row of soldResult.data ?? []) {
      soldByProduct.set(row.product_id, (soldByProduct.get(row.product_id) ?? 0) + Number(row.quantity || 0))
    }
  }

  let countLines: ReturnType<typeof buildCustodyCountLines>
  try {
    countLines = buildCustodyCountLines(lines, soldByProduct, issuedByProduct)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Stock use exceeds accepted stock.' }, { status: 400 })
  }

  const { data, error } = await admin.rpc('submit_custody_stock_reconciliation', {
    p_request_id: body.requestId,
    p_business_id: profile.business_id,
    p_branch_id: profile.branch_id,
    p_actor_id: auth.user!.id,
    // The existing transactional RPC accepts one used quantity. Add the
    // server-derived KOT sale allocation so its stock ceiling and snapshot
    // include sold items exactly once. User-entered use remains separate in
    // the response above; no branch inventory is changed by this count.
    p_lines: countLines.map((line) => ({
      product_id: line.productId,
      used_quantity: line.usedIncludingSales,
      returned_quantity: line.returnedQuantity,
      wasted_quantity: line.wastedQuantity,
      physical_count: line.physicalCount,
    })),
  })
  if (error) {
    const conflict = /already used|no open or pending custody count|does not match accepted stock|cannot exceed/i.test(error.message)
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 })
  }

  return NextResponse.json({ success: true, reconciliation: data, lines: countLines })
}
