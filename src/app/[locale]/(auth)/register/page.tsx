'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, ChevronDown, ArrowLeft } from 'lucide-react'
import createClient from '../../../../lib/supabase/client'

/* ─── Schema Configuration ────────────────────────────────────────────────── */
const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name / ሙሉ ስምዎን ያስገቡ'),
  businessName: z.string().min(2, 'Enter your business name / የንግዱ ስም ያስገቡ'),
  businessType: z.string().min(1, 'Select a business type / የንግድ አይነት ይምረጡ'),
  phone: z.string()
    .min(9, 'Enter valid Ethiopian phone / ትክክለኛ ስልክ ቁጥር')
    .regex(/^(\+251|0)?[97]\d{8}$/, 'Use format 09xxxxxxxx or +2519xxxxxxxx'),
  password: z.string().min(8, 'Min 8 characters / ቢያንስ 8 ቁምፊዎች'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match / የሚስጥር ቃሎቹ አይዛመዱም',
  path: ['confirm'],
})
type Form = z.infer<typeof schema>

const BUSINESS_TYPES = [
  { value: 'bar_restaurant', en: 'Bar & Restaurant', am: 'ባር እና ሬስቶራንት' },
  { value: 'cafe_restaurant', en: 'Cafe & Restaurant', am: 'ካፌ እና ሬስቶራንት' },
  { value: 'bar_traditional', en: 'Bar & Traditional House', am: 'ባር እና ባህላዊ ምግቦች ቤት' },
  { value: 'retail_kiosk', en: 'Retail, Kiosk & Mini-Market', am: 'ችርቻሮ፣ ኪዮስክ እና ሚኒ-ማርኬት' },
  { value: 'service_hospitality', en: 'Service & Hospitality', am: 'አገልግሎት እና ሆስፒታሊቲ' },
  { value: 'other', en: 'Other Business Type', am: 'ሌላ የንግድ አይነት' },
]

const PW_CHECKS = [
  { label: { en: '8+ characters', am: '8+ ቁምፊዎች' }, test: (p: string) => p.length >= 8 },
  { label: { en: 'Uppercase letter', am: 'ትልቅ ፊደል' }, test: (p: string) => /[A-Z]/.test(p) },
  { label: { en: 'Number included', am: 'ቁጥር አለ' }, test: (p: string) => /\d/.test(p) },
]

type Lang = 'am' | 'en'

export default function RegisterPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const routeLocale = (params?.locale as Lang) || 'am'

  const [lang, setLang] = useState<Lang>(routeLocale)
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)
  const [pwVal, setPwVal] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  const t = (en: string, am: string) => lang === 'am' ? am : en

  const {
    register, handleSubmit, trigger, getValues, watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { businessType: '', fullName: '', businessName: '', phone: '', password: '', confirm: '' }
  })

  // Format local phone numbers uniformly to standard E.164 (+251...) format for database normalization
  const formatToEthiopianStandard = (phoneStr: string) => {
    const clean = phoneStr.replace(/\s+/g, '')
    if (clean.startsWith('0')) {
      return '+251' + clean.substring(1)
    }
    if (!clean.startsWith('+')) {
      return '+' + clean
    }
    return clean
  }

  const goToStep2 = async () => {
    const ok = await trigger(['fullName', 'businessName', 'businessType', 'phone'])
    if (ok) {
      setServerErr(null)
      setStep(2)
    }
  }

  const onSubmit = async (data: Form) => {
    setIsLoading(true)
    setServerErr(null)

    const formattedPhone = formatToEthiopianStandard(data.phone)

    try {
      // Single native auth entry point. The Postgres trigger provisions the business/branch/profile.
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            business_name: data.businessName,
            business_type: data.businessType
          }
        },
      })

      if (authErr) {
        setServerErr(
          authErr.message.includes('already registered') || authErr.message.includes('User already exists')
            ? t('This phone number is already registered.', 'ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል።')
            : authErr.message
        )
        return
      }

      if (!authData?.user) {
        setServerErr(t('Registration failed. Please verify connection.', 'ምዝገባ አልተሳካም። እባክዎ መስመርዎን ያረጋግጡ።'))
        return
      }

      // Success! Redirect the user to onboarding
      router.push(`/${lang}/onboarding`)
    } catch (err: any) {
      setServerErr(t('Something went wrong. Please try again.', 'ችግር ተከሰተ። እንደገና ይሞክሩ።'))
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = (hasErr: boolean) =>
    `w-full px-4 text-[15px] text-[#2B1E1A] font-['DM_Sans',sans-serif]
     placeholder:text-[#9b7b74]/50 bg-[#F7F4EB]/60 outline-none rounded-xl
     border transition-colors focus:border-[#8B2635] focus:bg-white
     min-h-[52px] ${hasErr ? 'border-red-400 ring-1 ring-red-400' : 'border-[#2B1E1A]/15'}`

  const pwStrength = PW_CHECKS.filter(c => c.test(pwVal)).length

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex flex-col font-['DM_Sans',sans-serif]"
      style={{ WebkitTapHighlightColor: 'transparent' }}>

      {/* ─── Modernized Control Header Bar ───────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 max-w-sm w-full mx-auto">
        <div className="flex items-center gap-2">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center justify-center text-[#5a3e38] px-2.5 py-1.5 rounded-full
                         border border-[#2B1E1A]/15 bg-white min-h-[36px] shadow-sm transition hover:bg-zinc-50"
            >
              <ArrowLeft className="w-4 h-4 mr-1 text-[#8B2635]" />
              <span className="text-xs font-semibold">{t('Back', 'ተመለስ')}</span>
            </button>
          ) : (
            <Link href={`/${lang}`}
              className="font-['Playfair_Display',serif] font-bold text-xl text-[#8B2635] tracking-tight">
              ሊዩ <span className="text-[#E2A03F]">POS</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setLang(l => l === 'am' ? 'en' : 'am')}
            className="text-xs font-semibold text-[#5a3e38] px-3 py-1.5 rounded-full
                       border border-[#2B1E1A]/15 bg-white min-h-[36px] shadow-sm transition hover:bg-zinc-50">
            {lang === 'am' ? 'English' : 'አማርኛ'}
          </button>
          {step === 1 && (
            <Link href={`/${lang}/login`} className="text-xs font-bold text-[#8B2635] border border-[#8B2635]/15 bg-[#8B2635]/5 px-3 py-1.5 rounded-full transition hover:bg-[#8B2635]/10">
              {t('Sign In', 'ግባ')}
            </Link>
          )}
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-4">
        <div className="w-full max-w-sm">

          {/* Core Content Card */}
          <div className="bg-white rounded-2xl border border-[#2B1E1A]/10 overflow-hidden shadow-xl">

            {/* Top Interactive Context Hero Header */}
            <div className="bg-[#8B2635] px-5 py-5 text-white">
              <h1 className="font-['Playfair_Display',serif] font-bold text-xl leading-tight tracking-tight">
                {t('Start using Liyu POS', 'ሊዩ POS ይጀምሩ')}
              </h1>

              <p className="text-white/70 text-xs mt-1">
                {t(
                  'Create your account and start tracking sales today.',
                  'አካውንት ይፍጠሩ እና ሽያጭዎን ዛሬውኑ ይቆጣጠሩ።'
                )}
              </p>

              {/* Functional Process Progress Segment Tracker */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full text-[10px] font-bold
                                    flex items-center justify-center transition-all duration-300
                      ${step >= s ? 'bg-[#E2A03F] text-[#2B1E1A] scale-105' : 'bg-white/20 text-white/60'}`}>
                      {s}
                    </div>
                    {s === 1 && (
                      <div className={`w-8 h-0.5 rounded-full transition-colors duration-300
                        ${step >= 2 ? 'bg-[#E2A03F]' : 'bg-white/20'}`} />
                    )}
                  </div>
                ))}
                <span className="text-white/75 text-[11px] font-medium ml-1">
           {step === 1
  ? t('Your Business', 'የንግድ መረጃ')
  : t('Create Password', 'የይለፍ ቃል')}
                </span>
              </div>
            </div>

            <div className="px-5 py-5">

              {/* Dynamic Core Server Alert Pipeline Messaging Container */}
              {serverErr && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200
                                text-red-700 rounded-xl px-3 py-3 mb-4 text-xs font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{serverErr}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>

                {/* ── STEP 1: Core Business Domain Configuration Options ── */}
                {step === 1 && (
                  <div className="space-y-4">

                    {/* Owner Name Input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Owner Name', 'የባለቤቱ ስም')}
                      </label>
                      <input {...register('fullName')}
                        placeholder={t('e.g. Chala Kebede', 'ምሳሌ፡ ቻላ ከበደ')}
                        className={inputCls(!!errors.fullName)} />
                      {errors.fullName && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.fullName.message}</p>
                      )}
                    </div>

                    {/* Store / Entity Branding Input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Business Name', 'የንግድ ቤቱ ስም')}
                      </label>
                      <input {...register('businessName')}
                        placeholder={t('e.g. Flamingo Restaurant, Bole', 'ምሳሌ፡ ፍሌሚንጎ ሬስቶራንት፣ ቦሌ')}
                        className={inputCls(!!errors.businessName)} />
                      {errors.businessName && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.businessName.message}</p>
                      )}
                    </div>

                    {/* Optimized Sector Dropdown Configuration Selection Matrices */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Business Type', 'የንግድ አይነት')}
                      </label>
                      <div className="relative">
                        <select {...register('businessType')}
                          defaultValue=""
                          className={`${inputCls(!!errors.businessType)} pr-10 appearance-none bg-transparent`}>
                          <option value="" disabled>
                            {t('Select classification sector...', 'የንግድ ዘርፍ ይምረጡ...')}
                          </option>
                          {BUSINESS_TYPES.map(bt => (
                            <option key={bt.value} value={bt.value} className="text-[#2B1E1A]">
                              {lang === 'am' ? bt.am : bt.en}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                                w-4 h-4 text-[#9b7b74] pointer-events-none" />
                      </div>
                      {errors.businessType && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">
                          {errors.businessType.message}
                        </p>
                      )}
                    </div>

                    {/* Normalized Primary Telephone Interface Identity */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Phone Number', 'ስልክ ቁጥር')}
                      </label>
                      <input {...register('phone')} type="tel" inputMode="tel"
                        placeholder="0912345678"
                        className={inputCls(!!errors.phone)} />
                      {errors.phone && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.phone.message}</p>
                      )}
                    </div>

                    <button type="button" onClick={goToStep2}
                      className="w-full flex items-center justify-center gap-2
                                 bg-[#8B2635] hover:bg-[#7a1f2d] text-white
                                 font-semibold text-[15px] rounded-xl shadow-md
                                 transition-all active:scale-[0.99] min-h-[52px] mt-2">
                      {t('Next', 'ቀጣይ')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── STEP 2: Pure Security Credential Validation Node ── */}
                {step === 2 && (
                  <div className="space-y-4">

                    {/* Integrated Dynamic Summary State Context Badge Container */}
                    <div className="flex items-center gap-2.5 bg-[#F7F4EB]/80 rounded-xl px-3 py-3
                                    border border-[#2B1E1A]/10">
                      <span className="text-xl">🏪</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-[#2B1E1A] truncate">{watch('businessName')}</div>
                        <div className="text-[10px] text-[#9b7b74] font-medium tracking-wide">{watch('phone')}</div>
                      </div>
                    </div>

                    {/* Security Authentication Variable Key Assignment */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Create Account Password', 'የይለፍ ቃል ይፍጠሩ')}
                      </label>
                      <div className="relative">
                        <input {...register('password')} type={showPw ? 'text' : 'password'}
                          autoComplete="new-password" placeholder="••••••••"
                          onChange={e => setPwVal(e.target.value)}
                          className={inputCls(!!errors.password) + ' pr-12'} />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-2
                                     text-[#9b7b74] hover:text-[#5a3e38]
                                     min-h-[44px] min-w-[44px] flex items-center justify-center">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Visual Key Matrix Complexity Dynamic Indicator Feedback */}
                      {pwVal && (
                        <div className="mt-2.5 space-y-1.5 bg-[#F7F4EB]/30 p-2 rounded-lg border border-[#2B1E1A]/5">
                          <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                                ${i <= pwStrength
                                  ? pwStrength === 1 ? 'bg-red-400'
                                    : pwStrength === 2 ? 'bg-[#E2A03F]'
                                      : 'bg-emerald-500'
                                  : 'bg-[#2B1E1A]/10'}`} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {PW_CHECKS.map(c => (
                              <span key={c.label.en}
                                className={`text-[10px] flex items-center gap-1 font-medium transition-colors
                                  ${c.test(pwVal) ? 'text-emerald-600' : 'text-[#9b7b74]'}`}>
                                <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                                {lang === 'am' ? c.label.am : c.label.en}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {errors.password && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Secondary Access Token Match Security Checking Input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Confirm Password', 'የይለፍ ቃልዎን ያረጋግጡ')}
                      </label>
                      <input {...register('confirm')} type="password"
                        autoComplete="new-password" placeholder="••••••••"
                        className={inputCls(!!errors.confirm)} />
                      {errors.confirm && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.confirm.message}</p>
                      )}
                    </div>

                    {/* Local Jurisdictional Regulatory Information Disclosure Banner */}
                    <p className="text-[10px] text-[#9b7b74]/90 leading-relaxed pt-1">
                      {t(
                        'Your business information is kept safe and private.',
                        'የንግድ መረጃዎ በደህንነት የተጠበቀ ነው።'
                      )}
                    </p>

                    <button type="submit" disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2
                                 bg-[#8B2635] hover:bg-[#7a1f2d] disabled:opacity-55
                                 text-white font-semibold text-[15px] rounded-xl shadow-md
                                 transition-all active:scale-[0.99] min-h-[52px]">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white
                                          rounded-full animate-spin" />
                          {t('Generating Workspace...', 'አካውንት እየተፈጠረ...')}
                        </>
                      ) : (
                        <>
                          {t('Complete & Launch POS', 'አካውንት ፍጠር')}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-[#9b7b74] mt-5 pb-6 font-medium">
            {t('Already have an account?', 'አካውንት አለዎት?')}{' '}
            <Link href={`/${lang}/login`} className="text-[#8B2635] font-bold hover:underline ml-1">
              {t('Sign In', 'ይግቡ')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}