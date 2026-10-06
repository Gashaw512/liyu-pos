import { createClient } from '@/lib/supabase/server'
import { createAdminDatabaseClient, getAuthorizedProfile } from '@/lib/shift-reports/server'

type RoleProfile = {
  id: string
  business_id: string
  branch_id: string | null
  role: string | null
}

export async function authorizePrintAgent(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!bearer) {
    const client = await createClient()
    const auth = await getAuthorizedProfile(client, ['owner', 'manager', 'kitchen', 'barman'])
    if (auth.error || !auth.profile || !auth.roles) {
      return { client: null, profile: null, roles: [], error: auth.error ?? 'Unauthorized' }
    }
    return { client, profile: auth.profile as RoleProfile, roles: auth.roles, error: null }
  }

  const client = createAdminDatabaseClient()
  const { data: { user }, error: userError } = await client.auth.getUser(bearer)
  if (userError || !user) return { client: null, profile: null, roles: [], error: 'Unauthorized' }
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,business_id,branch_id,role').eq('id', user.id).is('deleted_at', null).maybeSingle()
  if (profileError || !profile?.business_id) return { client: null, profile: null, roles: [], error: 'Business profile is unavailable.' }
  const { data: assignedRoles, error: rolesError } = await client.from('profile_roles').select('role_name').eq('profile_id', user.id)
  if (rolesError) return { client: null, profile: null, roles: [], error: 'Could not verify printer permissions.' }
  const roles = Array.from(new Set([...(profile.role ? [profile.role] : []), ...(assignedRoles ?? []).map((item) => item.role_name)]))
  if (!roles.some((role) => ['owner', 'manager', 'kitchen', 'barman'].includes(role))) {
    return { client: null, profile: null, roles, error: 'Forbidden' }
  }
  return { client, profile: profile as RoleProfile, roles, error: null }
}
