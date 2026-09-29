'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, KeyRound, Loader2, RefreshCw } from 'lucide-react'

type Locale = 'en' | 'am'

interface RecoveryCodeResponse {
  recoveryCode?: string
  expiresAt?: string
  error?: string
}

export default function PasswordRecoveryCodePanel() {
  const params = useParams()
  const locale = (params?.locale as Locale) || 'am'
  const isAm = locale === 'am'
  const [isLoading, setIsLoading] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const t = (en: string, am: string) => isAm ? am : en

  const issueRecoveryCode = async () => {
    if (isLoading) return

    setIsLoading(true)
    setMessage(null)
    setErrorMessage(null)
    setRecoveryCode(null)
    setCopied(false)

    try {
      const response = await fetch('/api/auth/recovery-code', { method: 'POST' })
      const result = await response.json() as RecoveryCodeResponse

      if (!response.ok || !result.recoveryCode || !result.expiresAt) {
        throw new Error(result.error || t('Could not create the recovery code.', 'የመመለሻ ኮዱን መፍጠር አልተቻለም።'))
      }

      setRecoveryCode(result.recoveryCode)
      setExpiresAt(result.expiresAt)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('Could not create the recovery code.', 'የመመለሻ ኮዱን መፍጠር አልተቻለም።'))
    } finally {
      setIsLoading(false)
    }
  }

  const copyRecoveryCode = async () => {
    if (!recoveryCode) return

    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      setMessage(t('Recovery code copied.', 'የመመለሻ ኮዱ ተቀድቷል።'))
    } catch {
      setMessage(t('Select and copy the code manually.', 'ኮዱን በእጅ መርጠው ይቅዱ።'))
    }
  }

  const formattedExpiry = expiresAt
    ? new Intl.DateTimeFormat(isAm ? 'am-ET' : 'en-ET', { dateStyle: 'medium' }).format(new Date(expiresAt))
    : null

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-3 py-4 sm:px-5">
      <Link
        href={`/${locale}/management`}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-coffee-600 hover:text-coffee-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('Management', 'አስተዳደር')}
      </Link>

      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coffee-100 text-coffee-800">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-coffee-900">
            {t('Password recovery', 'የይለፍ ቃል መመለሻ')}
          </h1>
          <p className="mt-1 text-sm leading-5 text-coffee-500">
            {t('Create a one-time recovery code for use if you forget your password.', 'የይለፍ ቃልዎን ከረሱ የሚጠቀሙበትን አንድ ጊዜ የሚሰራ ኮድ ይፍጠሩ።')}
          </p>
        </div>
      </header>

      {errorMessage && <p role="alert" className="rounded-lg border border-berbere-200 bg-berbere-50 p-3 text-sm font-medium text-berbere-700">{errorMessage}</p>}
      {message && <p role="status" className="rounded-lg border border-coffee-200 bg-coffee-50 p-3 text-sm font-medium text-coffee-700">{message}</p>}

      {recoveryCode ? (
        <section className="space-y-4 border-y border-coffee-200 py-5">
          <div>
            <h2 className="text-sm font-black text-coffee-900">
              {t('Save this code now', 'ይህንን ኮድ አሁን ያስቀምጡ')}
            </h2>
            <p className="mt-1 text-xs leading-5 text-coffee-500">
              {t('It is shown only once. Generating another code will invalidate this one.', 'ኮዱ አንድ ጊዜ ብቻ ይታያል። ሌላ ኮድ ከፈጠሩ ይህ ኮድ ይሰረዛል።')}
            </p>
          </div>

          <output className="block select-all break-all rounded-lg border border-coffee-300 bg-coffee-50 px-4 py-4 text-center font-mono text-base font-black tracking-wider text-coffee-900 sm:text-lg">
            {recoveryCode}
          </output>

          {formattedExpiry && (
            <p className="text-xs text-coffee-500">
              {t('Expires', 'የሚያበቃው')}: {formattedExpiry}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void copyRecoveryCode()}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-coffee-900 px-4 text-sm font-bold text-white hover:bg-coffee-800"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t('Copied', 'ተቀድቷል') : t('Copy code', 'ኮዱን ቅዳ')}
            </button>
            <button
              type="button"
              onClick={() => void issueRecoveryCode()}
              disabled={isLoading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-coffee-300 px-4 text-sm font-bold text-coffee-800 hover:bg-coffee-50 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t('Replace code', 'ኮዱን ቀይር')}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => void issueRecoveryCode()}
          disabled={isLoading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-coffee-900 px-4 text-sm font-bold text-white hover:bg-coffee-800 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {t('Generate recovery code', 'የመመለሻ ኮድ ፍጠር')}
        </button>
      )}

      <p className="text-xs leading-5 text-coffee-500">
        {t('If you lose both your password and this code, contact your business administrator or Liyu POS support.', 'የይለፍ ቃልዎንና ይህንን ኮድ ካጡ የንግድዎን አስተዳዳሪ ወይም የሊዩ POS ድጋፍን ያግኙ።')}
      </p>
    </main>
  )
}