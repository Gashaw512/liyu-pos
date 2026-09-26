export type OfflineSessionSnapshot = {
  user: {
    id?: string
    role?: string
    full_name?: string
    business_id?: string
    branch_id?: string
  } | null
  business: {
    name?: string
  } | null
}

const SESSION_STORAGE_KEY = 'liyu-auth'
const LAST_PATH_STORAGE_KEY = 'liyu-last-path'

export function readOfflineSessionSnapshot(): OfflineSessionSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const state = parsed?.state ?? parsed

    if (!state) return null

    return {
      user: state.user ?? null,
      business: state.business ?? null,
    }
  } catch {
    return null
  }
}

export function writeLastVisitedRoute(path: string): void {
  if (typeof window === 'undefined') return

  try {
    if (!path || path === '/') return
    window.localStorage.setItem(LAST_PATH_STORAGE_KEY, path)
  } catch {
    // no-op; localStorage may be unavailable in private or locked-down contexts
  }
}

export function readLastVisitedRoute(): string | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(LAST_PATH_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearLastVisitedRoute(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(LAST_PATH_STORAGE_KEY)
  } catch {
    // no-op
  }
}

export function hydrateOfflineAuthStore(store: {
  setState?: (state: Record<string, unknown>) => void
  user?: { role?: string; full_name?: string } | null
  business?: { name?: string } | null
  isAuthenticated?: boolean
  isLoading?: boolean
}): void {
  const snapshot = readOfflineSessionSnapshot()
  if (!snapshot) return

  const user = snapshot.user ?? null
  const business = snapshot.business ?? null
  const nextState = {
    user,
    business,
    isAuthenticated: !!user,
    isLoading: false,
  }

  if (typeof store.setState === 'function') {
    store.setState(nextState)
    return
  }

  Object.assign(store, nextState)
}

export function isOfflineFallbackEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return typeof navigator !== 'undefined' && !navigator.onLine
}
