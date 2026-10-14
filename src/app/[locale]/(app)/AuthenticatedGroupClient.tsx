'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import AppShell from '../../../components/layout/AppShell'
import OfflineAwareAppShell from '../../../components/layout/OfflineAwareAppShell'
import { ToastProvider } from '../../../components/ui/ToastProvider'
import createClient from '../../../lib/supabase/client'
import {
  getAuthGuardRecoveryAction,
  isExplicitSessionRejection,
} from '../../../lib/offline/authGuardRecovery'
import {
  clearShellProfileCache,
  readShellProfileCache,
  writeShellProfileCache,
  type ShellProfileCache,
} from '../../../lib/offline/shellProfileCache'

interface AuthenticatedGroupClientProps {
  children: ReactNode
  locale: string
}

interface ShellProfile extends ShellProfileCache {
  fullName: string
}

interface ProfileBusiness {
  name: string
}

function getBusinessName(value: unknown): string {
  const business = Array.isArray(value) ? value[0] : value
  if (!business || typeof business !== 'object') return 'LIYU POS'
  const name = (business as ProfileBusiness).name
  return typeof name === 'string' && name ? name : 'LIYU POS'
}

export default function AuthenticatedGroupClient({
  children,
  locale,
}: AuthenticatedGroupClientProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<ShellProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [verificationUnavailable, setVerificationUnavailable] = useState(false)
  const supabase = createClient()

  const goToLogin = useCallback(() => {
    clearShellProfileCache()
    router.replace(`/${locale}/login` as Route)
  }, [locale, router])

  const goToOnboarding = useCallback(() => {
    router.replace(`/${locale}/onboarding` as Route)
  }, [locale, router])

  const restoreOfflineShell = useCallback(async (expectedUserId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const cached = readShellProfileCache()
      const recoveryAction = getAuthGuardRecoveryAction(
        undefined,
        session?.user.id,
        cached,
        expectedUserId,
      )

      if (recoveryAction === 'redirect') {
        goToLogin()
        return
      }

      if (recoveryAction === 'unavailable' || !cached) {
        setVerificationUnavailable(true)
        setReady(true)
        return
      }

      if (!cached.onboardingCompleted) {
        goToOnboarding()
        return
      }

      setProfile({ ...cached, fullName: '' })
      setVerificationUnavailable(false)
      setReady(true)
    } catch {
      goToLogin()
    }
  }, [goToLogin, goToOnboarding, supabase])

  const verifyOnline = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError && isExplicitSessionRejection(authError.status)) {
        goToLogin()
        return
      }

      if (authError) {
        // A verification failure that did not reject the session may be a
        // network outage. The cached profile only renders the shell; APIs
        // continue to enforce the session and permissions on the server.
        await restoreOfflineShell(user?.id)
        return
      }

      if (!user) {
        goToLogin()
        return
      }

      const { data: userProfile, error: profileError, status: profileStatus } = await supabase
        .from('profiles')
        .select(`
          full_name,
          role,
          onboarding_completed,
          businesses (name)
        `)
        .eq('id', user.id)
        .single()

      if (isExplicitSessionRejection(profileStatus)) {
        goToLogin()
        return
      }

      if (profileError || !userProfile) {
        await restoreOfflineShell(user.id)
        return
      }

      const { data: assignedRoles, error: rolesError, status: rolesStatus } = await supabase
        .from('profile_roles')
        .select('role_name')
        .eq('profile_id', user.id)

      if (isExplicitSessionRejection(rolesStatus)) {
        goToLogin()
        return
      }

      if (rolesError) {
        await restoreOfflineShell(user.id)
        return
      }

      const roles = Array.from(new Set([
        userProfile.role,
        ...(assignedRoles
          ? assignedRoles.map((assignedRole: { role_name: string }) => assignedRole.role_name)
          : []),
      ].filter((role): role is string => typeof role === 'string' && role.length > 0)))

      const shellProfile: ShellProfile = {
        userId: user.id,
        role: userProfile.role,
        roles,
        businessName: getBusinessName(userProfile.businesses),
        onboardingCompleted: userProfile.onboarding_completed,
        fullName: userProfile.full_name || '',
      }

      writeShellProfileCache({
        userId: shellProfile.userId,
        role: shellProfile.role,
        roles: shellProfile.roles,
        businessName: shellProfile.businessName,
        onboardingCompleted: shellProfile.onboardingCompleted,
      })

      if (!shellProfile.onboardingCompleted) {
        goToOnboarding()
        return
      }

      setProfile(shellProfile)
      setVerificationUnavailable(false)
      setReady(true)
    } catch (error) {
      if (isExplicitSessionRejection((error as { status?: unknown } | null)?.status)) {
        goToLogin()
        return
      }

      // Verification could not reach a conclusive rejection. Restore only
      // when the local Supabase session matches the cached shell profile.
      void restoreOfflineShell()
    }
  }, [goToLogin, goToOnboarding, restoreOfflineShell, supabase])

  const retryVerification = useCallback(() => {
    setVerificationUnavailable(false)
    setReady(false)
    void verifyOnline()
  }, [verifyOnline])

  useEffect(() => {
    const start = async () => {
      if (navigator.onLine) {
        await verifyOnline()
      } else {
        await restoreOfflineShell()
      }
    }

    const handleOnline = () => {
      void verifyOnline()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') goToLogin()
    })

    window.addEventListener('online', handleOnline)
    void start()

    return () => {
      window.removeEventListener('online', handleOnline)
      subscription.unsubscribe()
    }
  }, [goToLogin, restoreOfflineShell, supabase, verifyOnline])

  if (verificationUnavailable) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream-50 px-4 text-center text-coffee-700">
        <h1 className="text-lg font-semibold">Workspace unavailable offline</h1>
        <p className="max-w-sm text-sm text-coffee-600">
          Connect to the internet to verify this workspace, then try again.
        </p>
        <button
          type="button"
          onClick={retryVerification}
          className="min-h-11 rounded-lg bg-[#8B2635] px-5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </main>
    )
  }

  if (!ready || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 text-sm text-coffee-600">
        Checking your workspace…
      </main>
    )
  }

  return (
    <ToastProvider>
      <OfflineAwareAppShell
        locale={locale}
        role={profile.role}
        fullName={profile.fullName}
        businessName={profile.businessName}
      >
        <AppShell
          locale={locale}
          role={profile.role}
          roles={profile.roles}
          fullName={profile.fullName}
          businessName={profile.businessName}
        >
          {children}
        </AppShell>
      </OfflineAwareAppShell>
    </ToastProvider>
  )
}
