'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react'

type Locale = 'en' | 'am'

export default function ForgotPasswordPage() {
  const params = useParams()
  const locale = (params?.locale as Locale) || 'am'
  const isAm = locale === 'am'
  const [phone, setPhone] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const t = (en: string, am: string) => isAm ? am : en

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) return

    setErrorMessage(null)

    if (password.length < 8) {
      setErrorMessage(t('Use a password with at least 8 characters.', 'የይለፍ ቃሉ ቢያንስ 8 ቁምፊዎች ይኑሩት።'))
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('The passwords do not match.', 'የይለፍ ቃሎቹ አይዛመዱም።'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/password-recovery', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, recoveryCode, password }),
      })
      const result = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || t('Password reset failed. Check your details and try again.', 'የይለፍ ቃል መቀየር አልተሳካም። መረጃዎን አረጋግጠው ይሞክሩ።'))
      }

      setIsComplete(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('Password reset failed. Please try again.', 'የይለፍ ቃል መቀየር አልተሳካም። እንደገና ይሞክሩ።'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 py-8">
      <section className="w-full max-w-md space-y-5 rounded-2xl border border-coffee-200 bg-white p-5 shadow-elevated sm:p-7">
        <Link href={`/${locale}/login`} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-coffee-600 hover:text-coffee-900">
          <ArrowLeft className="h-4 w-4" />
          {t('Back to sign in', 'ወደ መግቢያ ተመለስ')}
        </Link>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coffee-100 text-coffee-800">
            {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-coffee-900">
              {isComplete ? t('Password updated', 'የይለፍ ቃሉ ተቀይሯል') : t('Reset your password', 'የይለፍ ቃልዎን ይቀይሩ')}
            </h1>
            <p className="mt-1 text-sm leading-5 text-coffee-500">
              {isComplete
                ? t('You can now sign in with your new password.', 'አሁን በአዲሱ የይለፍ ቃል መግባት ይችላሉ።')
                : t('Enter your registered phone number, saved recovery code, and a new password.', 'የተመዘገበውን ስልክ ቁጥር፣ ያስቀመጡትን የመመለሻ ኮድና አዲስ የይለፍ ቃል ያስገቡ።')}
            </p>
          </div>
        </div>

        {errorMessage && <p role="alert" className="rounded-lg border border-berbere-200 bg-berbere-50 p-3 text-sm font-medium text-berbere-700">{errorMessage}</p>}

        {isComplete ? (
          <Link href={`/${locale}/login`} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-coffee-900 px-4 text-sm font-bold text-white hover:bg-coffee-800">
            {t('Continue to sign in', 'ወደ መግቢያ ይቀጥሉ')}
          </Link>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-bold text-coffee-700">
              {t('Phone number', 'ስልክ ቁጥር')}
              <input
                required
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                placeholder="0912345678"
                className="mt-1.5 min-h-12 w-full rounded-lg border border-coffee-200 px-3 text-sm outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200"
              />
            </label>

            <label className="block text-xs font-bold text-coffee-700">
              {t('Recovery code', 'የመመለሻ ኮድ')}
              <input
                required
                type="text"
                autoComplete="one-time-code"
                value={recoveryCode}
                onChange={event => setRecoveryCode(event.target.value.toUpperCase())}
                placeholder="ABC123-DEF456-…"
                className="mt-1.5 min-h-12 w-full rounded-lg border border-coffee-200 px-3 font-mono text-sm uppercase outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200"
              />
            </label>

            <label className="block text-xs font-bold text-coffee-700">
              {t('New password', 'አዲስ የይለፍ ቃል')}
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-lg border border-coffee-200 px-3 text-sm outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200"
              />
            </label>

            <label className="block text-xs font-bold text-coffee-700">
              {t('Confirm new password', 'አዲሱን የይለፍ ቃል ያረጋግጡ')}
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-lg border border-coffee-200 px-3 text-sm outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200"
              />
            </label>

            <p className="text-xs leading-5 text-coffee-500">
              {t('This only works with a recovery code you generated while signed in. If you never saved one, contact your business administrator or Liyu POS support.', 'ይህ የሚሰራው ገብተው ቀድሞ የፈጠሩት የመመለሻ ኮድ ካለዎት ብቻ ነው። ኮድ ካልፈጠሩ የንግድዎን አስተዳዳሪ ወይም የሊዩ POS ድጋፍን ያግኙ።')}
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-coffee-900 px-4 text-sm font-bold text-white hover:bg-coffee-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('Set new password', 'አዲስ የይለፍ ቃል ያስቀምጡ')}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}