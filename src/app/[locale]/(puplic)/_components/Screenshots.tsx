'use client'

import React from 'react'

export function Screenshots({ lang }: { lang: 'en' | 'am' }) {
  const isEn = lang === 'en'

  const views = [
    { name: isEn ? "Owner Dashboard" : "የባለቤት ዋና ገጽ", color: "bg-[#8B2635]/5 border-[#8B2635]/20" },
    { name: isEn ? "Inventory Matrix" : "የዕቃ ክምችት መቆጣጠሪያ", color: "bg-amber-500/5 border-amber-500/20" },
    { name: isEn ? "Sales Register Terminal" : "የመሸጫ ማያ ገጽ", color: "bg-[#2B1E1A]/5 border-[#2B1E1A]/20" }
  ]

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center space-y-8 antialiased">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight">
          {isEn ? "See Liyu POS In Action" : "የሊዩ ፖስ ማሳያዎችን ይመልከቱ"}
        </h2>
        <p className="text-coffee-500 dark:text-zinc-400 mt-2.5 text-xs sm:text-sm font-medium">
          {isEn ? "Simulated layout wireframes across active mobile application states." : "በስልክ ላይ እንዴት እንደሚሰራ የሚያሳይ የቀጥታ በይነገጽ ማሳያ።"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {views.map((v, i) => (
          <div 
            key={i} 
            className={`aspect-video rounded-2xl border flex flex-col items-center justify-center p-6 shadow-sm transition-all duration-300 hover:shadow-md ${v.color}`}
          >
            <span className="text-xs sm:text-sm font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight">{v.name}</span>
            <span className="text-[10px] text-coffee-400 dark:text-zinc-500 mt-1.5 font-mono uppercase tracking-wider">[Live App UI Preview]</span>
          </div>
        ))}
      </div>
    </section>
  )
}