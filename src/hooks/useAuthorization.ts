import { useState, useEffect } from 'react'
// 1. Ensure createBrowserClient is imported
import { createBrowserClient } from '@supabase/ssr'

export interface AuthorizationMatrix {
  loading: boolean
  roles: string[]
  isOwner: boolean
  isManager: boolean
  isCashier: boolean
  isWaiter: boolean
  isBarman: boolean
  isKitchen: boolean
  canProcessPayments: boolean
  canManageOrders: boolean
  canSeeKDS: boolean
  canSeeBarQueue: boolean
  canModifyInventory: boolean
}

// 2. Best Practice: Instantiate the client once outside the hook
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useAuthorization(): AuthorizationMatrix {
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function resolveActiveUserRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setRoles([])
          return
        }

        // Pull entire list of assigned permissions from our new multi-role table
        const { data, error } = await supabase
          .from('profile_roles')
          .select('role_name')
          .eq('profile_id', user.id)

        if (error) throw error

        if (data) {
          setRoles(data.map((r: { role_name: string }) => r.role_name))
        }
      } catch (err) {
        console.error('Failed processing multi-role contextual matrix fetch:', err)
      } finally {
        setLoading(false)
      }
    }

    resolveActiveUserRoles()
  }, []) // Removed supabase from dependency array since it is stable outside

  // Boolean helper maps evaluating access conditions across composite assignments
  const checkIntersection = (allowed: string[]) => allowed.some(r => roles.includes(r))

  return {
    loading,
    roles,
    isOwner: roles.includes('owner'),
    isManager: roles.includes('manager'),
    isCashier: roles.includes('cashier'),
    isWaiter: roles.includes('waiter'),
    isBarman: roles.includes('barman'),
    isKitchen: roles.includes('kitchen'),
    
    // Composite Access Capabilities (Perfect for mixed role scales!)
    canProcessPayments: checkIntersection(['owner', 'manager', 'cashier']),
    canManageOrders: checkIntersection(['owner', 'manager', 'waiter']),
    canSeeKDS: checkIntersection(['owner', 'manager', 'kitchen']),
    canSeeBarQueue: checkIntersection(['owner', 'manager', 'barman']),
    canModifyInventory: checkIntersection(['owner', 'manager', 'inventory_clerk']),
  }
}
