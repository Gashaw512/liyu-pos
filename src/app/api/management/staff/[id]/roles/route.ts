import { NextResponse } from 'next/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const assignableRoles = new Set(['manager', 'cashier', 'inventory_clerk', 'waiter', 'barman', 'kitchen'])
const managerAssignableRoles = new Set(['cashier', 'inventory_clerk', 'waiter', 'barman', 'kitchen'])

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const client = await createClient()
  const auth = await getAuthorizedProfile(client, ['owner', 'manager'])
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 })
  }

  const { id: targetId } = await context.params
  const body = await request.json().catch(() => null) as { role?: unknown; assigned?: unknown } | null
  if (!UUID.test(targetId) || !body || typeof body.role !== 'string' || typeof body.assigned !== 'boolean') {
    return NextResponse.json({ error: 'Choose a valid role change.' }, { status: 400 })
  }
  if (!assignableRoles.has(body.role)) {
    return NextResponse.json({ error: 'The owner role can only be assigned through business ownership setup.' }, { status: 400 })
  }

  const isOwner = auth.roles.includes('owner')
  if (!isOwner && !managerAssignableRoles.has(body.role)) {
    return NextResponse.json({ error: 'Managers can assign operational roles only.' }, { status: 403 })
  }
  if (targetId === auth.user!.id) {
    return NextResponse.json({ error: 'You cannot change your own roles here.' }, { status: 403 })
  }

  const profile = auth.profile!
  if (!profile.business_id) return NextResponse.json({ error: 'Business context is unavailable.' }, { status: 403 })
  const admin = createAdminDatabaseClient()
  const { data: target, error: targetError } = await admin.from('profiles')
    .select('id,business_id,role,is_active,deleted_at')
    .eq('id', targetId)
    .eq('business_id', profile.business_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (targetError) return NextResponse.json({ error: 'Could not verify this staff member.' }, { status: 500 })
  if (!target || !target.is_active) return NextResponse.json({ error: 'Active staff member not found in this business.' }, { status: 404 })
  if (target.role === 'owner' || (!isOwner && target.role === 'manager')) {
    return NextResponse.json({ error: 'You do not have permission to change this staff member’s roles.' }, { status: 403 })
  }
  if (!body.assigned && target.role === body.role) {
    return NextResponse.json({ error: 'A staff member’s primary role cannot be removed here.' }, { status: 400 })
  }

  if (body.assigned) {
    const { error } = await admin.from('profile_roles').upsert(
      { profile_id: target.id, role_name: body.role },
      { onConflict: 'profile_id,role_name', ignoreDuplicates: true },
    )
    if (error) return NextResponse.json({ error: 'Could not add this role.' }, { status: 500 })
  } else {
    const { error } = await admin.from('profile_roles').delete()
      .eq('profile_id', target.id)
      .eq('role_name', body.role)
    if (error) return NextResponse.json({ error: 'Could not remove this role.' }, { status: 500 })
  }

  const { data: roleRows, error: rolesError } = await admin.from('profile_roles')
    .select('role_name').eq('profile_id', target.id)
  if (rolesError) return NextResponse.json({ error: 'Role was saved, but the updated list could not be loaded.' }, { status: 500 })
  const roles = [...new Set([target.role, ...(roleRows ?? []).map((row) => row.role_name)])]
  return NextResponse.json({ success: true, roles })
}
