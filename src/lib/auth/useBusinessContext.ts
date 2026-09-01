'use client'

import { useCallback, useEffect, useState } from 'react'

import createClient from '@/lib/supabase/client'

export interface BusinessContext {
  businessId: string | null
  branchId: string | null
  userId: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Returns the authenticated user's business/branch context.
 *
 * Source of truth:
 *   auth.users.id -> profiles.id
 *
 * The profile contains:
 *   business_id
 *   branch_id
 *
 * This matches the existing Liyu POS Profile interface.
 */
export function useBusinessContext(): BusinessContext {
  const [businessId, setBusinessId] =
    useState<string | null>(null)

  const [branchId, setBranchId] =
    useState<string | null>(null)

  const [userId, setUserId] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const loadContext = useCallback(async () => {
    const supabase = createClient()

    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      if (!user) {
        setUserId(null)
        setBusinessId(null)
        setBranchId(null)
        return
      }

      setUserId(user.id)

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('business_id, branch_id')
          .eq('id', user.id)
          .maybeSingle()

      if (profileError) {
        throw profileError
      }

      setBusinessId(
        profile?.business_id ?? null,
      )

      setBranchId(
        profile?.branch_id ?? null,
      )
    } catch (err) {
      console.error(
        '[useBusinessContext] Failed to load context:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load business context.',
      )

      setUserId(null)
      setBusinessId(null)
      setBranchId(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  return {
    businessId,
    branchId,
    userId,
    loading,
    error,
    refresh: loadContext,
  }
}

