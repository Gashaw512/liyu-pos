'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

const PLANS = (lang: 'en' | 'am') => [
  {
    name: 'Starter',
    nameAm: 'ጀማሪ',
    price: '0',
    period: lang === 'en' ? 'Free forever' : 'ለዘላለም ነፃ',
    desc: lang === 'en' ? 'Perfect for a single bar, cafe, or kiosk getting started.' : 'አንድ ሱቅ ወይም ጠጅ ቤት ለሚጀምሩ ተስማሚ የሆኔ።',
    highlight: false,
    href: { pathname: '/register', query: { plan: 'starter' } },
    cta: lang === 'en' ? 'Get Started Free' : 'በነፃ ይጀምሩ',
    features: lang === 'en' ? [
      '1 staff account',
      'Up to 50 unique products',
      'Offline sales & stock logs',
      'Daily profit summary dashboard',
      'Cash payment tracking'
    ] : [
      '1 የሰራተኛ አካውንት',
      'እስከ 50 የሚደርሱ ዕቃዎች',
      'ከመስመር ውጭ መሸጥና መቁጠር',
      'ዕለታዊ የትርፍ ማጠቃለያ',
      'በጥሬ ገንዘብ የሚደረጉ ሽያጮች'
    ],
  },
  {
    name: 'Business',
    nameAm: 'ቢዝነስ',
    price: '999',
    period: lang === 'en' ? 'per month' : 'በወር',
    desc: lang === 'en' ? 'Full framework for active bars, cafes, and shops.' : 'ለተጠናከሩ ሱቆች፣ ምግብ ቤቶች እና ንቁ ንግዶች የተሟላ።',
    highlight: true,
    href: { pathname: '/register', query: { plan: 'business' } },
    cta: lang === 'en' ? 'Start 14-Day Free Trial' : 'የ14 ቀን ነፃ ሙከራ ይጀምሩ',
    features: lang === 'en' ? [
      'Up to 5 staff accounts',
      'Unlimited products & stock',
      'Telebirr & CBE Birr channels',
      'Shift handovers & automated audits',
      'Loss & stock variance alerts',
      'Telegram real-time reports'
    ] : [
      'እስከ 5 የሰራተኛ አካውንቶች',
      'ወሰን የሌለው የዕቃ ምዝገባ',
      'የቴሌብር እና ሲቢኢ ብር ክፍያዎች',
      'የፈረቃ ርክክብ እና ሪፖርቶች',
      'የጉድለት እና ስርቆት ማሳወቂያዎች',
      'ሪፖርቶችን በቴሌግራም መላኪያ'
    ],
  },
]

export function Pricing({ lang }: { lang: 'en' | 'am' }) {
  const plans = PLANS(lang)

  return (
    <section id="pricing" className="max-w-5xl mx-auto px-4 sm:px-6 py-20 antialiased">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight">
          {lang === 'en' ? 'Simple, honest pricing' : 'ግልጽ እና ተመጣጣኝ ዋጋ'}
        </h2>
        <p className="text-coffee-500 dark:text-zinc-400 mt-3 text-sm font-medium">
          {lang === 'en' ? 'No hidden fees. No installation setup cost. Cancel anytime.' : 'ምንም ድብቅ ክፍያ የለም። ያለምንም ተጨማሪ ወጪ በማንኛውም ጊዜ ማቋረጥ የሚችሉት።'}
        </p>
      </div>

      {/* ─── Pure Horizontal Flex Layout System ────────────────────── */}
      {/* Replaced fixed grid with horizontal inline flex wrap system */}
      <div className="flex flex-row flex-wrap gap-8 max-w-3xl mx-auto items-stretch justify-center w-full">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-300
              flex-1 min-w-[280px] max-w-full md:max-w-[calc(50%-16px)]
              ${plan.highlight
                ? 'bg-white dark:bg-zinc-900 border-2 border-[#8B2635] shadow-xl md:-translate-y-1'
                : 'bg-white dark:bg-zinc-900 border border-coffee-700/10 dark:border-white/10 shadow-sm hover:shadow-md'
              }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8B2635] text-white
                              text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                {lang === 'en' ? 'Most Popular' : 'ይመረጣል'}
              </div>
            )}

            <div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-serif font-bold text-xl text-[#2B1E1A] dark:text-white">{plan.name}</span>
                  <span className="text-coffee-300 dark:text-zinc-500 text-xs font-semibold ml-2">/ {plan.nameAm}</span>
                </div>
              </div>
              <p className="text-xs text-coffee-500 dark:text-zinc-400 mt-2 font-medium leading-relaxed">{plan.desc}</p>
              
              <div className="mt-5 flex items-baseline gap-1 border-b border-coffee-700/5 dark:border-white/5 pb-4">
                <span className="text-4xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight">{plan.price}</span>
                <span className="text-xs font-bold text-coffee-400 dark:text-zinc-500 uppercase tracking-wider">ETB / {plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-xs sm:text-[13px] text-coffee-500 dark:text-zinc-300 font-medium">
                    <CheckCircle className={`w-4 h-4 shrink-0 stroke-[2.5] ${plan.highlight ? 'text-[#8B2635]' : 'text-amber-500'}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={plan.href}
              className={`mt-8 block text-center py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors duration-200
                ${plan.highlight
                  ? 'bg-[#8B2635] hover:bg-[#8B2635]/90 text-white shadow-md'
                  : 'border border-coffee-700/15 dark:border-white/20 hover:bg-[#F7F4EB]/50 dark:hover:bg-zinc-800 text-[#2B1E1A] dark:text-white'
                }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] sm:text-xs text-coffee-400 dark:text-zinc-500 mt-8 font-medium">
        {lang === 'en' 
          ? 'All configurations feature complete offline architectures, full Amharic localizations, and instant background engine updates.' 
          : 'ሁሉም ምርጫዎች ከመስመር ውጭ መስራትን፣ የአማርኛ ገጽን እና ወቅታዊ ማሻሻያዎችን ያካትታሉ።'}
      </p>
    </section>
  )
}