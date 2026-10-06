'use client'

import { useEffect, useMemo, useState, type InputHTMLAttributes, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { KeyRound, Loader2, LogOut, Store, UserRound } from 'lucide-react'

import createClient from '@/lib/supabase/client'
import { clearLastVisitedRoute } from '@/lib/offline/sessionFallback'

interface SettingsData {
  profile: { fullName: string }
  business: {
    name: string
    phone: string | null
    email: string | null
    city: string | null
    address: string | null
    is_hotel_integrated: boolean
  } | null
  canEditBusiness: boolean
}

type BusinessForm = NonNullable<SettingsData['business']>
type Feedback = { kind: 'success' | 'error'; message: string } | null

const inputClass = 'mt-1 h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-sm text-coffee-800 outline-none transition placeholder:text-coffee-300 focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100 disabled:bg-cream-100 disabled:text-coffee-500'
const BUSINESS_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block min-w-0 text-xs font-bold text-coffee-600">
      {label}
      <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
    </label>
  )
}

export default function AccountSettings({ locale }: { locale: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAm = locale === 'am'
  const supabase = useMemo(() => createClient(), [])

  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [fullName, setFullName] = useState('')
  const [business, setBusiness] = useState<BusinessForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'account' | 'business' | 'password' | 'signout' | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const t = (en: string, am: string) => isAm ? am : en
  const loadSettingsError = t(
    'Could not load settings. Check your connection and try again.',
    'ቅንብሮቹን መጫን አልተቻለም። ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።',
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/management/settings', { cache: 'no-store' })
        const result = await response.json().catch(() => null) as SettingsData | { error?: string } | null
        if (!active) return
        if (!response.ok || !result || !('profile' in result)) {
          setFeedback({ kind: 'error', message: loadSettingsError })
          return
        }
        setSettings(result)
        setFullName(result.profile.fullName)
        setBusiness(result.business)
      } catch {
        if (active) setFeedback({ kind: 'error', message: loadSettingsError })
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [loadSettingsError])

  const submit = async (
    event: FormEvent<HTMLFormElement>,
    section: 'account' | 'business',
  ) => {
    event.preventDefault()
    if (saving || (section === 'business' && !business)) return
    const businessEmail = business?.email?.trim() ?? ''
    if (section === 'business' && businessEmail && !BUSINESS_EMAIL_PATTERN.test(businessEmail)) {
      setFeedback({ kind: 'error', message: t('Enter a valid email address.', 'ትክክለኛ ኢሜይል ያስገቡ።') })
      return
    }
    setSaving(section)
    setFeedback(null)
    try {
      const response = await fetch('/api/management/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section === 'account'
          ? { section, fullName }
          : { section, ...business }),
      })
      const result = await response.json().catch(() => null) as { fullName?: string; business?: BusinessForm; error?: string } | null
      if (!response.ok || !result) {
        const message = section === 'account'
          ? t('Your name could not be saved. Check it and try again.', 'ስምዎን ማስቀመጥ አልተቻለም። አረጋግጠው እንደገና ይሞክሩ።')
          : result?.error === 'invalid_phone'
            ? t('Enter a valid business phone number.', 'ትክክለኛ የንግድ ስልክ ቁጥር ያስገቡ።')
            : result?.error === 'invalid_email'
              ? t('Enter a valid email address.', 'ትክክለኛ ኢሜይል ያስገቡ።')
              : result?.error === 'business_owner_only'
                ? t('Only the owner can change business details.', 'የንግዱን መረጃ መቀየር የሚችለው ባለቤቱ ብቻ ነው።')
                : t('Business details could not be saved. Check them and try again.', 'የንግድ መረጃውን ማስቀመጥ አልተቻለም። አረጋግጠው እንደገና ይሞክሩ።')
        setFeedback({ kind: 'error', message })
        return
      }

      if (section === 'account' && result.fullName) setFullName(result.fullName)
      if (section === 'business' && result.business) setBusiness(result.business)
      setFeedback({
        kind: 'success',
        message: section === 'account'
          ? t('Your name has been saved.', 'ስምዎ ተቀምጧል።')
          : t('Business details have been saved.', 'የንግድ መረጃው ተቀምጧል።'),
      })
      router.refresh()
    } catch {
      setFeedback({ kind: 'error', message: t('Could not save. Check your connection and try again.', 'ማስቀመጥ አልተቻለም። ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።') })
    } finally {
      setSaving(null)
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || newPassword !== confirmPassword) return
    setSaving('password')
    setFeedback(null)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      })
      if (error) {
        setFeedback({ kind: 'error', message: t('Password was not changed. Check your current password and try again.', 'የይለፍ ቃሉ አልተቀየረም። የአሁኑን የይለፍ ቃል አረጋግጠው እንደገና ይሞክሩ።') })
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFeedback({ kind: 'success', message: t('Your password has been changed.', 'የይለፍ ቃልዎ ተቀይሯል።') })
    } catch {
      setFeedback({ kind: 'error', message: t('Could not change your password. Check your connection and try again.', 'የይለፍ ቃልዎን መቀየር አልተቻለም። ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።') })
    } finally {
      setSaving(null)
    }
  }

  const handleLanguageChange = () => {
    if (!pathname) return
    const segments = pathname.split('/')
    segments[1] = isAm ? 'en' : 'am'
    router.push(segments.join('/') as `/${string}`)
  }

  const signOut = async () => {
    setSaving('signout')
    const { error } = await supabase.auth.signOut()
    if (error) {
      setFeedback({ kind: 'error', message: t('Could not sign out. Try again.', 'ከመለያው መውጣት አልተቻለም። እንደገና ይሞክሩ።') })
      setSaving(null)
      return
    }
    clearLastVisitedRoute()
    if ('caches' in window) {
      await Promise.all(['others', 'apis', 'start-url'].map(async (cacheName) => {
        try {
          await caches.delete(cacheName)
        } catch {
          // A cache cleanup issue must not interrupt a successful sign-out.
        }
      }))
    }
    router.replace(`/${locale}/login` as `/${string}`)
  }

  const passwordIsValid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword

  if (loading) {
    return <div className="flex min-h-60 items-center justify-center text-sm font-bold text-coffee-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-berbere-500" />{t('Loading settings…', 'ቅንብሮችን በመጫን ላይ…')}</div>
  }

  if (!settings) {
    return <main className="mx-auto max-w-xl p-4"><p role="alert" className="rounded-xl border border-danger/20 bg-white p-4 text-sm font-bold text-danger">{feedback?.message}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 h-11 rounded-xl bg-berbere-600 px-4 text-sm font-bold text-white">{t('Try again', 'እንደገና ይሞክሩ')}</button></main>
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 pb-24 sm:px-5 sm:py-6">
      <header className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600"><Store className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-black text-coffee-900">{t('Business & account settings', 'የንግድ እና መለያ ቅንብሮች')}</h1>
            <p className="mt-0.5 text-xs leading-5 text-coffee-500">{t('Change your name, business contact details, and password.', 'ስምዎን፣ የንግድ መገናኛ መረጃን እና የይለፍ ቃልዎን ይቀይሩ።')}</p>
            <p className="mt-1 text-[11px] text-coffee-400">{t('Connect to the internet to save changes.', 'ለውጦችን ለማስቀመጥ ኢንተርኔት ያገናኙ።')}</p>
          </div>
        </div>
      </header>

      {feedback && <p role="status" className={`rounded-xl border p-3 text-sm font-bold ${feedback.kind === 'success' ? 'border-berbere-200 bg-berbere-50 text-berbere-700' : 'border-danger/20 bg-danger-bg text-danger'}`}>{feedback.message}</p>}

      <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2"><UserRound className="h-4 w-4 text-berbere-500" /><h2 className="font-black text-coffee-800">{t('Your account', 'የእርስዎ መለያ')}</h2></div>
        <form className="space-y-3" onSubmit={(event) => void submit(event, 'account')}>
          <Field label={t('Your name', 'ሙሉ ስም')} value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} autoComplete="name" required />
          <p className="text-[11px] leading-4 text-coffee-400">{t('Your sign-in phone is kept unchanged here so you do not lose access to your account.', 'ወደ መለያዎ መግባት እንዳይቋረጥ የመግቢያ ስልክ ቁጥርዎ እዚህ አይቀየርም።')}</p>
          <button type="submit" disabled={saving !== null || fullName.trim().length < 2} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white disabled:opacity-50">
            {saving === 'account' && <Loader2 className="h-4 w-4 animate-spin" />}{t('Save name', 'ስም አስቀምጥ')}
          </button>
        </form>
      </section>

      {business && (
        <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex items-center gap-2"><Store className="h-4 w-4 text-berbere-500" /><h2 className="font-black text-coffee-800">{t('Business details', 'የንግድ መረጃ')}</h2></div>
          <p className="mb-4 text-xs leading-5 text-coffee-500">{settings.canEditBusiness ? t('These details appear on your business records and reports.', 'ይህ መረጃ በንግድ ሪፖርቶችዎ ላይ ይታያል።') : t('Only the business owner can edit these details.', 'ይህን መረጃ መቀየር የሚችለው የንግዱ ባለቤት ብቻ ነው።')}</p>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(event) => void submit(event, 'business')}>
            <Field label={t('Business name', 'የንግድ ስም')} value={business.name} onChange={(event) => setBusiness({ ...business, name: event.target.value })} maxLength={200} required disabled={!settings.canEditBusiness} />
            <Field label={t('Business phone', 'የንግድ ስልክ')} type="tel" inputMode="tel" value={business.phone ?? ''} onChange={(event) => setBusiness({ ...business, phone: event.target.value })} maxLength={20} placeholder="09… / +251…" disabled={!settings.canEditBusiness} />
            <Field label={t('Business email (optional)', 'የንግድ ኢሜይል (አማራጭ)')} type="text" inputMode="email" value={business.email ?? ''} onChange={(event) => setBusiness({ ...business, email: event.target.value })} maxLength={255} autoComplete="email" disabled={!settings.canEditBusiness} />
            <Field label={t('City', 'ከተማ')} value={business.city ?? ''} onChange={(event) => setBusiness({ ...business, city: event.target.value })} maxLength={100} disabled={!settings.canEditBusiness} />
            <Field label={t('Address', 'አድራሻ')} value={business.address ?? ''} onChange={(event) => setBusiness({ ...business, address: event.target.value })} maxLength={500} className="sm:col-span-2" disabled={!settings.canEditBusiness} />
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-cream-200 bg-cream-50 px-3 text-sm font-bold text-coffee-700 sm:col-span-2">
              <input type="checkbox" checked={business.is_hotel_integrated} onChange={(event) => setBusiness({ ...business, is_hotel_integrated: event.target.checked })} disabled={!settings.canEditBusiness} className="h-5 w-5 accent-berbere-600" />
              <span>{t('Hotel integrated (allow room charges)', 'ከሆቴል ጋር የተያያዘ (የክፍል ክፍያ ፍቀድ)')}</span>
            </label>
            {settings.canEditBusiness && <div className="sm:col-span-2"><button type="submit" disabled={saving !== null || business.name.trim().length < 2} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white disabled:opacity-50">{saving === 'business' && <Loader2 className="h-4 w-4 animate-spin" />}{t('Save business details', 'የንግድ መረጃ አስቀምጥ')}</button></div>}
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-1 flex items-center gap-2"><KeyRound className="h-4 w-4 text-berbere-500" /><h2 className="font-black text-coffee-800">{t('Change password', 'የይለፍ ቃል ቀይር')}</h2></div>
        <p className="mb-4 text-xs leading-5 text-coffee-500">{t('Enter your current password, then choose a new one.', 'የአሁኑን የይለፍ ቃል ከዚያም አዲስ የይለፍ ቃል ያስገቡ።')}</p>
        <form className="space-y-3" onSubmit={(event) => void changePassword(event)}>
          <Field label={t('Current password', 'የአሁኑ የይለፍ ቃል')} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
          <Field label={t('New password', 'አዲስ የይለፍ ቃል')} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
          <p className="text-[11px] text-coffee-400">{t('Use at least 8 characters, one capital letter, and one number.', 'ቢያንስ 8 ቁምፊ፣ አንድ ትልቅ ፊደል እና አንድ ቁጥር ይጠቀሙ።')}</p>
          <Field label={t('Repeat new password', 'አዲሱን የይለፍ ቃል ደግመው ያስገቡ')} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          {confirmPassword && !passwordsMatch && <p className="text-xs font-bold text-danger">{t('The passwords do not match.', 'የይለፍ ቃሎቹ አይዛመዱም።')}</p>}
          <button type="submit" disabled={saving !== null || !currentPassword || !passwordIsValid || !passwordsMatch} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-berbere-600 px-4 text-sm font-black text-white disabled:opacity-50">{saving === 'password' && <Loader2 className="h-4 w-4 animate-spin" />}{t('Change password', 'የይለፍ ቃል ቀይር')}</button>
        </form>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
        <div><h2 className="text-sm font-black text-coffee-800">{t('Language', 'ቋንቋ')}</h2><p className="mt-0.5 text-xs text-coffee-500">{t('Current language: English', 'የአሁኑ ቋንቋ፦ አማርኛ')}</p></div>
        <button type="button" onClick={handleLanguageChange} className="h-11 rounded-xl border border-cream-300 px-4 text-sm font-bold text-coffee-700 hover:bg-cream-50">{t('Switch to Amharic', 'ወደ English ቀይር')}</button>
      </section>

      <button type="button" onClick={() => void signOut()} disabled={saving !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-danger/20 bg-white px-4 text-sm font-bold text-danger hover:bg-danger-bg disabled:opacity-50"><LogOut className="h-4 w-4" />{saving === 'signout' && <Loader2 className="h-4 w-4 animate-spin" />}{t('Sign out', 'ከመለያው ውጣ')}</button>
    </main>
  )
}
