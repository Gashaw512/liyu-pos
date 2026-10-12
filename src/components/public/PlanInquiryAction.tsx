'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { PublicInquiryPlanId } from '@/lib/public-inquiry'

interface PlanInquiryActionProps {
  planId: PublicInquiryPlanId
  planName: string
  price: string
  lang: 'en' | 'am'
  className: string
}

const initialFields = { name: '', businessName: '', contact: '', message: '', consent: false, website: '' }

export function PlanInquiryAction({ planId, planName, price, lang, className }: PlanInquiryActionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [fields, setFields] = useState(initialFields)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isEnglish = lang === 'en'
  const isDemo = planId === 'demo'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  const closeDialog = () => {
    if (isSubmitting) return
    setIsOpen(false)
  }

  const updateField = (field: keyof typeof initialFields, value: string | boolean) => {
    setFields((current) => ({ ...current, [field]: value }))
  }

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch('/api/public-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, planId, language: lang }),
      })
      const body = await response.json() as { success?: boolean; message?: string; error?: string }
      if (!response.ok || !body.success) {
        setResult({ success: false, message: body.error || (isEnglish ? 'We could not send your inquiry. Please try again.' : 'ጥያቄዎን መላክ አልተቻለም። እንደገና ይሞክሩ።') })
        return
      }
      setResult({ success: true, message: body.message || (isEnglish ? 'Your inquiry has been sent.' : 'ጥያቄዎ ተልኳል።') })
    } catch {
      setResult({
        success: false,
        message: isEnglish
          ? 'We could not reach the inquiry service. Please try again or email info@liyupos.com.'
          : 'የጥያቄ መላኪያ አገልግሎቱን ማግኘት አልተቻለም። እንደገና ይሞክሩ ወይም info@liyupos.com ላይ ይጻፉ።',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setFields(initialFields); setResult(null); setIsOpen(true) }} className={`${className} w-full`}>
        {isDemo
          ? (isEnglish ? 'Request a product demo' : 'የምርት ማሳያ ይጠይቁ')
          : (isEnglish ? 'Ask about this plan' : 'ስለዚህ እቅድ ይጠይቁ')}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="plan-inquiry-title"
        onClose={() => { setIsOpen(false); setFields(initialFields); setResult(null) }}
        onCancel={(event) => { if (isSubmitting) event.preventDefault() }}
        onClick={(event) => { if (event.target === dialogRef.current) closeDialog() }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-coffee-700/10 bg-white p-0 text-[#2B1E1A] shadow-2xl backdrop:bg-black/50 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
      >
        <div className="flex items-start justify-between gap-4 border-b border-coffee-700/10 px-5 py-4 dark:border-white/10 sm:px-6">
          <div>
            <h2 id="plan-inquiry-title" className="font-serif text-xl font-bold">
              {isDemo
                ? (isEnglish ? 'Request a product demo' : 'የምርት ማሳያ ይጠይቁ')
                : (isEnglish ? 'Talk with us about Liyu' : 'ስለ ሊዩ ያነጋግሩን')}
            </h2>
            <p className="mt-1 text-xs text-coffee-500 dark:text-zinc-400">
              {isDemo
                ? (isEnglish ? 'Leave your contact details so we can arrange a short walkthrough.' : 'አጭር ማብራሪያ ለማዘጋጀት የመገኛ መረጃዎን ይተዉ።')
                : (isEnglish ? 'A few details will help us respond usefully.' : 'በተገቢው ለመመለስ ጥቂት መረጃ ይሙሉ።')}
            </p>
          </div>
          <button type="button" onClick={closeDialog} disabled={isSubmitting} aria-label={isEnglish ? 'Close form' : 'ቅጹን ዝጋ'} className="rounded-lg px-3 py-2 text-sm font-semibold text-coffee-600 hover:bg-[#F7F4EB] disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
            {isEnglish ? 'Close' : 'ዝጋ'}
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="mb-5 rounded-xl bg-[#F7F4EB] px-4 py-3 dark:bg-zinc-800">
            <p className="text-sm font-semibold">{planName}</p>
            <p className="mt-1 text-xs text-coffee-600 dark:text-zinc-300">{price}</p>
            <p className="mt-2 text-xs leading-relaxed text-coffee-500 dark:text-zinc-400">
              {planId === 'demo'
                ? (isEnglish ? 'A sample-data demonstration request; no account or payment is created.' : 'የሙከራ መረጃ ማሳያ ጥያቄ ነው፤ አካውንት ወይም ክፍያ አይፈጠርም።')
                : (isEnglish ? 'This is a proposed price, not an active subscription. Scope, setup, support, taxes, and payment terms are agreed before any pilot.' : 'ይህ የታሰበ ዋጋ ነው፤ አሁን የሚከፈል እቅድ አይደለም። የሙከራ ወሰን፣ ማዋቀር፣ ድጋፍ፣ ግብርና የክፍያ ውሎች ከሙከራው በፊት ይስማማሉ።')}
            </p>
          </div>

          {result?.success ? (
            <div role="status" className="rounded-xl border border-emerald-700/20 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <p className="font-semibold">{isEnglish ? 'Thank you. Your inquiry was sent.' : 'እናመሰግናለን። ጥያቄዎ ተልኳል።'}</p>
              <p className="mt-1">{result.message}</p>
              <button type="button" onClick={closeDialog} className="mt-4 min-h-10 rounded-lg bg-[#8B2635] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7a1f2d]">
                {isEnglish ? 'Done' : 'ጨርስ'}
              </button>
            </div>
          ) : (
            <form onSubmit={submitInquiry} className="space-y-4">
              <label className="block text-xs font-semibold">
                {isEnglish ? 'Your name' : 'ስም'}
                <input required minLength={2} maxLength={80} autoComplete="name" value={fields.name} onChange={(event) => updateField('name', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-coffee-700/20 bg-white px-3 text-sm font-normal outline-none focus:border-[#8B2635] focus:ring-2 focus:ring-[#8B2635]/15 dark:border-white/15 dark:bg-zinc-950" />
              </label>
              <label className="block text-xs font-semibold">
                {isEnglish ? 'Business name' : 'የንግድ ስም'}
                <input required minLength={2} maxLength={120} autoComplete="organization" value={fields.businessName} onChange={(event) => updateField('businessName', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-coffee-700/20 bg-white px-3 text-sm font-normal outline-none focus:border-[#8B2635] focus:ring-2 focus:ring-[#8B2635]/15 dark:border-white/15 dark:bg-zinc-950" />
              </label>
              <label className="block text-xs font-semibold">
                {isEnglish ? 'Phone number or email' : 'ስልክ ቁጥር ወይም ኢሜይል'}
                <input required maxLength={160} autoComplete="email" value={fields.contact} onChange={(event) => updateField('contact', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-coffee-700/20 bg-white px-3 text-sm font-normal outline-none focus:border-[#8B2635] focus:ring-2 focus:ring-[#8B2635]/15 dark:border-white/15 dark:bg-zinc-950" />
              </label>
              <label className="block text-xs font-semibold">
                {isEnglish ? 'What would you like to know? (optional)' : 'ምን ማወቅ ይፈልጋሉ? (አማራጭ)'}
                <textarea maxLength={600} rows={3} value={fields.message} onChange={(event) => updateField('message', event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-coffee-700/20 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#8B2635] focus:ring-2 focus:ring-[#8B2635]/15 dark:border-white/15 dark:bg-zinc-950" />
              </label>

              <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                <label>Website<input tabIndex={-1} autoComplete="off" value={fields.website} onChange={(event) => updateField('website', event.target.value)} /></label>
              </div>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-coffee-600 dark:text-zinc-300">
                <input type="checkbox" required checked={fields.consent} onChange={(event) => updateField('consent', event.target.checked)} className="mt-0.5 accent-[#8B2635]" />
                <span>{isEnglish ? 'I agree that Liyu POS may send these details to its team to respond to my inquiry.' : 'ጥያቄዬን ለመመለስ ሊዩ POS ይህን መረጃ ለቡድኑ እንዲልክ እስማማለሁ።'}</span>
              </label>

              {result && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800 dark:bg-red-950/40 dark:text-red-200">{result.message} <a href="mailto:info@liyupos.com" className="font-semibold underline">info@liyupos.com</a></p>}
              <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#8B2635] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7a1f2d] disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? (isEnglish ? 'Sending…' : 'በመላክ ላይ…') : (isEnglish ? 'Send inquiry' : 'ጥያቄውን ላክ')}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-coffee-400 dark:text-zinc-500">
                {isEnglish ? 'Your details are used to respond to this inquiry. This form does not create an account or start a subscription.' : 'መረጃዎ ለዚህ ጥያቄ ምላሽ ለመስጠት ብቻ ይጠቀማል። ይህ ቅጽ አካውንት አይፈጥርም ወይም ደንበኝነት አይጀምርም።'}
              </p>
            </form>
          )}
        </div>
      </dialog>
    </>
  )
}
