'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  readLastVisitedRoute,
  readOfflineSessionSnapshot,
  writeLastVisitedRoute,
} from '@/lib/offline/sessionFallback'
import type { ReactNode } from 'react'

interface OfflineAwareAppShellProps {
  children: ReactNode
  locale: string
  role?: string
  fullName?: string
  businessName?: string
  fallbackTitle?: string
}

export default function OfflineAwareAppShell({
  children,
  locale,
  role,
  fullName,
  businessName,
  fallbackTitle = 'Liyu POS',
}: OfflineAwareAppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOffline, setIsOffline] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [sessionState, setSessionState] = useState(() =>
    readOfflineSessionSnapshot(),
  )

  useEffect(() => {
    const updateOnlineState = () => setIsOffline(!navigator.onLine)

    setHasMounted(true)
    updateOnlineState()
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    const snapshot = readOfflineSessionSnapshot()
    if (snapshot) setSessionState(snapshot)

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  useEffect(() => {
    if (pathname) {
      writeLastVisitedRoute(pathname)
    }
  }, [pathname])

  useEffect(() => {
    if (!isOffline) return

    const cachedPath = readLastVisitedRoute()
    if (!cachedPath) return

    const isProtectedPath =
      cachedPath.includes('/dashboard') ||
      cachedPath.includes('/sales') ||
      cachedPath.includes('/inventory') ||
      cachedPath.includes('/reports') ||
      cachedPath.includes('/management')

    if (isProtectedPath && pathname && !pathname.includes('/login')) {
      router.replace(cachedPath as any)
    }
  }, [isOffline, pathname, router])

  const safeRole = role ?? sessionState?.user?.role ?? 'cashier'
  const safeFullName = fullName ?? sessionState?.user?.full_name ?? 'User'
  const safeBusinessName =
    businessName ?? sessionState?.business?.name ?? fallbackTitle

  const isProtectedRoute = useMemo(() => {
    return pathname?.includes('/dashboard') || pathname?.includes('/sales') || pathname?.includes('/inventory') || pathname?.includes('/reports') || pathname?.includes('/management')
  }, [pathname])

  const shouldShowOfflineFallback = hasMounted && isProtectedRoute && isOffline

  if (shouldShowOfflineFallback) {
    return (
      <div className="flex min-h-screen flex-col bg-cream-100 text-coffee-700">
        <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-8">
          <div className="w-full rounded-3xl border border-cream-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-berbere-50 text-xl font-black text-berbere-700">
                L
              </div>
            </div>

            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-berbere-600">
              Offline mode
            </p>

            <h1 className="mt-3 text-center text-2xl font-black text-coffee-900">
              {fallbackTitle}
            </h1>

            <p className="mt-3 text-center text-sm text-coffee-500">
              Your session is available locally. You can keep using the app while the connection is down, and it will sync when the network returns.
            </p>

            <div className="mt-5 rounded-2xl bg-cream-50 p-3 text-left text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-coffee-500">Business</span>
                <span className="font-bold text-coffee-900">{safeBusinessName}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-coffee-500">User</span>
                <span className="font-bold text-coffee-900">{safeFullName}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-coffee-500">Role</span>
                <span className="font-bold text-coffee-900">{safeRole}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-berbere-200 bg-berbere-50/40 p-3 text-center text-xs font-semibold text-berbere-700">
              Cached app view is active. No server redirect is forced while offline.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
