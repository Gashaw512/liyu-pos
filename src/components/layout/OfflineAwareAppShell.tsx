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
        await Promise.all(['/sales', '/inventory', '/shifts'].map(async (route) => {
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

  useEffect(() => {
    const openCachedRoute = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const link = target.closest('a[href]')
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return

      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin) return

      event.preventDefault()
      window.location.assign(destination.pathname + destination.search + destination.hash)
    }

    document.addEventListener('click', openCachedRoute, true)
    return () => document.removeEventListener('click', openCachedRoute, true)
  }, [])

  return <>{children}</>
}
