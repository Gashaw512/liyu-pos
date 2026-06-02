'use client'

import React from 'react'
import { Beer, Utensils, Store, ArrowUpRight } from 'lucide-react'

interface SegmentsProps {
  lang: 'en' | 'am'
}

export function Segments({ lang }: SegmentsProps) {
  const SEGMENTS = [
    {
      icon: Beer,
      label: lang === 'en' ? 'Bars & Tej Bets' : 'ባሮች እና ጠጅ ቤቶች',
      desc: lang === 'en' 
        ? 'Crate-to-bottle tracking, shift handovers, and missing stock alerts built for local bar workflows.'
        : 'የክሬት እና የጠርሙስ ቁጥጥር፣ የፈረቃ ርክክብ እና የጠፉ ዕቃዎች መቆጣጠሪያ መዝገብ።',
      modules: lang === 'en' ? ['POS Ledger', 'Delala Staff'] : ['የሽያጭ መዝገብ', 'የደላላ ቅጥር'],
      accent: 'hover:border-[#8B2635]/30',
      iconBg: 'bg-[#8B2635]/10 text-[#8B2635]',
    },
    {
      icon: Utensils,
      label: lang === 'en' ? 'Restaurants & Cafes' : 'ሬስቶራንቶች እና ካፌዎች',
      desc: lang === 'en'
        ? 'Live table ticket updates, menu ingredient costs, and instant order routing from tibs to coffee.'
        : 'የቀጥታ ጠረጴዛ ትዕዛዝ፣ የምግብ ዝግጅት ወጪ ቁጥጥር እና ፈጣን የቦኖ ዝውውር።',
      modules: lang === 'en' ? ['POS Ledger', 'Liyu Bono KDS'] : ['የሽያጭ መዝገብ', 'ሊዩ ቦኖ'],
      accent: 'hover:border-[#E2A03F]/40',
      iconBg: 'bg-[#E2A03F]/10 text-[#E2A03F]',
    },
    {
      icon: Store,
      label: lang === 'en' ? 'Kiosks & Mini-Markets' : 'ኪዮስኮች እና ሚኒ-ማርኬቶች',
      desc: lang === 'en'
        ? 'Barcode-ready inventory matrix, low stock notifications, and rapid high-volume checkouts.'
        : 'ለባርኮድ የተዘጋጀ የዕቃ ክምችት ቁጥጥር፣ የአነስተኛ ክምችት ማሳወቂያ እና ፈጣን ክፍያ።',
      modules: lang === 'en' ? ['POS Ledger', 'Fast Checkout'] : ['የሽያጭ መዝገብ', 'ፈጣን ክፍያ'],
      accent: 'hover:border-coffee-500/30',
      iconBg: 'bg-coffee-700/5 text-coffee-600',
    },
  ]

  return (
    <section className="w-full bg-[#F7F4EB]/50 border-b border-coffee-700/5 py-16 lg:py-20 antialiased">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Component Header Metadata Block */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-1.5 bg-[#8B2635]/5 text-[#8B2635] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            {lang === 'en' ? 'Super-App Modules' : 'የመተግበሪያው አካላት'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-coffee-700 tracking-tight leading-[1.2]">
            {lang === 'en' 
              ? 'One framework built for your specific shift' 
              : 'ለእርስዎ የስራ ዘርፍ ተስማሚ ተደርጎ የተዘጋጀ'}
          </h2>
        </div>

        {/* ─── Pure Horizontal Flex Layout System ────────────────────── */}
        {/* Swapped regular grid to a responsive inline flex wrap engine */}
        <div className="flex flex-row flex-wrap gap-6 items-stretch justify-start w-full">
          {SEGMENTS.map((segment, index) => {
            const IconComponent = segment.icon
            return (
              <div 
                key={index} 
                className={`group bg-white p-6 sm:p-8 rounded-2xl border border-coffee-700/10 
                           shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all 
                           duration-300 ease-out flex flex-col justify-between cursor-pointer 
                           flex-1 min-w-[280px] max-w-full md:max-w-[calc(50%-12px)] lg:max-w-[calc(33.333%-16px)] ${segment.accent}`}
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    {/* Fluid Adaptive Icon Framework Container */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 
                                   transition-all duration-300 group-hover:scale-110 shadow-sm ${segment.iconBg}`}>
                      <IconComponent className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    
                    {/* Text Information Blocks */}
                    <div className="mt-5">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-coffee-700 tracking-tight">
                        {segment.label}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-coffee-500/90 mt-2 leading-relaxed font-medium">
                        {segment.desc}
                      </p>
                    </div>

                    {/* Engine Badges */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {segment.modules.map((mod, mIdx) => (
                        <span 
                          key={mIdx}
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-coffee-700/5 text-coffee-500 rounded"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contextual Intuitive Action Indicator */}
                  <div className="mt-6 pt-4 border-t border-coffee-700/5 flex items-center justify-between text-xs font-bold text-coffee-300 group-hover:text-coffee-600 transition-colors">
                    <span>{lang === 'en' ? 'Explore Framework' : 'ባህሪያትን ተመልከት'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}