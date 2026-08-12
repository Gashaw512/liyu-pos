import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Business } from '@/types/database/business'
import type { Profile } from '@/types/database/users'
// ✅ Crucial change: Pulling the unified contract definition from your central system folder
import { Permission } from '@/types/permissions' 

interface AuthState {
  user: Profile | null
  business: Business | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: Profile | null) => void
  setBusiness: (business: Business | null) => void
  logout: () => void
  hasPermission: (action: Permission) => boolean
}

/**
 * 🏢 Scalable Enterprise Role-Based Access Control (RBAC) Matrix
 * Leverages native domain wildcards directly corresponding with your POS framework
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['*'], 
  manager: ['sales:*', 'inventory:*', 'reports:*', 'staff:*'],
  cashier: ['sales:create', 'sales:view'],
  inventory_clerk: ['inventory:update'],
  kitchen: ['sales:view'],
  waiter: ['sales:create', 'sales:view'],
  barman: ['sales:create', 'sales:view']
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      isLoading: true,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setBusiness: (business) => set({ business }),
      logout: () => set({ user: null, business: null, isAuthenticated: false, isLoading: false }),
      
      /**
       * ⚡ Multi-Tier Enterprise Permission Evaluation Engine
       * Safely validates absolute global wildcards, explicit actions, and custom scopes
       */
      hasPermission: (action: Permission): boolean => {
        const { user } = get()
        if (!user || !user.role) return false
        
        const activeRole = String(user.role).toLowerCase().trim()
        const assignedPermissions = ROLE_PERMISSIONS[activeRole] || []
        
        // Tier 1: Check absolute global admin clearance override
        if (assignedPermissions.includes('*')) return true
        
        // Tier 2: Check explicit exact string match (100% legacy token safety fallback)
        if (assignedPermissions.includes(action)) return true
        
        // Tier 3: Safely evaluate domain wildcard scopes (e.g., checks 'sales:*' for 'sales:create')
        if (action.includes(':')) {
          const [domain] = action.split(':')
          const hasDomainWildcard = assignedPermissions.some(
            (p) => p === '*' || p === `${domain}:*`
          )
          if (hasDomainWildcard) return true
        }
        
        return false
      },
    }),
    { 
      name: 'liyu-auth',
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false
      }
    }
  )
)
