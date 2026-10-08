'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { writeLastVisitedRoute } from '@/lib/offline/sessionFallback'
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
}: OfflineAwareAppShellProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      writeLastVisitedRoute(pathname)
    }
  }, [pathname])

  useEffect(() => {
    if (!navigator.onLine || !('caches' in window)) return

    const warmCoreRoutes = async () => {
      try {
        const cache = await caches.open('others')
        await Promise.all(['/sales', '/inventory'].map(async (route) => {
          const url = new URL(`/${locale}${route}`, window.location.origin)
          try {
            // Refresh previously cached documents as well, so offline launches
            // do not keep pointing at a stale route after a deployment.
            const response = await fetch(url.href, { credentials: 'same-origin' })
            if (
              response.ok &&
              !response.redirected &&
              response.headers.get('content-type')?.includes('text/html')
            ) {
              await cache.put(url.href, response)
            }
          } catch {
            // The route can still be opened online if it cannot be cached now.
          }
        }))
      } catch {
        // Offline route caching is best-effort and must not block the app shell.
      }
    }

    void warmCoreRoutes()
  }, [locale])

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = (input, init) => {
      if (!navigator.onLine) {
        const requestUrl = input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input
        const destination = new URL(requestUrl, window.location.href)

        if (
          destination.origin === window.location.origin &&
          destination.pathname.startsWith('/api/')
        ) {
          return Promise.reject(
            new TypeError('Internet connection required. This action is unavailable offline.'),
          )
        }
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return <>{children}</>
}
