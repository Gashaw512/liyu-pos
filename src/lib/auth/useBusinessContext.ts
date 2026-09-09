// src/lib/auth/useBusinessContext.ts
'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import createClient from '@/lib/supabase/client'

export interface BusinessContext {
  businessId: string | null
  branchId: string | null
  userId: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

interface CachedBusinessContext {
  businessId: string | null
  branchId: string | null
  userId: string | null
}

const CACHE_KEY =
  'liyu-pos-business-context'

function readCachedContext(): CachedBusinessContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw =
      window.localStorage.getItem(
        CACHE_KEY,
      )

    if (!raw) {
      return null
    }

    const parsed =
      JSON.parse(raw)

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return null
    }

    return {
      businessId:
        typeof parsed.businessId === 'string'
          ? parsed.businessId
          : null,

      branchId:
        typeof parsed.branchId === 'string'
          ? parsed.branchId
          : null,

      userId:
        typeof parsed.userId === 'string'
          ? parsed.userId
          : null,
    }
  } catch (error) {
    console.warn(
      '[BusinessContext] Failed to read cached context:',
      error,
    )

    return null
  }
}

function writeCachedContext(
  context: CachedBusinessContext,
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(context),
    )
  } catch (error) {
    console.warn(
      '[BusinessContext] Failed to cache context:',
      error,
    )
  }
}

/**
 * Returns the authenticated user's
 * business/branch context.
 *
 * Online source of truth:
 *
 *   auth.users.id
 *          ↓
 *   profiles.id
 *          ↓
 *   profiles.business_id
 *   profiles.branch_id
 *
 * The most recently valid context is cached locally
 * so the POS can continue working offline.
 */
export function useBusinessContext(): BusinessContext {
  const cachedContext =
    useState<CachedBusinessContext | null>(
      () => readCachedContext(),
    )[0]

  const [businessId, setBusinessId] =
    useState<string | null>(
      cachedContext?.businessId ?? null,
    )

  const [branchId, setBranchId] =
    useState<string | null>(
      cachedContext?.branchId ?? null,
    )

  const [userId, setUserId] =
    useState<string | null>(
      cachedContext?.userId ?? null,
    )

  const [loading, setLoading] =
    useState(
      !cachedContext,
    )

  const [error, setError] =
    useState<string | null>(null)

  const loadContext =
    useCallback(async () => {
      const supabase =
        createClient()

      setLoading(true)
      setError(null)

      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          setUserId(null)
          setBusinessId(null)
          setBranchId(null)

          if (
            typeof window !==
            'undefined'
          ) {
            window.localStorage.removeItem(
              CACHE_KEY,
            )
          }

          return
        }

        const { data: profile, error: profileError } =
          await supabase
            .from('profiles')
            .select(
              'business_id, branch_id',
            )
            .eq('id', user.id)
            .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!profile) {
          throw new Error(
            'Authenticated user profile was not found.',
          )
        }

        const nextContext: CachedBusinessContext =
          {
            userId: user.id,

            businessId:
              profile.business_id ??
              null,

            branchId:
              profile.branch_id ??
              null,
          }

        setUserId(
          nextContext.userId,
        )

        setBusinessId(
          nextContext.businessId,
        )

        setBranchId(
          nextContext.branchId,
        )

        writeCachedContext(
          nextContext,
        )
      } catch (err) {
        console.error(
          '[useBusinessContext] Failed to load online context:',
          err,
        )

        /*
         * IMPORTANT:
         *
         * Do not destroy an already valid cached
         * context just because the network is unavailable.
         *
         * This keeps the POS usable offline.
         */
        const fallback =
          readCachedContext()

        if (fallback) {
          setUserId(
            fallback.userId,
          )

          setBusinessId(
            fallback.businessId,
          )

          setBranchId(
            fallback.branchId,
          )
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load business context.',
          )

          setUserId(null)
          setBusinessId(null)
          setBranchId(null)
        }
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