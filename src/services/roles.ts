export type AvailableRole = 'owner' | 'manager' | 'cashier' | 'inventory_clerk' | 'waiter' | 'barman' | 'kitchen'

export interface RoleMutationResult {
  success: boolean
  error?: string
}

async function updateRole(profileId: string, role: AvailableRole, assigned: boolean): Promise<RoleMutationResult> {
  try {
    const response = await fetch(`/api/management/staff/${profileId}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, assigned }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) return { success: false, error: result.error ?? 'Could not update staff roles.' }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not update staff roles.' }
  }
}

/** All role changes go through the authenticated, tenant-scoped management API. */
export const RoleService = {
  grantRole(profileId: string, role: AvailableRole) {
    return updateRole(profileId, role, true)
  },
  revokeRole(profileId: string, role: AvailableRole) {
    return updateRole(profileId, role, false)
  },
}
