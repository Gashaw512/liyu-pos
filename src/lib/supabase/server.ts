import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Modern Enterprise Server Client Factory
 * Aligned with the latest batch cookie handling protocols to eliminate token desyncs.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         *  High-Speed Batch Cookie Fetch
         * Grabs all cookies in a single pass to minimize internal rendering overhead.
         */
        getAll() {
          return cookieStore.getAll()
        },
        /**
         * Safe Batch Cookie Setter
         * Mutates response headers securely. Wrapped inside a protective try/catch block
         * since Next.js restricts Cookie mutations during pure Server Component read operations.
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch (error) {
            // Safe to ignore on static/read-only Server Components as long as 
            // your proxy/middleware handles background token refreshes cleanly.
          }
        },
      },
    }
  )
}
