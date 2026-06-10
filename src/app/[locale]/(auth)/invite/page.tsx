'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import createClient from '../../../../lib/supabase/client'

/* ─── Staff Activation Validation Schema ──────────────────────────────────── */
const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name / ሙሉ ስምዎን ያስገቡ'),
  inviteCode: z.string()
    .min(5, 'Enter valid code / ትክክለኛ የጋበዣ ኮድ ያስገቡ')
    .toUpperCase(),
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

type Lang = 'am' | 'en'

export default function StaffRegisterPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const routeLocale = (params?.locale as Lang) || 'am'
  const [lang, setLang] = useState<Lang>(routeLocale)
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const t = (en: string, am: string) => lang === 'am' ? am : en

  const {
    register, handleSubmit, trigger, watch, formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { inviteCode: '', fullName: '', phone: '', password: '', confirm: '' }
  })

  const formatToEthiopianStandard = (phoneStr: string) => {
    const clean = phoneStr.replace(/\s+/g, '')
    if (clean.startsWith('0')) return '+251' + clean.substring(1)
    if (!clean.startsWith('+')) return '+' + clean
    return clean
  }

  const verifyInvitationStep = async () => {
    const isValid = await trigger(['inviteCode', 'fullName', 'phone'])
    if (!isValid) return

    setIsLoading(true)
    setServerErr(null)

    try {
      /* 
        🔍 Validation Rule: Look up the generated invite code to ensure 
        it exists and hasn't been claimed by another user profile yet.
      */
      const { data: invite, error: inviteErr } = await supabase
        .from('staff_invitations')
        .select('id, status')
        .eq('code', watch('inviteCode').trim().toUpperCase())
        .single()

      if (inviteErr || !invite) {
        setServerErr(t('Invalid invitation code.', 'የተሳሳተ የጋበዣ ኮድ ነው።'))
        return
      }

      if (invite.status === 'used') {
        setServerErr(t('This invitation has already been claimed.', 'ይህ የጋበዣ ኮድ አገልግሎት ላይ ውሏል።'))
        return
      }

      // Invitation is active and pristine! Move to password initialization
      setStep(2)
    } catch (err) {
      setServerErr(t('Connection timeout. Try again.', 'ግንኙነት ተቋርጧል። እንደገና ይሞክሩ።'))
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: Form) => {
    setIsLoading(true)
    setServerErr(null)

    const formattedPhone = formatToEthiopianStandard(data.phone)

    try {
      /*
        🚀 Standard Native Client Auth Sign-Up:
        Your background database triggers will intercept this payload, confirm the inviteCode matches,
        link the profile to the correct store company ID, and provision the application roles.
      */
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            invite_code: data.inviteCode,
            is_staff: true
          }
        },
      })

      if (authErr) {
        setServerErr(authErr.message)
        return
      }

      if (!authData?.user) {
        setServerErr(t('Activation failed.', 'ማግበር አልተሳካም።'))
        return
      }

      // Success! Send the operational worker straight into their dashboard frame workspace
      router.push(`/${lang}/dashboard`)
    } catch (err) {
      setServerErr(t('Something went wrong.', 'ችግር ተከሰተ።'))
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = (hasErr: boolean) =>
    `w-full px-4 text-[15px] text-[#2B1E1A] placeholder:text-[#9b7b74]/50 bg-[#F7F4EB]/60 
     outline-none rounded-xl border transition-colors focus:border-[#8B2635] focus:bg-white
     min-h-[52px] ${hasErr ? 'border-red-400 ring-1 ring-red-400' : 'border-[#2B1E1A]/15'}`

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex flex-col font-['DM_Sans',sans-serif]">
      
      {/* ─── Navigation Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 max-w-sm w-full mx-auto">
        <span className="font-['Playfair_Display',serif] font-bold text-xl text-[#8B2635] tracking-tight">
          ሊዩ <span className="text-[#E2A03F]">POS</span>
        </span>
        <button 
          onClick={() => setLang(l => l === 'am' ? 'en' : 'am')}
          className="text-xs font-semibold text-[#5a3e38] px-3 py-1.5 rounded-full border border-[#2B1E1A]/15 bg-white min-h-[36px] shadow-sm"
        >
          {lang === 'am' ? 'English' : 'አማርኛ'}
        </button>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#2B1E1A]/10 overflow-hidden shadow-xl">
            
            {/* Context Banner Top Cap */}
            <div className="bg-[#2B1E1A] px-5 py-5 text-white">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#E2A03F]" />
                <h1 className="font-['Playfair_Display',serif] font-bold text-xl tracking-tight">
                  {t('Staff Activation', 'የሰራተኛ ማግበሪያ')}
                </h1>
              </div>
              <p className="text-white/60 text-xs mt-1">
                {t('Activate your account using your store invitation key.', 'በድርጅትዎ የተሰጠዎትን የጋበዣ ኮድ በመጠቀም አካውንትዎን ያግብሩ።')}
              </p>
            </div>

            <div className="px-5 py-5">
              {serverErr && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-3 mb-4 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{serverErr}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                
                {/* ── STEP 1: VALIDATE INVITATION KEY ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Invitation Code', 'የጋበዣ ኮድ')}
                      </label>
                      <input 
                        {...register('inviteCode')} 
                        placeholder="e.g. LY-4982"
                        className={`${inputCls(!!errors.inviteCode)} font-mono uppercase font-black tracking-widest`}
                      />
                      {errors.inviteCode && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.inviteCode.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Your Full Name', 'የእርስዎ ሙሉ ስም')}
                      </label>
                      <input 
                        {...register('fullName')} 
                        placeholder={t('e.g. Almaz Ayana', 'ምሳሌ፡ አልማዝ አያና')}
                        className={inputCls(!!errors.fullName)}
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.fullName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Phone Number', 'ስልክ ቁጥር')}
                      </label>
                      <input 
                        {...register('phone')} 
                        type="tel" 
                        placeholder="0911223344"
                        className={inputCls(!!errors.phone)}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.phone.message}</p>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={verifyInvitationStep}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-semibold text-[15px] rounded-xl shadow-md min-h-[52px] disabled:opacity-50"
                    >
                      {isLoading ? t('Verifying Link...', 'እያረጋገጠ ነው...') : t('Verify Invitation', 'ኮድ አረጋግጥ')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── STEP 2: ACCOUNT SECURITY PASSWORD ASSIGNMENT ── */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#F7F4EB]/80 rounded-xl border border-[#2B1E1A]/10 text-xs">
                      <div className="text-[#9b7b74] font-medium">{t('Verified Invite Code:', 'የተረጋገጠ ጋበዣ ኮድ፡')}</div>
                      <div className="font-mono font-black text-sm text-[#2B1E1A] tracking-wider mt-0.5">{watch('inviteCode').toUpperCase()}</div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Create Password', 'የይለፍ ቃል ይፍጠሩ')}
                      </label>
                      <div className="relative">
                        <input 
                          {...register('password')} 
                          type={showPw ? 'text' : 'password'}
                          placeholder="••••••••"
                          className={inputCls(!!errors.password) + ' pr-12'}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPw(v => !v)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#9b7b74]"
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5a3e38] mb-1.5">
                        {t('Confirm Password', 'የይለፍ ቃልዎን ያረጋግጡ')}
                      </label>
                      <input 
                        {...register('confirm')} 
                        type="password"
                        placeholder="••••••••"
                        className={inputCls(!!errors.confirm)}
                      />
                      {errors.confirm && (
                        <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.confirm.message}</p>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[15px] rounded-xl shadow-md min-h-[52px]"
                    >
                      {isLoading ? t('Activating Profile...', 'እያነቀሳቀሰ ነው...') : t('Activate Terminal Access', 'ስራ ጀምር')}
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}