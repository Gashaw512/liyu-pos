
// src/lib/supabase/client.ts

'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ------------------------------------------------------------
// Environment validation
// ------------------------------------------------------------

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Liyu POS Warning: Missing Supabase environment variables. ' +
    'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

// ------------------------------------------------------------
// Singleton browser client
// ------------------------------------------------------------

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

const offlineAwareFetch: typeof fetch = (input, init) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return Promise.reject(new TypeError('Supabase request skipped while offline.'))
  }

  return fetch(input, init)
}

/**
 * Returns the shared Supabase browser client.
 *
 * The client is created once per browser execution context and
 * reused for all client-side queries.
 */
export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are missing. ' +
      'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { fetch: offlineAwareFetch } },
    )
  }

  return clientInstance
}

/**
 * Clears the local client reference.
 *
 * Use this after logout if your authentication flow explicitly
 * requires rebuilding the client.
 */
export function resetSupabaseBrowserClient() {
  clientInstance = null
}

// ------------------------------------------------------------
// Backward-compatible default export
// ------------------------------------------------------------

const createClient = () => getSupabaseBrowserClient()

export default createClient

