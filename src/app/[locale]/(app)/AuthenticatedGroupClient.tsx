'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import AppShell from '../../../components/layout/AppShell'
import OfflineAwareAppShell from '../../../components/layout/OfflineAwareAppShell'
import { ToastProvider } from '../../../components/ui/ToastProvider'
import createClient from '../../../lib/supabase/client'
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
  const supabase = createClient()

  const goToLogin = useCallback(() => {
    clearShellProfileCache()
    router.replace(`/${locale}/login` as Route)
  }, [locale, router])

  const goToOnboarding = useCallback(() => {
    router.replace(`/${locale}/onboarding` as Route)
  }, [locale, router])

  const verifyOnline = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        goToLogin()
        return
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          full_name,
          role,
          onboarding_completed,
          businesses (name)
        `)
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        goToLogin()
        return
      }

      const { data: assignedRoles, error: rolesError } = await supabase
        .from('profile_roles')
        .select('role_name')
        .eq('profile_id', user.id)

      const roles = Array.from(new Set([
        userProfile.role,
        ...(!rolesError && assignedRoles
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
      setReady(true)
    } catch {
      // Match the existing server guard: an online auth/profile check that
      // cannot be completed returns the user to login.
      goToLogin()
    }
  }, [goToLogin, goToOnboarding, supabase])

  const restoreOfflineShell = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const cached = readShellProfileCache()

      if (!session?.user || !cached || cached.userId !== session.user.id) {
        goToLogin()
        return
      }

      if (!cached.onboardingCompleted) {
        goToOnboarding()
        return
      }

      setProfile({ ...cached, fullName: '' })
      setReady(true)
    } catch {
      goToLogin()
    }
  }, [goToLogin, goToOnboarding, supabase])

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
