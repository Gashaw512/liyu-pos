// src/lib/auth/useBusinessContext.ts
'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import createClient from '@/lib/supabase/client'
import { useOptionalErp } from '@/components/layout/AppShell'

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
  const erpContext = useOptionalErp()
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
      // The authenticated route guard has already verified this context.
      // Reuse it instead of repeating auth/profile requests on page mount.
      // Older offline shell cache entries may not include the IDs yet; those
      // continue through the existing cached/offline fallback below.
      if (
        erpContext?.userId &&
        erpContext.businessId !== undefined &&
        erpContext.branchId !== undefined
      ) {
        const trustedContext: CachedBusinessContext = {
          userId: erpContext.userId,
          businessId: erpContext.businessId,
          branchId: erpContext.branchId,
        }
        setUserId(trustedContext.userId)
        setBusinessId(trustedContext.businessId)
        setBranchId(trustedContext.branchId)
        setError(null)
        writeCachedContext(trustedContext)
        setLoading(false)
        return
      }

      // Keep using the last known context while offline. The browser client
      // will load a fresh context again once connectivity returns.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoading(false)
        return
      }

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
    }, [erpContext?.userId, erpContext?.businessId, erpContext?.branchId])

  useEffect(() => {
    void loadContext()

    const handleOnline = () => {
      void loadContext()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
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
