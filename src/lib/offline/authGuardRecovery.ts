import type { ShellProfileCache } from './shellProfileCache'

export function isExplicitSessionRejection(status: unknown): boolean {
  return status === 401 || status === 403
}

export function canRestoreShellProfile(
  sessionUserId: string | null | undefined,
  cachedProfile: ShellProfileCache | null,
  expectedUserId?: string,
): cachedProfile is ShellProfileCache {
  return Boolean(
    sessionUserId &&
    cachedProfile &&
    cachedProfile.userId === sessionUserId &&
    (!expectedUserId || expectedUserId === sessionUserId),
  )
}

export function getAuthGuardRecoveryAction(
  status: unknown,
  sessionUserId: string | null | undefined,
  cachedProfile: ShellProfileCache | null,
  expectedUserId?: string,
): 'redirect' | 'restore' | 'unavailable' {
  if (isExplicitSessionRejection(status)) return 'redirect'
  if (!sessionUserId && !cachedProfile) return 'redirect'
  return canRestoreShellProfile(sessionUserId, cachedProfile, expectedUserId)
    ? 'restore'
    : 'unavailable'
}
