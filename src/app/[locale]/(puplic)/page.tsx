'use client'

import React, { useState } from 'react'
import { Navbar } from './_components/Navbar'
import { Hero } from './_components/Hero'
import { Segments } from './_components/Segments'
import { Problems } from './_components/Problems'
import { Features } from './_components/Features'
import { OfflineSection } from './_components/OfflineSection'
import { DeepFeatures } from './_components/DeepFeatures'
import { CreditNotebook } from './_components/CreditNotebook'
import { TelegramReports } from './_components/TelegramReports'
import { Screenshots } from './_components/Screenshots'
import { Pricing } from './_components/Pricing'
import { FAQ } from './_components/FAQ'
import { Footer } from './_components/Footer'

// Simple toggle example for i18n support
export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'am'>('en')

  return (
    <div className="min-h-screen bg-cream-100 text-coffee-700 font-sans antialiased selection:bg-berbere-100 selection:text-berbere-900">
      <Navbar lang={lang} setLang={setLang} />
      
      <main className="overflow-x-hidden">
        <Hero lang={lang} />
        <Segments lang={lang} />
        <Problems lang={lang} />
        <Features lang={lang} />
        
        {/* The 3 Core Local Value Differentiators */}
        <OfflineSection lang={lang} />
        <CreditNotebook lang={lang} />
        <TelegramReports lang={lang} />
        
        <DeepFeatures lang={lang} />
        <Screenshots lang={lang} />
        <Pricing lang={lang} />
        <FAQ lang={lang} />
      </main>

      <Footer lang={lang} />
    </div>
  )
}