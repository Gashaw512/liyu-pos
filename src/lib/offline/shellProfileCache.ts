const CACHE_KEY = 'liyu-shell-profile-v1'

export interface ShellProfileCache {
  userId: string
  role: string
  roles: string[]
  businessName: string
  onboardingCompleted: boolean
}

export function readShellProfileCache(): ShellProfileCache | null {
  if (typeof window === 'undefined') return null

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null')
    if (!value || typeof value !== 'object') return null

    const cache = value as Partial<ShellProfileCache>
    if (
      typeof cache.userId !== 'string' ||
      typeof cache.role !== 'string' ||
      !Array.isArray(cache.roles) ||
      !cache.roles.every((role) => typeof role === 'string') ||
      typeof cache.businessName !== 'string' ||
      typeof cache.onboardingCompleted !== 'boolean'
    ) return null

    return cache as ShellProfileCache
  } catch {
    return null
  }
}

export function writeShellProfileCache(cache: ShellProfileCache): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // The cache only improves offline shell rendering; storage failure must
    // not interfere with an authenticated online session.
  }
}

export function clearShellProfileCache(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore unavailable browser storage.
  }
}
