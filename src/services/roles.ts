import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type AvailableRole = 'owner' | 'manager' | 'cashier' | 'inventory_clerk' | 'waiter' | 'barman' | 'kitchen'

export interface RoleMutationResult {
  success: boolean
  error?: string
}

export const RoleService = {
  /**
   * Dynamically grants a role to a target user within the tenant boundary.
   * RLS policies automatically prevent non-admin escalation.
   */
  async grantRole(profileId: string, role: AvailableRole): Promise<RoleMutationResult> {
    try {
      const { error } = await supabase
        .from('profile_roles')
        .insert({
          profile_id: profileId,
          role_name: role
        })

      if (error) {
        // Handle unique constraint violations gracefully
        if (error.code === '23505') {
          return { success: true } // Role is already assigned
        }
        throw error
      }

      // Optional: Explicitly create an entry in your audit logs if needed by your compliance engine
      await this.logAdminAction('GRANT_ROLE', profileId, { role })

      return { success: true }
    } catch (err: any) {
      console.error(`[RoleService.grantRole] Failed to assign ${role} to ${profileId}:`, err)
      return { 
        success: false, 
        error: err.message || 'An unexpected error occurred while granting privileges.' 
      }
    }
  },

  /**
   * Dynamically revokes a role from a target user.
   */
  async revokeRole(profileId: string, role: AvailableRole): Promise<RoleMutationResult> {
    try {
      const { error } = await supabase
        .from('profile_roles')
        .delete()
        .eq('profile_id', profileId)
        .eq('role_name', role)

      if (error) throw error

      await this.logAdminAction('REVOKE_ROLE', profileId, { role })

      return { success: true }
    } catch (err: any) {
      console.error(`[RoleService.revokeRole] Failed to revoke ${role} from ${profileId}:`, err)
      return { 
        success: false, 
        error: err.message || 'An unexpected error occurred while revoking privileges.' 
      }
    }
  },

  /**
   * Internal helper to register admin modifications to the enterprise audit trail
   */
  async logAdminAction(action: string, targetUserId: string, metadata: object) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: action,
      table_name: 'profile_roles',
      record_id: targetUserId,
      new_values: metadata
    })
  }
}