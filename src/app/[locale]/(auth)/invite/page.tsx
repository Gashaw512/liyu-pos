'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'
import createClient from '@/lib/supabase/client'

const schema = z.object({
  fullName: z.string().min(2),
  inviteCode: z.string().min(5),
  phone: z.string().min(9),
  password: z.string().min(8),
  confirm: z.string()
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm']
})

type Form = z.infer<typeof schema>

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams()
  const search = useSearchParams()
  const supabase = createClient()

  const locale = (params?.locale as string) || 'en'
  const prefilledCode = search.get('code') || ''

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    watch
  } = useForm<Form>({
    defaultValues: {
      inviteCode: prefilledCode.toUpperCase()
    },
    resolver: zodResolver(schema)
  })

  const inputClass =
    "w-full h-[52px] px-4 rounded-xl border border-cream-200 bg-cream-100 text-coffee-700 focus:border-berbere-500 outline-none"

  /* ───────────────────────── STEP 1 ───────────────────────── */
  const verifyInvite = async () => {
    const ok = await trigger(['inviteCode', 'fullName', 'phone'])
    if (!ok) return

    setLoading(true)
    setError(null)

    try {
      const code = watch('inviteCode').trim().toUpperCase()

      const { data: invite, error: dbError } = await supabase
        .from('staff_invitations')
        .select('id, status, expires_at, code, business_id, role_assigned')
        .eq('code', code)
        .maybeSingle()

      if (dbError) {
        setError('Server error. Try again.')
        return
      }

      if (!invite) {
        setError('Invalid invitation code')
        return
      }

      if (invite.status !== 'pending') {
        setError('This invitation is already used or expired')
        return
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setError('This invitation has expired')
        return
      }

      setStep(2)
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ───────────────────────── FINAL SUBMIT ───────────────────────── */
  const onSubmit = async (form: Form) => {
    setLoading(true)
    setError(null)

    try {
      const phone = form.phone.startsWith('0')
        ? '+251' + form.phone.slice(1)
        : form.phone

      const inviteCode = form.inviteCode.trim().toUpperCase()

      // 1. Get invite again (safe + authoritative)
      const { data: invite } = await supabase
        .from('staff_invitations')
        .select('id, business_id, role_assigned, status, expires_at')
        .eq('code', inviteCode)
        .single()

      if (!invite) {
        setError('Invalid invitation')
        return
      }

      // 2. Signup user
      const { data, error: authError } = await supabase.auth.signUp({
        phone,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            invite_code: inviteCode,
            is_staff: true,
            business_id: invite.business_id,
            role: invite.role_assigned
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!data.user) {
        setError('Signup failed. Try again.')
        return
      }

      // 3. Assign DEFAULT branch (safe fallback)
      const { data: defaultBranch } = await supabase
        .from('branches')
        .select('id')
        .eq('business_id', invite.business_id)
        .eq('is_main', true)
        .single()

      const branchId = defaultBranch?.id ?? null

      // 4. Create profile (IMPORTANT STEP)
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: form.fullName,
        phone,
        business_id: invite.business_id,
        branch_id: branchId,
        role: invite.role_assigned,
        is_active: true,
        onboarding_completed: false
      })

      // 5. Mark invite as used
      await supabase
        .from('staff_invitations')
        .update({
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', invite.id)

      // 6. Redirect (NO onboarding for staff)
      router.push(`/${locale}/dashboard`)

    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-cream-200 p-5">

        <h1 className="text-xl font-bold text-coffee-700 mb-4">
          Staff Activation
        </h1>

        {error && (
          <div className="flex gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl mb-3">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {step === 1 && (
            <>
              <input
                {...register('inviteCode')}
                placeholder="Invite Code"
                className={inputClass + " uppercase font-mono"}
              />

              <input
                {...register('fullName')}
                placeholder="Full Name"
                className={inputClass}
              />

              <input
                {...register('phone')}
                placeholder="Phone (+251...)"
                className={inputClass}
              />

              <button
                type="button"
                onClick={verifyInvite}
                disabled={loading}
                className="w-full h-[52px] bg-berbere-500 text-white rounded-xl font-bold"
              >
                {loading ? 'Checking...' : 'Verify Invitation'}
                <ArrowRight className="inline ml-2 w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-sm text-coffee-600">
                Code: <b>{watch('inviteCode')}</b>
              </div>

              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3"
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              </div>

              <input
                {...register('confirm')}
                type="password"
                placeholder="Confirm Password"
                className={inputClass}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] bg-gold-400 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? 'Activating...' : 'Activate Account'}
              </button>
            </>
          )}

        </form>
      </div>
    </div>
  )
}