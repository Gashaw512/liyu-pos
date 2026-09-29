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
}: OfflineAwareAppShellProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      writeLastVisitedRoute(pathname)
    }
  }, [pathname])

  return <>{children}</>
}
