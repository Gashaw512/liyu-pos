'use client'

import React from 'react'
import { WifiOff, Languages, Shield, AlertTriangle, BarChart3, Zap } from 'lucide-react'

const FEATURES = (lang: 'en' | 'am') => [
  {
    icon: WifiOff,
    color: 'text-[#8B2635]',
    bg: 'bg-[#8B2635]/8',
    title: lang === 'en' ? '100% Offline First' : 'ሙሉ በሙሉ ከመስመር ውጭ',
    desc: lang === 'en' 
      ? 'Transactions save instantly to your local database. When network returns, everything updates automatically.'
      : 'እያንዳንዱ ግብይት በስልክዎ ላይ ወዲያውኑ ይቀመጣል። ኢንተርኔት ቢቋረጥ እንኳ ስራ ሳይበላሽ በኋላ ላይ በራሱ ያመሳስላል።',
  },
  {
    icon: Languages,
    color: 'text-[#E2A03F]',
    bg: 'bg-[#E2A03F]/10',
    title: lang === 'en' ? 'Amharic & English Native' : 'አማርኛ እና እንግሊዘኛ',
    desc: lang === 'en' 
      ? 'Every screen is custom-built in native Amharic and English. Optimized for cashiers and store owners.'
      : 'እያንዳንዱ መተግበሪያ ገጽ በአማርኛ እና በእንግሊዘኛ የተዘጋጀ። ለአስተናጋጆች፣ ለካሺየሮች እና ለነጋዴዎች በቀላሉ የሚረዳ።',
  },
  {
    icon: AlertTriangle,
    color: 'text-rose-600',
    bg: 'bg-rose-500/8',
    title: lang === 'en' ? 'Loss & Theft Detection' : 'የጉድለት እና ስርቆት ቁጥጥር',
    desc: lang === 'en' 
      ? 'Get instant discrepancy alerts at shift handovers. Know missing bottle metrics with absolute birr values.'
      : 'በፈረቃ ርክክብ ወቅት የጎደሉ ዕቃዎች ወይም የገንዘብ ጉድለቶች ካሉ ትክክለኛው የብር መጠን ወዲያውኑ ያሳውቃል።',
  },
  {
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/8',
    title: lang === 'en' ? 'Instant Profit Reports' : 'የዕለት ተዕለት የትርፍ ሪፖርት',
    desc: lang === 'en' 
      ? 'Track daily revenue, operating costs, exact net profit, and register cash balances with zero setup.'
      : 'የዕለት ሽያጭ፣ ወጪ፣ የተጣራ ትርፍ እና የጥሬ ገንዘብ ክምችት ልዩነቶችን ያለምንም ድካምና ስሌት በቀላሉ ይመልከቱ።',
  },
  {
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-500/8',
    title: lang === 'en' ? 'Role-Based Access' : 'የሰራተኞች የስልጣን ገደብ',
    desc: lang === 'en' 
      ? 'Owners oversee all nodes. Cashiers operate active shifts. Clerks manage stock layers securely.'
      : 'ባለቤቱ ሁሉንም ቅርንጫፎች ሲቆጣጠር፣ ካሽየሩ የተፈቀደለትን ፈረቃ ብቻ ያያል። ሰራተኞች ያለፍቃድ መረጃ ማየት አይችሉም።',
  },
  {
    icon: Zap,
    color: 'text-violet-600',
    bg: 'bg-violet-500/8',
    title: lang === 'en' ? 'Local Split Payments' : 'የሀገር ውስጥ ክፍያ አማራጮች',
    desc: lang === 'en' 
      ? 'Track Cash, Telebirr, CBE Birr, and bank transfers separately with multi-method payment splits.'
      : 'ጥሬ ገንዘብ፣ ቴሌብር፣ ሲቢኢ ብር እና የባንክ ዝውውሮችን በተናጠል ወይም በአንድ ላይ አቀናጅቶ ማስተናገጃ።',
  },
]

export function Features({ lang }: { lang: 'en' | 'am' }) {
  const features = FEATURES(lang)

  return (
    <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 antialiased">
      
      {/* ─── Google-Standard Minimal Header ────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
        <div className="inline-flex items-center gap-1.5 bg-[#8B2635]/5 dark:bg-[#8B2635]/10 text-[#8B2635] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-4">
          {lang === 'en' ? 'Engine Capabilities' : 'የሲስተሙ አቅም'}
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2B1E1A] dark:text-white tracking-tight leading-tight">
          {lang === 'en' ? (
            <>Everything you need. <span className="text-[#8B2635]">Nothing you don’t.</span></>
          ) : (
            <>ለስራዎ የሚያስፈልጉ ዘመናዊ መፍትሄዎች <span className="text-[#8B2635]">በአንድ ላይ።</span></>
          )}
        </h2>
        <p className="text-coffee-500 dark:text-zinc-400 mt-3 text-xs sm:text-sm max-w-xl mx-auto font-medium leading-relaxed">
          {lang === 'en' 
            ? 'Engineered precisely for how local restaurants, bars, and retail shops execute daily business operations.'
            : 'የሀገር ውስጥ ምግብ ቤቶች፣ ካፌዎች፣ ባሮች እና ሱቆች በትክክል በሚሰሩበት መንገድ ተቃኝቶ የተሰራ።'}
        </p>
      </div>

      {/* ─── Pure Horizontal Adaptive Layout Engine ─────────────────── */}
      {/* Uses flex-row and flex-wrap so elements sit horizontally on all viewports and stack dynamically only when compressed */}
      <div className="flex flex-row flex-wrap gap-5 w-full items-stretch justify-start">
        {features.map((f) => {
          const IconComponent = f.icon
          return (
            <div
              key={f.title}
              className="group bg-white dark:bg-zinc-900/40 rounded-xl border border-coffee-700/10 dark:border-white/5 p-5
                         hover:border-[#8B2635]/20 dark:hover:border-[#8B2635]/30 hover:bg-[#F7F4EB]/20 dark:hover:bg-zinc-900 
                         hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out 
                         flex flex-col justify-between flex-1 min-w-[280px] max-w-full md:max-w-[calc(50%-10px)] lg:max-w-[calc(33.333%-14px)]"
            >
              <div className="flex items-start gap-4">
                {/* Fixed Structural Icon Box */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                               transition-all duration-300 group-hover:scale-110 shadow-sm ${f.bg}`}>
                  <IconComponent className="w-4.5 h-4.5 stroke-[2.2] f.color" />
                </div>
                
                {/* Feature Information Body */}
                <div className="space-y-1.5">
                  <h3 className="font-serif font-bold text-[15px] text-[#2B1E1A] dark:text-white tracking-tight 
                                 group-hover:text-[#8B2635] dark:group-hover:text-white transition-colors duration-200">
                    {f.title}
                  </h3>
                  <p className="text-xs text-coffee-500/90 dark:text-zinc-400 leading-relaxed font-medium">
                    {f.desc}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}