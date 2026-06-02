'use client'

import React from 'react'
import { Store, Utensils, CheckCircle2 } from 'lucide-react'

export function DeepFeatures({ lang }: { lang: 'en' | 'am' }) {
  const isEn = lang === 'en'
  const t = (en: string, am: string) => isEn ? en : am

  return (
    <section id="framework-deep-dive" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24 space-y-12 antialiased">
      
      {/* ─── Header Stack ─────────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 bg-[#8B2635]/5 dark:bg-[#8B2635]/10 text-[#8B2635] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          {t('Industry Frameworks', 'የዘርፍ ልዩ ሞጁሎች')}
        </div>
        <h2 className="text-3xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight sm:text-4xl">
          {t('Built for the unique workflows of your industry', 'ለስራዎ የተለየ መፍትሄ የሚሰጡ ሞጁሎች')}
        </h2>
      </div>

      {/* ─── Pure Horizontal Flex Layout System ────────────────────── */}
      {/* Converted grid to flex-row and flex-wrap for an elegant inline layout that scales smoothly on mobile */}
      <div className="flex flex-row flex-wrap gap-6 lg:gap-8 items-stretch w-full justify-start">
        
        {/* Restaurant & Cafe Module Blueprint */}
        <div className="group bg-white dark:bg-zinc-900/40 border border-coffee-700/10 dark:border-white/5 p-6 sm:p-8 rounded-2xl shadow-sm 
                        hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out flex flex-col justify-between
                        flex-1 min-w-[280px] max-w-full md:max-w-[calc(50%-12px)] lg:max-w-[calc(50%-16px)]">
          <div>
            <div className="flex items-center gap-3 text-[#8B2635] font-serif font-bold text-xl border-b border-coffee-700/5 dark:border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#8B2635]/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Utensils className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span>{t('For Restaurants & Cafes', 'ለሬስቶራንት እና ካፌዎች')}</span>
            </div>
            
            <ul className="mt-5 space-y-3.5 text-xs sm:text-[13px] text-coffee-500/90 dark:text-zinc-400 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#8B2635] shrink-0 mt-0.5" />
                <span>{t('Recipe raw stock deductions', 'የምግብ አሰራር ጥሬ እቃ ክምችት ቁጥጥር')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#8B2635] shrink-0 mt-0.5" />
                <span>{t('Liyu Bono KDS routing', 'የሊዩ ቦኖ ኩሽና ማሳያ (KDS) ዝውውር')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#8B2635] shrink-0 mt-0.5" />
                <span>{t('Dynamic table layout tracking', 'የጠረጴዛዎች የቀጥታ ሁኔታ መቆጣጠሪያ')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#8B2635] shrink-0 mt-0.5" />
                <span>{t('Waiter shift & tip tracking', 'የአስተናጋጆች ፈረቃ እና ቲፕ ምዝገባ')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Retail & Shop Module Blueprint */}
        <div className="group bg-white dark:bg-zinc-900/40 border border-coffee-700/10 dark:border-white/5 p-6 sm:p-8 rounded-2xl shadow-sm 
                        hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out flex flex-col justify-between
                        flex-1 min-w-[280px] max-w-full md:max-w-[calc(50%-12px)] lg:max-w-[calc(50%-16px)]">
          <div>
            <div className="flex items-center gap-3 text-[#E2A03F] font-serif font-bold text-xl border-b border-coffee-700/5 dark:border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#E2A03F]/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Store className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span>{t('For Shops & Mini Markets', 'ለሱቆች እና ሚኒ ማርኬቶች')}</span>
            </div>
            
            <ul className="mt-5 space-y-3.5 text-xs sm:text-[13px] text-coffee-500/90 dark:text-zinc-400 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#E2A03F] shrink-0 mt-0.5" />
                <span>{t('Rapid camera barcode engine', 'ፈጣን የካሜራ ባርኮድ መቃኛ')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#E2A03F] shrink-0 mt-0.5" />
                <span>{t('Supplier batch ledger control', 'የአቅራቢዎች ባች ክምችት መዝገብ')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#E2A03F] shrink-0 mt-0.5" />
                <span>{t('Low stock push notifications', 'የእቃ ክምችት ማነስ ማስጠንቀቂያ')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#E2A03F] shrink-0 mt-0.5" />
                <span>{t('Wholesale vs retail lookups', 'የጅምላ እና የችርቻሮ መለያ ቁጥጥር')}</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </section>
  )
}