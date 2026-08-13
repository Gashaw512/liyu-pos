// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { updateSession } from './lib/supabase/middleware'

/**
 * 🌐 1. High-Performance Localization Matrix Configuration
 * Sets Amharic and English routing schemas cleanly.
 */
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'am'],
  defaultLocale: 'am', // Set Amharic as default for local business operations alignment
  localePrefix: 'always',
  localeDetection: true
})

/**
 * 🛡️ 2. Tailored Unified Enterprise Proxy Gateway
 * Merges localized routing rules with background Supabase cookie tracking threads.
 * Designed directly to execute on low-power POS terminal devices safely.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // High-Speed Short Circuit Guard: 
  // Instantly bypasses heavy operations for database sync, templates, exports, and css engines
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/globals.css') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Execute language routing configuration maps 
  const initialIntlResponse = intlMiddleware(request)

  // Stream localized routing response arrays directly into the server authorization gate
  return await updateSession(request, initialIntlResponse)
}

/**
 * 📊 3. Scalable Non-Overlapping Engine Matcher Array
 * Streamlined regex prevents double parsing loops to preserve computing resources.
 */
export const config = {
  matcher: [
    /*
     * Match all user-facing route paths explicitly except for:
     * - api (high-throughput background database sync paths)
     * - _next/static & _next/image (compiled UI stylesheets and assets)
     * - favicon.ico, pictures, or asset extensions (png, svg, jpg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
