'use client'

import React from 'react'
import { Wifi, ArrowRight, Server } from 'lucide-react'

export function OfflineSection({ lang }: { lang: 'en' | 'am' }) {
  const isEn = lang === 'en'

  return (
    <section className="bg-white dark:bg-zinc-950 border-y border-[#2B1E1A]/10 dark:border-white/10 py-16 lg:py-20 antialiased">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Descriptive Text Column */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-500 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Wifi className="w-3.5 h-3.5 animate-pulse" /> 
            {isEn ? "Built for Local Infrastructure" : "ከሀገር ውስጥ የኔትወርክ ሁኔታ ጋር የተጣጣመ"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight leading-[1.2]">
            {isEn ? "100% Operational Even Without Internet" : "ያለ ኢንተርኔት ሙሉ በሙሉ የሚሰራ ፖስ"}
          </h2>
          <p className="text-coffee-500 dark:text-zinc-400 text-xs sm:text-[13px] sm:text-sm leading-relaxed font-medium">
            {isEn 
              ? "Network drops shouldn't halt your cashiers. Liyu POS stores every bill, recipe calculation, and table change safely directly in your local device storage. Print receipts and process sales effortlessly; everything updates to the cloud automatically the exact moment connection returns."
              : "የኮኔክሽን መቆራረጥ ስራዎን ማስተጓጎል የለበትም። ሊዩ ፖስ እያንዳንዱን ሂሳብ፣ ሽያጭ እና የክምችት መዝገብ በስልኮ ወይም በኮምፒውተርዎ ላይ በጥንቃቄ ያስቀምጣል። ኢንተርኔት ሲመለስ መረጃውን ራሱ በቀጥታ ከደመናው (Cloud) ጋር ያመሳስለዋል።"}
          </p>
        </div>

        {/* Sync Pipeline Visualization Column */}
        <div className="bg-[#F7F4EB]/50 dark:bg-zinc-900 p-6 rounded-2xl border border-[#2B1E1A]/5 dark:border-white/5 space-y-3 max-w-md mx-auto w-full">
          
          {/* Step 1: Offline Trigger */}
          <div className="flex items-center justify-between bg-white dark:bg-zinc-800 p-3 rounded-xl border border-rose-500/20 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <div className="text-xs font-bold text-[#2B1E1A] dark:text-white">{isEn ? "Connection Offline" : "ኢንተርኔት ተቋርጧል"}</div>
            </div>
            <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded">
              Local Storage Active
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-coffee-300 dark:text-zinc-600 rotate-90" />
          </div>

          {/* Step 2: Enabled Local Actions */}
          <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-[#2B1E1A]/5 dark:border-white/5 space-y-3 shadow-sm">
            <div className="text-[10px] font-bold text-coffee-400 dark:text-zinc-500 uppercase tracking-widest">
              {isEn ? "Uninterrupted Local Operations" : "ያለ ማቋረጥ የሚሰሩ ተግባራት"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#2B1E1A]/80 dark:text-zinc-300 font-semibold">
              <div className="bg-[#F7F4EB]/30 dark:bg-zinc-950/40 p-2 rounded flex items-center gap-1.5">
                <span className="text-[#8B2635]">✓</span> {isEn ? "Process Sales" : "ሽያጭ መመዝገብ"}
              </div>
              <div className="bg-[#F7F4EB]/30 dark:bg-zinc-950/40 p-2 rounded flex items-center gap-1.5">
                <span className="text-[#8B2635]">✓</span> {isEn ? "Kitchen Tickets" : "ትዕዛዝ ማተም"}
              </div>
              <div className="bg-[#F7F4EB]/30 dark:bg-zinc-950/40 p-2 rounded flex items-center gap-1.5">
                <span className="text-[#8B2635]">✓</span> {isEn ? "Track Debts" : "ዕዳ መመዝገብ"}
              </div>
              <div className="bg-[#F7F4EB]/30 dark:bg-zinc-950/40 p-2 rounded flex items-center gap-1.5">
                <span className="text-[#8B2635]">✓</span> {isEn ? "Shift Closures" : "ፈረቃ መዝጋት"}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-coffee-300 dark:text-zinc-600 rotate-90" />
          </div>

          {/* Step 3: Cloud Auto Sync Resolution */}
          <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Server className="w-4 h-4" />
              <span className="text-xs font-bold">{isEn ? "Auto-Sync Completed" : "ማመሳሰል ተጠናቋል"}</span>
            </div>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Cloud Secure
            </span>
          </div>
          
        </div>
      </div>
    </section>
  )
}