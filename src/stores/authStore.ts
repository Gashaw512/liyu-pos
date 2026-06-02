import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Business } from '@/types'

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

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['all'],
  manager: ['view_reports','manage_products','manage_staff',
             'process_sales','manage_inventory','close_shifts'],
  cashier: ['process_sales','view_own_shifts','view_products'],
  inventory_clerk: ['manage_inventory','view_products'],
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setBusiness: (business) => set({ business }),
      logout: () => set({ user: null, business: null, isAuthenticated: false }),
      hasPermission: (action) => {
        const { user } = get()
        if (!user) return false
        const perms = ROLE_PERMISSIONS[user.role] || []
        return perms.includes('all') || perms.includes(action)
      },
    }),
    { name: 'liyu-auth' }
  )
)