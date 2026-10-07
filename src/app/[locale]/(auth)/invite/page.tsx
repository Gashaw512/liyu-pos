'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'
import createClient from '@/lib/supabase/client'
import { normalizeEthiopianPhone } from '@/lib/auth/phone'

const schema = z.object({
  fullName: z.string().trim().min(2).max(150),
  inviteCode: z.string().trim().min(5).max(64),
  phone: z.string().refine(value => Boolean(normalizeEthiopianPhone(value)), {
    message: 'Enter a valid Ethiopian phone number',
  }),
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
  const isAm = locale === 'am'
  const t = (en: string, am: string) => isAm ? am : en
  const prefilledCode = search.get('code') || ''

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationPhone, setVerificationPhone] = useState<string | null>(null)
  const [otp, setOtp] = useState('')

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
      const response = await fetch('/api/auth/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: watch('inviteCode'),
          fullName: watch('fullName'),
          phone: normalizeEthiopianPhone(watch('phone')),
        }),
      })
      const result = await response.json() as { valid?: boolean }

      if (!response.ok) {
        setError(t(
          'Invitation checking is temporarily unavailable. Please try again.',
          'የግብዣ ማረጋገጫው ለጊዜው አይሰራም። እባክዎ እንደገና ይሞክሩ።',
        ))
        return
      }

      if (!result.valid) {
        setError(t(
          'The code, name, or phone number does not match the pending invitation.',
          'ኮዱ፣ ስሙ ወይም ስልክ ቁጥሩ ከተጠባባቂው ግብዣ ጋር አይዛመድም።',
        ))
        return
      }

      setStep(2)
    } catch {
      setError(t('Connection error. Please try again.', 'የግንኙነት ችግር አለ። እንደገና ይሞክሩ።'))
    } finally {
      setLoading(false)
    }
  }

  /* ───────────────────────── FINAL SUBMIT ───────────────────────── */
  const onSubmit = async (form: Form) => {
    setLoading(true)
    setError(null)

    try {
      const phone = normalizeEthiopianPhone(form.phone)
      const inviteCode = form.inviteCode.trim().toUpperCase()

      if (!phone) {
        setError(t('Enter a valid Ethiopian phone number.', 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ።'))
        return
      }

      // Revalidate for clear feedback. The database trigger repeats the
      // checks and consumes the invitation atomically during auth signup.
      const validationResponse = await fetch('/api/auth/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode, fullName: form.fullName, phone }),
      })
      const validation = await validationResponse.json() as { valid?: boolean }
      if (!validationResponse.ok || !validation.valid) {
        setError(t(
          'The invitation could not be verified. Check the code, invited name, and phone number.',
          'ግብዣውን ማረጋገጥ አልተቻለም። ኮዱን፣ የተጋባዡን ስም እና ስልክ ቁጥር ያረጋግጡ።',
        ))
        return
      }

      const { data, error: authError } = await supabase.auth.signUp({
        phone,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim().replace(/\s+/g, ' '),
            invite_code: inviteCode,
            is_staff: true,
          }
        }
      })

      if (authError) {
        setError(authError.message.toLowerCase().includes('already')
          ? t('This phone number already has an account. Please sign in.', 'ይህ ስልክ ቁጥር አስቀድሞ መለያ አለው። እባክዎ ይግቡ።')
          : t(
            'Account creation failed. The invitation may have been used; check the code, name, and phone number.',
            'መለያ መፍጠር አልተሳካም። ግብዣው ተጠቅሞ ሊሆን ይችላል፤ ኮዱን፣ ስሙን እና ስልኩን ያረጋግጡ።',
          ))
        return
      }

      if (!data.user) {
        setError('Signup failed. Try again.')
        return
      }

      if (data.session) {
        router.replace(`/${locale}/dashboard`)
        router.refresh()
        return
      }

      setVerificationPhone(phone)
      setStep(3)

    } catch (submitError) {
      console.error('[INVITATION] Signup failed:', submitError)
      setError(t('Something went wrong. Please try again.', 'ችግር ተፈጥሯል። እንደገና ይሞክሩ።'))
    } finally {
      setLoading(false)
    }
  }

  const verifyPhone = async () => {
    if (!verificationPhone || !/^\d{6}$/.test(otp.trim())) {
      setError(t('Enter the 6-digit SMS code.', 'በSMS የተላከውን 6 አሃዝ ኮድ ያስገቡ።'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        phone: verificationPhone,
        token: otp.trim(),
        type: 'sms',
      })
      if (otpError) {
        setError(t('That code is incorrect or expired. Please try again.', 'ኮዱ የተሳሳተ ወይም ጊዜው ያለፈ ነው። እንደገና ይሞክሩ።'))
        return
      }

      router.replace(`/${locale}/dashboard`)
      router.refresh()
    } catch {
      setError(t('Phone verification failed. Please try again.', 'ስልክ ማረጋገጥ አልተሳካም። እንደገና ይሞክሩ።'))
    } finally {
      setLoading(false)
    }
  }

  const resendPhoneCode = async () => {
    if (!verificationPhone) return
    setLoading(true)
    setError(null)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'sms',
        phone: verificationPhone,
      })
      if (resendError) throw resendError
    } catch {
      setError(t('Could not resend the code. Please wait and try again.', 'ኮዱን እንደገና መላክ አልተቻለም። ቆይተው ይሞክሩ።'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-cream-200 p-5">

        <h1 className="text-xl font-bold text-coffee-700 mb-4">
          {t('Staff Activation', 'የሰራተኛ መለያ ማንቃት')}
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
                placeholder={t('Invitation code', 'የግብዣ ኮድ')}
                className={inputClass + " uppercase font-mono"}
              />

              <input
                {...register('fullName')}
                placeholder={t('Invited full name', 'በግብዣው ያለው ሙሉ ስም')}
                className={inputClass}
              />

              <input
                {...register('phone')}
                placeholder={t('Invited phone number', 'በግብዣው ያለው ስልክ ቁጥር')}
                className={inputClass}
              />

              <button
                type="button"
                onClick={verifyInvite}
                disabled={loading}
                className="w-full h-[52px] bg-berbere-500 text-white rounded-xl font-bold"
              >
                {loading ? t('Checking...', 'በማረጋገጥ ላይ...') : t('Verify Invitation', 'ግብዣውን አረጋግጥ')}
                <ArrowRight className="inline ml-2 w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-sm text-coffee-600">
                {t('Invitation code:', 'የግብዣ ኮድ:')} <b>{watch('inviteCode')}</b>
              </div>

              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder={t('Create password', 'የይለፍ ቃል ይፍጠሩ')}
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
                placeholder={t('Confirm password', 'የይለፍ ቃሉን ያረጋግጡ')}
                className={inputClass}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] bg-gold-400 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? t('Creating account...', 'መለያ በመፍጠር ላይ...') : t('Create Account', 'መለያ ፍጠር')}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-coffee-600">
                {t(
                  `Enter the SMS code sent to ${verificationPhone}.`,
                  `${verificationPhone} ላይ የተላከውን የSMS ኮድ ያስገቡ።`,
                )}
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('6-digit SMS code', '6 አሃዝ የSMS ኮድ')}
                className={inputClass + ' text-center font-mono text-lg tracking-[0.3em]'}
              />
              <button
                type="button"
                onClick={() => void verifyPhone()}
                disabled={loading}
                className="w-full h-[52px] bg-berbere-500 text-white rounded-xl font-bold"
              >
                {loading ? t('Checking...', 'በማረጋገጥ ላይ...') : t('Verify and continue', 'አረጋግጥ እና ቀጥል')}
              </button>
              <button
                type="button"
                onClick={() => void resendPhoneCode()}
                disabled={loading}
                className="w-full text-sm font-bold text-coffee-500 underline"
              >
                {t('Send a new code', 'አዲስ ኮድ ላክ')}
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}
