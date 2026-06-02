import { useAuthStore } from '@/stores/authStore'
import type { Permission } from '@/types/permissions'

interface Props {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({ permission, fallback = null, children }: Props) {
  const hasPermission = useAuthStore(s => s.hasPermission)
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}