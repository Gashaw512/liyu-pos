'use client'

import React from 'react'

interface HowItWorksProps {
  lang: 'en' | 'am'
}

const GET_STEPS = (lang: 'en' | 'am') => [
  { 
    step: '1', 
    title: lang === 'en' ? 'Create your account' : 'አካውንት ይክፈቱ', 
    desc: lang === 'en' 
      ? 'Register your business with your local phone number. Takes under 2 minutes.' 
      : 'በ2 ደቂቃ ውስጥ የስልክ ቁጥርዎን በመጠቀም ንግድዎን ይመዝግቡ።' 
  },
  { 
    step: '2', 
    title: lang === 'en' ? 'Add your inventory' : 'እቃዎችን ያስገቡ', 
    desc: lang === 'en' 
      ? 'Enter your food items, beers, or kiosk products with explicit cost and sell prices.' 
      : 'የሚሸጡትን ምግቦች፣ መጠጦች ወይም ልዩ ልዩ ዕቃዎች ከነመግዣና መሸጫ ዋጋቸው ያስገቡ።' 
  },
  { 
    step: '3', 
    title: lang === 'en' ? 'Open your shift' : 'ፈረቃ ይክፈቱና ይሽጡ', 
    desc: lang === 'en' 
      ? 'Tap items to sell. Track split-payments and monitor your real-time net profit.' 
      : 'ፈረቃ በመክፈት መሸጥ ይጀምሩ። የተጣራ ትርፍዎን መተግበሪያው በራሱ ያሰላል።' 
  },
]

export function HowItWorks({ lang }: HowItWorksProps) {
  const steps = GET_STEPS(lang)

  return (
    <section className="bg-[#8B2635] py-16 lg:py-20 px-4 sm:px-6 antialiased relative overflow-hidden">
      {/* Background Micro-Decoration Layers */}
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        
        {/* Component Title Elements */}
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
          {lang === 'en' ? 'Up and running in under 10 minutes' : 'በ10 ደቂቃ ውስጥ ስራ ይጀምሩ'}
        </h2>
        <p className="text-white/80 mt-3 text-sm sm:text-base max-w-xl mx-auto font-medium">
          {lang === 'en' 
            ? 'No play store registration. No installation barriers. Open your browser, add to home screen, and start.'
            : 'ምንም አይነት መተግበሪያ ማውረድ አያስፈልግም። በስልክዎ ክሮም (Chrome) ላይ ከፍተው ወደ ስክሪንዎ በመጨመር መጠቀም ይጀምሩ።'}
        </p>

        {/* Responsive Connected Process Steps Block */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12 lg:mt-16 text-left">
          {steps.map((s, idx) => (
            <div 
              key={s.step} 
              className={`group flex flex-col justify-between p-6 bg-white/5 rounded-2xl border border-white/10
                         hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-0.5
                         ${idx !== 2 ? 'sm:border-r sm:border-white/10' : ''}`}
            >
              <div>
                {/* Numeric Step Ring Indicator */}
                <div className="w-9 h-9 rounded-full bg-amber-500 text-[#2B1E1A] font-bold text-sm 
                                flex items-center justify-center mb-5 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  {s.step}
                </div>
                
                {/* Main Content Info Layout */}
                <h3 className="font-serif font-bold text-base sm:text-lg text-white tracking-tight">
                  {s.title}
                </h3>
                <p className="text-white/70 text-xs sm:text-[13px] mt-2.5 leading-relaxed font-medium">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  )
}