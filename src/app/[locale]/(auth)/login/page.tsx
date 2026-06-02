'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, WifiOff, AlertCircle, Phone } from 'lucide-react'
import createClient from '../../../../lib/supabase/client'

type Lang = 'am' | 'en'
type Mode = 'phone' | 'pin'

export default function LoginPage() {
  const router   = useRouter()
  const params   = useParams()
  const supabase = createClient()

  const routeLocale = (params?.locale as Lang) || 'am'

  const [lang, setLang]           = useState<Lang>(routeLocale)
  const [mode, setMode]           = useState<Mode>('phone')
  const [showPw, setShowPw]       = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])

  // Controlled Phone login fields
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')

  const t = (en: string, am: string) => lang === 'am' ? am : en

  /* ── Format Ethiopian Phone Input into E.164 Standard ──────────────── */
  const formatToE164 = (input: string): string => {
    let clean = input.replace(/\D/g, '') // strip all non-digits
    
    if (clean.startsWith('0')) {
      clean = '251' + clean.slice(1)
    } else if (clean.startsWith('9') || clean.startsWith('7')) {
      clean = '251' + clean
    } else if (!clean.startsWith('251') && clean.length === 9) {
      clean = '251' + clean
    }
    
    return '+' + clean
  }

  /* ── Phone + Password Login Flow ───────────────────────────────────── */
  const onPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !password) {
      setError(t('Please enter both phone and password.', 'እባክዎ ስልክ ቁጥር እና የይለፍ ቃል ያስገቡ።'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formattedPhone = formatToE164(phone)
      
      const { error: authErr } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: password,
      })

      if (authErr) {
        setError(
          authErr.message.includes('Invalid login')
            ? t('Incorrect phone number or password.', 'ስልክ ቁጥር ወይም የሚስጥር ቃሉ ትክክል አይደለም።')
            : authErr.message
        )
        return
      }

      // Check structural progress state
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id, businesses(type)')
          .eq('id', user.id)
          .single()

        const businessInfo = profile?.businesses as unknown as { type: string | null } | null
        
        // Dynamic logic safeguard to map to the wizard
        if (profile?.business_id && businessInfo?.type) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      }
    } catch (err) {
      console.error(err)
      setError(t('Something went wrong. Check your internet.', 'ችግር ተከሰተ። ኢንተርኔቱን ይፈትሹ።'))
    } finally {
      setIsLoading(false)
    }
  }

  /* ── PIN Authentication Flow ───────────────────────────────────────── */
  const handlePinInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...pinDigits]
    next[index] = value.slice(-1)
    setPinDigits(next)

    if (value && index < 3) {
      document.getElementById(`pin-${index + 1}`)?.focus()
    }
    if (next.every(d => d !== '') && value) {
      submitPin(next.join(''))
    }
  }

  const handlePinKey = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus()
    }
  }

  const submitPin = async (pin: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('pin-login', { body: { pin } })
      
      if (fnErr || !data?.token) {
        setError(t('Incorrect PIN. Try again or use phone.', 'PIN ትክክል አይደለም። ስልክ ቁጥር ይጠቀሙ።'))
        setPinDigits(['', '', '', ''])
        document.getElementById('pin-0')?.focus()
        return
      }

      await supabase.auth.setSession({ 
        access_token: data.token, 
        refresh_token: data.refresh_token 
      })
      
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setError(t('PIN login failed. Use phone instead.', 'PIN አልሰራም። ስልክ ቁጥርን ይጠቀሙ።'))
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (m: Mode) => { 
    setMode(m)
    setError(null)
    setPinDigits(['', '', '', '']) 
  }

  const inputCls = 'w-full px-4 text-[15px] text-[#2B1E1A] font-["DM_Sans",sans-serif] placeholder:text-[#9b7b74] bg-[#F7F4EB]/60 outline-none rounded-xl border border-[#2B1E1A]/15 transition-colors focus:border-[#8B2635] focus:bg-white min-h-[52px]'

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex flex-col font-['DM_Sans',sans-serif]"
         style={{ WebkitTapHighlightColor: 'transparent' }}>

      {/* TOP NAVIGATION BAR */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link href={`/${lang}`} className="font-['Playfair_Display',serif] font-bold text-xl text-[#8B2635] leading-none">
          ሊዩ <span className="text-[#E2A03F]">POS</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(l => l === 'am' ? 'en' : 'am')}
            className="text-xs font-semibold text-[#5a3e38] px-2.5 py-1.5 rounded-full border border-[#2B1E1A]/15 bg-white min-h-[36px]">
            {lang === 'am' ? 'EN' : 'አማ'}
          </button>
          <Link href={`/${lang}/register`} className="text-xs font-semibold text-[#8B2635] hover:underline px-1">
            {t('Register', 'ይመዝገቡ')}
          </Link>
        </div>
      </div>

      {/* VIEWPORT BODY */}
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm">

          <div className="bg-white rounded-2xl border border-[#2B1E1A]/10 overflow-hidden shadow-xl shadow-[#2B1E1A]/5">
            {/* Header branding block */}
            <div className="bg-[#8B2635] px-5 py-5">
              <h1 className="font-['Playfair_Display',serif] text-white font-bold text-xl leading-tight">
                {mode === 'phone' ? t('Welcome back', 'እንኳን ደህና መጡ') : t('Quick PIN Login', 'ፈጣን PIN ግባ')}
              </h1>
              <p className="text-white/65 text-xs mt-1">
                {mode === 'phone' ? t('Sign in to Liyu POS', 'ወደ ሊዩ POS ይግቡ') : t('Enter your 4-digit PIN to open your shift', '4 ዲጂት PIN አስገቡ')}
              </p>
            </div>

            {/* Mode tabs toggle selector */}
            <div className="flex border-b border-[#2B1E1A]/8">
              {(['phone', 'pin'] as Mode[]).map((m) => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-3 text-xs font-semibold transition-colors min-h-[44px]
                    ${mode === m ? 'text-[#8B2635] border-b-2 border-[#8B2635] bg-[#8B2635]/4' : 'text-[#9b7b74] hover:text-[#5a3e38]'}`}>
                  {m === 'phone' ? t('Phone Login', 'ስልክ ቁጥር') : t('PIN Login', 'PIN')}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-3 mb-4 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* PHONE AND PASSWORD AUTHENTICATION COMPONENT */}
              {mode === 'phone' && (
                <form onSubmit={onPhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                      {t('Phone Number', 'ስልክ ቁጥር')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[#9b7b74] font-semibold pointer-events-none">
                        🇪🇹
                      </span>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0912345678" 
                        className={`${inputCls} pl-11`} 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#5a3e38]">
                        {t('Password', 'የሚስጥር ቃል')}
                      </label>
                      <Link href={`/${lang}/forgot-password`} className="text-[11px] text-[#8B2635] hover:underline">
                        {t('Forgot?', 'ረሳዎ?')}
                      </Link>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPw ? 'text' : 'password'} 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className={`${inputCls} pr-12`} 
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b7b74] p-2 min-h-[44px] flex items-center justify-center">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-semibold text-[15px] rounded-xl transition-all active:scale-[0.98] min-h-[52px] mt-1 disabled:opacity-55">
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('Signing in...', 'እየገባ ነው...')}</>
                    ) : (
                      <>{t('Sign In', 'ግባ')} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}

              {/* CASHIER QUICK ACCESS PIN COMPONENT */}
              {mode === 'pin' && (
                <div className="space-y-5">
                  <p className="text-xs text-center text-[#5a3e38]">{t('Enter the 4-digit PIN your manager gave you', 'አስተዳዳሪዎ የሰጡዎትን 4 ዲጂት PIN አስገቡ')}</p>

                  <div className="flex justify-center gap-3">
                    {pinDigits.map((digit, i) => (
                      <input key={i} id={`pin-${i}`} type="password" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handlePinInput(i, e.target.value)} onKeyDown={e => handlePinKey(i, e)} disabled={isLoading}
                        className={`w-[60px] h-[64px] text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all bg-[#F7F4EB]/50 touch-manipulation focus:border-[#8B2635] focus:bg-white disabled:opacity-50 ${digit ? 'border-[#8B2635] bg-[#8B2635]/5' : 'border-[#2B1E1A]/15'}`}
                        aria-label={`${t('PIN digit', 'PIN ቁጥር')} ${i + 1}`} />
                    ))}
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-[#5a3e38]">
                      <div className="w-4 h-4 border-2 border-[#8B2635]/30 border-t-[#8B2635] rounded-full animate-spin" />
                      {t('Verifying...', 'እየፈተሸ ነው...')}
                    </div>
                  )}

                  <button type="button" onClick={() => switchMode('phone')} className="w-full text-center text-xs text-[#9b7b74] hover:text-[#5a3e38] py-2 min-h-[44px]">
                    {t('Use phone login instead', 'በስልክ ቁጥር ይግቡ')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-[#9b7b74] mt-5">
            {t("Don't have an account?", 'አካውንት የለዎትም?')}{' '}
            <Link href={`/${lang}/register`} className="text-[#8B2635] font-bold hover:underline">{t('Create one free', 'ነፃ ይፍጠሩ')}</Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-[#9b7b74]">
            <WifiOff className="w-3 h-3 shrink-0" />
            <span>{t('Login needs internet. Selling works offline after first login.', 'ለግቢ ኢንተርኔት ያስፈልጋል። ከዚያ Offline ሽያጭ ይቻላል።')}</span>
          </div>
        </div>
      </main>
    </div>
  )
}