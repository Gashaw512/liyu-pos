import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Enterprise Supabase Session Pipeline Helper
 * Efficiently manages background token refreshes without breaking localization routing contexts.
 */
export async function updateSession(request: NextRequest, responseContext?: NextResponse) {
  // Use the incoming localization response context or fall back to a fresh layout branch
  let supabaseResponse = responseContext || NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Synchronize the incoming request cookies instantly
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // 2. ⚡ ROBUST CHANGE: Safely inject cookie modifications onto the active response context
          // This modifies cookies natively without recreating the object, preserving all next-intl configurations!
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  /**
   * Background Token Guard
   * Calling getUser() automatically refreshes the underlying session if expired.
   * Wrapped in a try/catch block so a network timeout won't crash your entire POS login router.
   */
  try {
    await supabase.auth.getUser()
  } catch (err) {
    console.error('Supabase automated proxy token refresh intercepted an error:', err)
  }

  return supabaseResponse
}
