// // # next-intl + auth middleware

// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'

// export function middleware(request: NextRequest) {
//   // Pass through all incoming traffic safely for now
//   return NextResponse.next()
// }

// // Specify which paths this middleware runs on
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * Feel free to customize this later!
//      */
//     '/((?!_next/static|_next/image|favicon.ico).*)',
//   ],
// }






// // src/middleware.ts
// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
// import createIntlMiddleware from 'next-intl/middleware'
// import { updateSession } from './lib/supabase/middleware'
// // 1. Initialize the next-intl routing rules configuration
// const intlMiddleware = createIntlMiddleware({
//   // Define your supported languages for the Liyu PWA
//   locales: ['en', 'am'],
//   // Default language fallback if no preference is found
//   defaultLocale: 'en',
//   // Enforces readable language prefixes in URLs (e.g., /en/dashboard, /am/dashboard)
//   localePrefix: 'always',
//   // Automatically read user language from browser headers
//   localeDetection: true
// })

// export function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl

//   // 2. Skip translation processing for static assets & internal system routes
//   if (
//     pathname.startsWith('/_next') ||
//     pathname.startsWith('/api') ||
//     pathname.includes('.') // matches favicon.ico, manifest.json, sw.js, manifest assets, etc.
//   ) {
//     return NextResponse.next()
//   }

//   // 3. Process next-intl language detection and path-rewriting
//   const response = intlMiddleware(request)

//   /* 
//    * 4. Future Auth Placeholders
//    * You can read your Supabase session or cookies from 'request' right here.
//    * If a user tries to access an authenticated route group like `/(app)/dashboard` 
//    * without a session cookie, you can return a NextResponse.redirect() here!
//    */

//   return response
// }

// // 5. Explicitly scope which requests hit this file to save server CPU cycles
// export const config = {
//   matcher: [
//     // Match root path
//     '/',
//     // Match explicit language pathways
//     '/(am|en)/:path*',
//     // Match generic text pathways while ignoring system resource folders
//     '/((?!api|_next|static|.*\\..*).*)'
//   ]
// }


import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
// 🛠️ IMPORT YOUR NEW SUPABASE MIDDLEWARE SESSION HELPER HERE:
import { updateSession } from './lib/supabase/middleware'

// 1. Initialize the next-intl routing rules configuration
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'am'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 2. Skip translation and auth processing for static assets & internal system routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 3. 🛠️ Let Supabase refresh the session tokens in the background
  // This keeps cookies fresh and up-to-date across your Server Components
  const supabaseResponse = await updateSession(request)

  // 4. Process next-intl language detection and path-rewriting onto the request
  const response = intlMiddleware(request)

  // 5. 🛠️ CRITICAL MERGE STEP: Copy refreshed Supabase cookies onto the localization response.
  // This ensures your server-side layouts can read the login state immediately on the next page load.
supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set({
      ...cookie, // Spread everything first, ensuring no double declarations!
    })
  })

  return response
}

// 6. Explicitly scope which requests hit this file to save server CPU cycles
export const config = {
  matcher: [
    '/',
    '/(am|en)/:path*',
    '/((?!api|_next|static|.*\\..*).*)'
  ]
}