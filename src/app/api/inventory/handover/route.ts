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
      admin.from('stock_handovers')
        .select('id,request_id,business_id,branch_id,issued_by_clerk_id,received_by_user_id,product_id,recipient_shift_id,custody_shift_id,quantity_issued,status,dispute_reason,issued_at,verified_at')
        .eq('business_id', profile.business_id)
        .eq('branch_id', profile.branch_id)
        .or(`issued_by_clerk_id.eq.${auth.user!.id},received_by_user_id.eq.${auth.user!.id}`)
        .order('issued_at', { ascending: false })
        .limit(50),
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

    return NextResponse.json({ canIssue, recipients, handovers })
  } catch (error) {
    console.error('[STOCK HANDOVER] Failed to load handovers:', error)
    return NextResponse.json({ error: 'Could not load stock handovers.' }, { status: 500 })
  }
}
