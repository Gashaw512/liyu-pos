'use client'

import { useId, useState } from 'react'

interface PlanInquiryActionProps {
  planName: string
  price: string
  lang: 'en' | 'am'
  className: string
}

export function PlanInquiryAction({ planName, price, lang, className }: PlanInquiryActionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const panelId = useId()
  const isEnglish = lang === 'en'
  const isDemo = price.toLowerCase().includes('no charge') || price.includes('ክፍያ የለም')
  const subject = isEnglish
    ? `Liyu POS pilot enquiry: ${planName}`
    : `የሊዩ POS የሙከራ ጥያቄ፦ ${planName}`
  const message = isEnglish
    ? `Hello, I would like to discuss the ${planName} option (${price}). Please share the proposed pilot scope and terms.`
    : `ሰላም፣ ስለ ${planName} አማራጭ (${price}) መወያየት እፈልጋለሁ። የታሰበውን የሙከራ ወሰንና ውሎች ያጋሩኝ።`

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('info@liyupos.com')
      setCopyStatus(isEnglish ? 'Email address copied.' : 'የኢሜይል አድራሻው ተቀድቷል።')
    } catch {
      setCopyStatus(isEnglish
        ? 'Copy was unavailable. Select the email address above and copy it.'
        : 'መቅዳት አልተቻለም። ከላይ ያለውን ኢሜይል መርጠው ይቅዱ።')
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setIsOpen((open) => !open)
          setCopyStatus('')
        }}
        className={`${className} w-full`}
      >
        {isEnglish ? (isOpen ? 'Close inquiry details' : 'Ask about this plan') : (isOpen ? 'ዝርዝሩን ዝጋ' : 'ስለዚህ እቅድ ይጠይቁ')}
      </button>

      <div
          hidden={!isOpen}
          id={panelId}
          className="mt-3 rounded-xl border border-coffee-700/10 dark:border-white/10 bg-[#F7F4EB] dark:bg-zinc-800 p-4 text-left"
        >
          <p className="text-xs leading-relaxed text-coffee-700 dark:text-zinc-200">
            {isDemo
              ? (isEnglish
                ? 'Request a guided product walkthrough using sample data. It does not create an account or use your business records.'
                : 'በሙከራ መረጃ የሚደረግ የምርት ማብራሪያ ይጠይቁ። ይህ አካውንት አይፈጥርም ወይም የንግድዎን መዝገብ አይጠቀምም።')
              : (isEnglish
                ? 'This is a proposed price, not an active subscription. Contact us to agree the outlet coverage, included services, setup, support, taxes, and payment terms in writing. Nothing is purchased or charged here.'
                : 'ይህ የታሰበ ዋጋ ነው፤ አሁን የሚከፈል የደንበኝነት እቅድ አይደለም። የቦታ ሽፋን፣ የሚካተቱ አገልግሎቶች፣ ማዋቀር፣ ድጋፍ፣ ግብርና የክፍያ ውሎች በጽሁፍ ለመስማማት ያግኙን። እዚህ ምንም አይገዙም ወይም አይከፍሉም።')}
          </p>
          <p className="mt-3 text-xs font-semibold text-[#2B1E1A] dark:text-white">
            {isEnglish ? 'Email' : 'ኢሜይል'}: <span className="select-all">info@liyupos.com</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:info@liyupos.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#8B2635] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1f2d]"
            >
              {isEnglish ? 'Open email app' : 'የኢሜይል መተግበሪያ ክፈት'}
            </a>
            <button
              type="button"
              onClick={copyEmail}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-coffee-700/20 dark:border-white/20 px-3 py-2 text-xs font-semibold text-[#2B1E1A] dark:text-white hover:bg-white/70 dark:hover:bg-zinc-700"
            >
              {isEnglish ? 'Copy email address' : 'ኢሜይሉን ቅዳ'}
            </button>
          </div>
          {copyStatus && <p role="status" className="mt-2 text-xs text-coffee-600 dark:text-zinc-300">{copyStatus}</p>}
      </div>
    </div>
  )
}
