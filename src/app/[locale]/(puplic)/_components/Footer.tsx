'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Mail, Phone, MapPin } from 'lucide-react'
import { Route } from 'next'

interface FooterProps {
  lang: 'en' | 'am'
}

export function Footer({ lang }: { lang: 'en' | 'am' }) {
  const t = (en: string, am: string) => lang === 'am' ? am : en

  return (
    <>
      {/* ─── High-Conversion Pre-Footer CTA Banner ─────────────────── */}
      <section className="border-t border-coffee-700/10 bg-white py-16 px-4 sm:px-6 text-center relative overflow-hidden">
        {/* Soft elegant background brand accent glow */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E2A03F]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-coffee-700 max-w-2xl mx-auto leading-[1.2]">
            {t('Start tracking your business properly — today', 'የንግድዎን ሽያጭ እና ትርፍ ዛሬውኑ በትክክል መቆጣጠር ይጀምሩ')}
          </h2>
          <p className="text-coffee-500 mt-4 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            {t(
              'Free to start. No credit card required. Just open your phone browser, log in, and elevate your operations.',
              'ለመጀመር ሙሉ በሙሉ ነፃ። ምንም አይነት የባንክ ካርድ አያስፈልግም። በስልክዎ ብቻ በመግባት ስራዎን ያቀላጥፉ።'
            )}
          </p>

          <div className="mt-8">
            <Link
              href={`/${lang}/register`}
              className="inline-flex items-center gap-2 bg-[#8B2635] hover:bg-[#77202d]
                         text-white font-semibold px-8 py-4 rounded-xl shadow-md
                         hover:shadow-xl transition-all duration-200 text-sm sm:text-base group active:scale-[0.98]"
            >
              {t('Create Free Account', 'በነፃ አካውንት ይክፈቱ')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-coffee-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> 
              {t('No credit card needed', 'ካርድ አያስፈልግም')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> 
              {t('Works 100% offline', 'ያለ በይነመረብ (Offline) ይሰራል')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> 
              {t('Full Amharic support', 'ሙሉ የአማርኛ ድጋፍ አለው')}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Main Structural Base Footer ───────────────────────────── */}
      <footer className="border-t border-coffee-700/10 bg-coffee-700 pt-16 pb-8 px-4 sm:px-6 lg:px-8 text-cream-100 antialiased">
        {/* Changed grid to a horizontal flex layout with wrapping for optimal responsive look */}
        <div className="max-w-6xl mx-auto flex flex-row flex-wrap justify-between gap-x-8 gap-y-10 pb-12 border-b border-cream-100/10 text-left">
          
          {/* Brand/Bio Column */}
          <div className="space-y-4 min-w-[200px] max-w-xs flex-1">
            <div className="font-serif font-bold text-2xl tracking-tight">
              ሊዩ <span className="text-[#E2A03F]">POS</span>
            </div>
            <p className="text-xs text-cream-100/60 leading-relaxed">
              {t(
                'The beautiful, modern offline POS platform built specifically for bars, restaurants, and retail in Ethiopia.',
                'በኢትዮጵያ ላሉ ባሮች፣ ሬስቶራንቶች እና ኪዮስኮች ተብሎ የተሰራ ውብ እና ዘመናዊ የሽያጭ መቆጣጠሪያ ሲስተም።'
              )}
            </p>
          </div>

          {/* Product Links Column */}
          <div className="space-y-3 min-w-[100px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#E2A03F]">
              {t('Platform', 'ሲስተም')}
            </h4>
            <ul className="space-y-2 text-xs text-cream-100/70">
              <li><a href="#features" className="hover:text-white hover:underline transition-colors">{t('Features', 'ባህሪያት')}</a></li>
              <li><a href="#pricing" className="hover:text-white hover:underline transition-colors">{t('Pricing', 'ዋጋ')}</a></li>
              <li><a href="#faq" className="hover:text-white hover:underline transition-colors">{t('FAQs', 'ጥያቄዎች')}</a></li>
            </ul>
          </div>

          {/* Security/Trust Links Column */}
          <div className="space-y-3 min-w-[120px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#E2A03F]">
              {t('Legal', 'ህጋዊ')}
            </h4>
            <ul className="space-y-2 text-xs text-cream-100/70">
              <li><Link href={`/${lang}/privacy` as Route} className="hover:text-white hover:underline transition-colors">{t('Privacy Policy', 'የግላዊነት ፖሊሲ')}</Link></li>
              <li><Link href={`/${lang}/terms` as Route} className="hover:text-white hover:underline transition-colors">{t('Terms of Service', 'የአጠቃቀም ውሎች')}</Link></li>
            </ul>
          </div>

          {/* Contact/Location Column */}
          <div className="space-y-3 min-w-[200px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#E2A03F]">
              {t('Contact', 'ግንኙነት')}
            </h4>
            <ul className="space-y-2.5 text-xs text-cream-100/70">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#E2A03F] shrink-0" />
                <span>+251 900 00 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#E2A03F] shrink-0" />
                <span>info@liyupos.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#E2A03F] shrink-0" />
                <span>Bole, Addis Ababa, Ethiopia</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="max-w-6xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[11px] text-cream-100/40">
            © {new Date().getFullYear()} Liyu POS. All rights reserved.
          </p>
          
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] text-cream-100/60 font-medium tracking-wide">
            <span className="w-1.5 h-1.5 bg-[#E2A03F] rounded-full animate-pulse" />
            {t('Built in Addis Ababa for Ethiopian businesses', 'በአዲስ አበባ ለኢትዮጵያ ንግዶች በፍቅር የተሰራ')}
          </div>
        </div>
      </footer>
    </>
  )
}