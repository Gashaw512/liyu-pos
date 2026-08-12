// import { useAuthStore } from '@/stores/authStore'
// import type { Permission } from '@/types/permissions'

// interface Props {
//   permission: Permission
//   fallback?: React.ReactNode
//   children: React.ReactNode
// }

// export function RoleGuard({ permission, fallback = null, children }: Props) {
//   const hasPermission = useAuthStore(s => s.hasPermission)
//   return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
// }

'use client'

import React from 'react'
import { useAuthStore } from '@/stores/authStore'
// 👇 Changed back to 'import type' since we aren't using it as a value anymore
import type { Permission } from '@/types/permissions'

interface Props {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({ permission, fallback = null, children }: Props) {
  // 1. Core State Selectors
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const isLoading = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // 2. Hydration & Session Guard
  if (isLoading) {
    return null 
  }

  // 3. Structural Security Gate
  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}

