// src/lib/supabase/client.ts
'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Fallback protection to alert you if Next.js hasn't loaded envs yet
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Liyu POS Warning: Missing Supabase Environment Variables. Check your .env.local file configuration."
  )
}

/**
 * Singleton Browser Client
 * Instantiated once and shared across all Client Components to maintain persistent connection.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Keep this default export matching your existing structure
const createClient = () => supabase
export default createClient