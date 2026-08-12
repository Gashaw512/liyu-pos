import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 🔒 Enterprise Supabase Session Pipeline Helper
 * Updated to accept an optional secondary response object to merge with localization routing context.
 */
export async function updateSession(request: NextRequest, responseContext?: NextResponse) {
  // If an existing response was passed (like from next-intl), mutate that directly; otherwise make a fresh one
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
          // 1. Sync the incoming requests
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // 2. Retain the original incoming response context if it exists, or generate a fresh fall-through step
          supabaseResponse = responseContext || NextResponse.next({
            request,
          })
          
          // 3. Inject cookie modifications natively onto the headers
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session token automatically if it has expired
  await supabase.auth.getUser()

  return supabaseResponse
}
