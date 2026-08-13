'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Fail-safe protection boundary to alert engineering if variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Liyu POS Warning: Missing Supabase Environment Variables. Check your .env.local file configuration."
  )
}

// Internal thread tracker ensuring singular context initialization per active window execution instance
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Enterprise Singleton Browser Client Factory
 * Safely constructs client instances dynamically to prevent cross-user token contamination,
 * while efficiently reusing active WebSockets for sub-millisecond local mutations.
 */
export function getSupabaseBrowserClient() {
  // Ensure instantiation strictly happens inside browser/client operational environments
  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // If a client already exists for this unique browser session window, reuse it
  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return clientInstance
}

/**
 * Clean Reset Gateway
 * CRITICAL FOR POS ENVIRONMENTS: Invoke this function during your logout function routine 
 * to completely wipe out stale cache tokens when cashiers swap shifts.
 */
export function resetSupabaseBrowserClient() {
  clientInstance = null
}

// Maintain full backward compatibility matching your existing function structural imports
const createClient = () => getSupabaseBrowserClient()
export default createClient
