// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { updateSession } from './lib/supabase/middleware'

// 1. Initialize global next-intl internationalization boundaries
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'am'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true
})

/**
 * 🛡️ Next.js 16 Unified Enterprise Proxy Gateway
 * Merges localized structural routing configurations and Supabase session refreshes.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 2. Performance Guard: Bypass heavy auth/i18n execution threads for static system assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 3. Process localized routing rules to establish base headers and cookie context arrays
  const initialIntlResponse = intlMiddleware(request)

  // 4. Pass the localized response down into Supabase to attach session tokens seamlessly
  // This automatically flushes out the "process.version" Edge Runtime warnings safely.
  const finalResponse = await updateSession(request, initialIntlResponse)

  return finalResponse
}

// 5. Scoped Route Matcher to preserve computing resources
export const config = {
  matcher: [
    '/',
    '/(am|en)/:path*',
    '/((?!api|_next|static|.*\\..*).*)'
  ]
}
