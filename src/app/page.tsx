'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  WifiOff, TrendingUp, AlertTriangle, BarChart3,
  Shield, Zap, ArrowRight, CheckCircle,
  Beer, Utensils, Store, ChevronDown,
} from 'lucide-react'
import page from './[locale]/(puplic)/page'
import { Route } from 'next'




/* ─── Static data ─────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: WifiOff,       color: 'text-berbere-500', bg: 'bg-berbere-50',  title: 'Works offline',        titleAm: 'ያለ ኢንተርኔት ይሰራል',    desc: 'Sell, count stock, and record sales even when internet is cut. Everything syncs when it comes back.' },
  { icon: AlertTriangle, color: 'text-gold-400',    bg: 'bg-gold-50',     title: 'Theft detection',      titleAm: 'ስርቆት ፈልጊ',          desc: 'If 4 St. George bottles are missing after a shift, the app tells you immediately with the birr amount.' },
  { icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50',  title: 'Daily profit',         titleAm: 'ዕለታዊ ትርፍ',           desc: 'Open your phone every morning and see yesterday\'s revenue, costs, and net profit — no calculator needed.' },
  { icon: BarChart3,     color: 'text-blue-500',    bg: 'bg-blue-50',     title: 'Shift reports',        titleAm: 'የሺፍት ሪፖርት',          desc: 'Every shift closes with a complete report sent directly to the owner via Telegram.' },
  { icon: Shield,        color: 'text-purple-500',  bg: 'bg-purple-50',   title: 'Role access',          titleAm: 'የተወሰነ መዳረሻ',         desc: 'Owner sees everything. Cashier sees only their shift. Clerk sees only stock. Nobody sees what they shouldn\'t.' },
  { icon: Zap,           color: 'text-amber-500',   bg: 'bg-amber-50',    title: 'Ethiopian payments',   titleAm: 'የኢትዮጵያ ክፍያ',         desc: 'Cash, Telebirr, CBE Birr, and Coop Bank — all tracked separately with split payment support.' },
]

const SEGMENTS = [
  { icon: Beer,     emoji: '🍺', label: 'Bars & Tej Bets',      labelAm: 'ባሮች እና ተጅ ቤቶች',    desc: 'Crate-to-bottle tracking, shift handovers, and automatic missing bottle alerts every shift.' },
  { icon: Utensils, emoji: '🍽️', label: 'Restaurants & Cafes', labelAm: 'ምግብ ቤቶች እና ካፌዎች', desc: 'Menu cost tracking, daily expenses, and profit per dish — from Tibs house to coffee shop.' },
  { icon: Store,    emoji: '🛒', label: 'Kiosks & Mini-Markets', labelAm: 'ኪዮስኮች',             desc: 'Inventory management, low stock alerts, and fast checkout for high-volume retail.' },
]

const PLANS = [
  {
    name: 'Starter', nameAm: 'ጀማሪ',
    price: '0', period: 'Free forever',
    highlight: false, href: '/register?plan=starter',
    cta: 'ይጀምሩ — Free', ctaEn: 'Get Started Free',
    features: ['1 የሰራተኛ አካውንት', '50 ምርቶች', 'Offline ሽያጭ', 'ዕለታዊ ትርፍ ሪፖርት', 'የጥሬ ገንዘብ ክፍያ'],
  },
  {
    name: 'Business', nameAm: 'ቢዝነስ',
    price: '999', period: 'per month / በወር',
    highlight: true, href: '/register?plan=business',
    cta: '14 ቀን ይሞክሩ', ctaEn: 'Start 14-Day Free Trial',
    features: ['5 የሰራተኛ አካውንቶች', 'ያልተወሰነ ምርቶች', 'Telebirr + CBE Birr', 'የሺፍት ሪፖርቶች', 'የስርቆት ማስጠንቀቂያ', 'Telegram ሪፖርት'],
  },
]

/* ─── Mock live-preview data matching HTML prototype ─────────────────────── */
const MOCK_TRANSACTIONS = [
  { name: 'St. George Beer ×3', method: 'Cash',    amount: '+255',  color: 'text-emerald-600' },
  { name: 'Dashen Beer ×2',     method: 'Telebirr',amount: '+160',  color: 'text-emerald-600' },
  { name: 'Missing: 3 bottles', method: 'Auto-detected', amount: '-180', color: 'text-red-500' },
  { name: 'Tej ×4',             method: 'CBE Birr',amount: '+240',  color: 'text-emerald-600' },
]

/* ─── Language toggle (simple local state — full i18n handled by next-intl) ─ */
export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'am'>('am')
  const t = (en: string, am: string) => lang === 'am' ? am : en

  return (
    <div className="min-h-screen bg-[#F7F4EB] text-[#2B1E1A] font-sans antialiased">

      {/* ─── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#F7F4EB]/95 backdrop-blur-md border-b border-[#2B1E1A]/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0 select-none">
            <span className="font-['Playfair_Display',serif] font-bold text-xl text-[#8B2635] leading-none">
              ሊዩ
            </span>
            <span className="font-['Playfair_Display',serif] font-bold text-xl text-[#E2A03F] leading-none ml-1">
              POS
            </span>
          </Link>

          {/* Center: lang toggle */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'am' : 'en')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                       rounded-full border border-[#2B1E1A]/15 bg-white
                       text-[#5a3e38] hover:border-[#8B2635]/40 transition-colors"
          >
            {lang === 'am' ? '🇪🇹 አማርኛ' : '🇬🇧 English'}
          </button>

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="hidden sm:block text-sm font-semibold text-[#5a3e38]
                         hover:text-[#8B2635] transition-colors px-2 py-1">
              {t('Sign in', 'ግባ')}
            </Link>
            <Link href="/register"
              className="flex items-center gap-1.5 bg-[#8B2635] hover:bg-[#7a1f2d]
                         text-white text-sm font-semibold px-4 py-2 rounded-xl
                         shadow-sm transition-all active:scale-95">
              {t('Start Free', 'ይጀምሩ')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <header className="max-w-5xl mx-auto px-4 pt-10 pb-0">

        {/* Badge */}
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-2 bg-[#8B2635]/10 text-[#8B2635]
                           text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B2635] animate-pulse" />
            {t('Built for Ethiopian Businesses', 'ለኢትዮጵያ ንግዶች የተሰራ')}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[28px] sm:text-4xl lg:text-5xl font-['Playfair_Display',serif]
                       font-bold leading-[1.15] tracking-tight text-center max-w-2xl mx-auto">
          {t(
            'The POS that keeps working when internet goes down',
            'ኢንተርኔት ሲጠፋ ሥራ የሚቀጥለው POS'
          )}
        </h1>

        <p className="mt-4 text-center text-[#5a3e38] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
          {t(
            'Replace paper and calculators with a beautiful, Amharic-first POS for bars, restaurants, and cafes — works offline, detects theft, and shows your profit in seconds.',
            'ወረቀትና ካልኩሌተር ይቀሩ። ለባሮች፣ ምግብ ቤቶች እና ካፌዎች የሚሆን ቆንጆ POS — Offline ይሰራል፣ ስርቆት ያሳውቅዎ፣ ትርፍዎን በሰከንድ ያሳይዎ።'
          )}
        </p>

        {/* CTAs */}
        <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3 px-2">
          <Link href="/register"
            className="flex items-center justify-center gap-2 bg-[#8B2635] hover:bg-[#7a1f2d]
                       text-white font-semibold text-base px-6 py-4 rounded-xl shadow-md
                       hover:shadow-lg transition-all active:scale-95 min-h-[52px]">
            {t('Start Free — No Card Needed', 'ነፃ ይጀምሩ — ካርድ አያስፈልግም')}
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
          <a href="#features"
            className="flex items-center justify-center gap-2 bg-white hover:bg-[#F7F4EB]
                       text-[#2B1E1A] font-semibold text-base px-6 py-4 rounded-xl
                       border border-[#2B1E1A]/12 transition-all min-h-[52px]">
            {t('See how it works', 'እንዴት እንደሚሰራ ይመልከቱ')}
            <ChevronDown className="w-4 h-4 shrink-0" />
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-5 flex-wrap text-xs text-[#9b7b74]">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {t('No credit card', 'ካርድ አያስፈልግም')}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {t('Works offline', 'Offline ይሰራል')}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {t('Amharic + English', 'አማርኛ + English')}
          </span>
        </div>
      </header>

      {/* ─── LIVE PREVIEW (from HTML prototype) ────────────────────────────── */}
      <div className="max-w-sm mx-auto px-4 mt-10">
        {/* Phone mockup frame */}
        <div className="bg-white rounded-[24px] border border-[#2B1E1A]/10 shadow-2xl overflow-hidden">

          {/* Top bar — exact match to HTML prototype .topbar */}
          <div className="bg-[#8B2635] px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-['Playfair_Display',serif] text-white font-bold text-lg leading-none">
                ሊዩ POS
              </div>
              <div className="text-white/65 text-[11px] mt-0.5">
                {t('Flamingo Bar, Bole · Evening Shift', 'ፍሌሚንጎ ባር፣ ቦሌ · ምሽት ሺፍት')}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="bg-[#E2A03F] text-[#2B1E1A] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {t('Today', 'ዛሬ')}
              </span>
            </div>
          </div>

          {/* Stat grid — 2×2 */}
          <div className="grid grid-cols-2 gap-px bg-[#2B1E1A]/8">
            {[
              { label: t('Today Revenue','የዛሬ ገቢ'),   value: '42,500', unit: 'ETB', green: true  },
              { label: t('Net Profit','ትርፍ'),          value: '18,200', unit: 'ETB', green: true  },
              { label: t('Items Sold','የተሸጡ ዕቃዎች'),  value: '234',    unit: t('units','ዕቃ'),  green: false },
              { label: t('Loss','ኪሳራ'),               value: '280',    unit: 'ETB', green: false, red: true },
            ].map((s) => (
              <div key={s.label} className="bg-white px-3 py-3">
                <div className="text-[10px] text-[#9b7b74] font-medium mb-0.5">{s.label}</div>
                <div className={`text-lg font-bold leading-none
                  ${s.red ? 'text-red-500' : s.green ? 'text-emerald-600' : 'text-[#2B1E1A]'}`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-[#9b7b74] mt-0.5">{s.unit}</div>
              </div>
            ))}
          </div>

          {/* Alert row */}
          <div className="mx-3 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200
                          rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-700 flex-1 font-medium">
              {t('St. George Beer: 4 bottles missing — -240 ETB', 'ሴንት ጆርጅ: 4 ጠርሙስ ጠፍቷል — -240 ብር')}
            </span>
          </div>

          {/* Transaction rows */}
          <div className="p-3 space-y-2">
            <div className="text-[10px] font-bold text-[#9b7b74] uppercase tracking-wide px-1">
              {t("Today's Sales", "የዛሬ ሽያጮች")}
            </div>
            {MOCK_TRANSACTIONS.map((tx, i) => (
              <div key={i} className="flex items-center justify-between bg-[#F7F4EB]/70
                                      rounded-xl px-3 py-2">
                <div>
                  <div className="text-xs font-medium text-[#2B1E1A]">{tx.name}</div>
                  <div className="text-[10px] text-[#9b7b74]">{tx.method}</div>
                </div>
                <div className={`text-xs font-bold ${tx.color}`}>{tx.amount} ETB</div>
              </div>
            ))}
          </div>

          {/* Offline banner */}
          <div className="mx-3 mb-3 flex items-center gap-2 bg-[#F7F4EB] border border-[#2B1E1A]/10
                          rounded-xl px-3 py-2">
            <WifiOff className="w-3.5 h-3.5 text-[#9b7b74] shrink-0" />
            <span className="text-[10px] text-[#9b7b74] font-medium">
              {t('Offline — 3 sales queued, syncing when connected', 'Offline — 3 ሽያጮች ሲሰናዳ ይሰምሩ')}
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-[#9b7b74] mt-3">
          {t('This is exactly what your dashboard looks like', 'ዳሽቦርዱ ሲከፈት እንዲህ ይታያል')}
        </p>
      </div>

      {/* ─── SEGMENTS ──────────────────────────────────────────────────────── */}
      <section className="border-y border-[#2B1E1A]/10 bg-white mt-12 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-[#9b7b74] mb-8">
            {t('Works for every Ethiopian business', 'ለሁሉም የኢትዮጵያ ንግድ ይሰራል')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SEGMENTS.map((s) => (
              <div key={s.label}
                className="flex items-start gap-3 p-4 rounded-2xl bg-[#F7F4EB]/60
                           border border-[#2B1E1A]/8">
                <div className="text-2xl">{s.emoji}</div>
                <div>
                  <div className="font-bold text-sm text-[#2B1E1A]">
                    {lang === 'am' ? s.labelAm : s.label}
                  </div>
                  <div className="text-xs text-[#5a3e38] mt-1 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-bold
                       tracking-tight text-center mb-2">
          {t('Everything your business needs', 'ንግድዎ የሚያስፈልገው ሁሉ')}
        </h2>
        <p className="text-center text-[#5a3e38] text-sm mb-8">
          {t('No complicated setup. No training needed. Just open and use.',
             'ውስብስብ ቅንብር የለም። ስልጠና አያስፈልግም። ይክፈቱ እና ይጠቀሙ።')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="bg-white rounded-2xl border border-[#2B1E1A]/8 p-4
                         hover:border-[#8B2635]/30 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.bg}`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div className="font-bold text-sm text-[#2B1E1A]">
                {lang === 'am' ? f.titleAm : f.title}
              </div>
              <p className="text-xs text-[#5a3e38] mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="bg-[#8B2635] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-['Playfair_Display',serif] font-bold
                         text-white text-center mb-2">
            {t('Up and running in 10 minutes', 'በ10 ደቂቃ ዝግጁ ይሁኑ')}
          </h2>
          <p className="text-center text-white/65 text-xs mb-8">
            {t('No app store. No installation. Open Chrome on your phone, add to home screen, done.',
               'App Store የለም። ምንም ጭነት የለም። Chrome ይክፈቱ፣ ለቤት ማያ ያክሉ፣ ተዘጋጁ።')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '1', en: 'Create account', am: 'አካውንት ፍጠሩ',    d: 'Register your business with your phone number in 2 minutes.' },
              { n: '2', en: 'Add products',   am: 'ምርቶች ያክሉ',      d: 'Enter your beers, drinks, or food with buying price and selling price.' },
              { n: '3', en: 'Start selling',  am: 'ሽያጭ ይጀምሩ',     d: 'Open a shift, tap products, and your profit is calculated automatically.' },
            ].map((s) => (
              <div key={s.n} className="bg-white/10 rounded-2xl p-4">
                <div className="w-8 h-8 rounded-full bg-[#E2A03F] flex items-center justify-center
                                text-[#2B1E1A] font-bold text-sm mb-3">
                  {s.n}
                </div>
                <div className="font-bold text-white text-sm">
                  {lang === 'am' ? s.am : s.en}
                </div>
                <div className="text-white/65 text-xs mt-1 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-bold
                       tracking-tight text-center mb-1">
          {t('Simple, honest pricing', 'ቀላል እና ትክክለኛ ዋጋ')}
        </h2>
        <p className="text-center text-[#5a3e38] text-xs mb-8">
          {t('No hidden fees. Cancel anytime.', 'የተደበቀ ዋጋ የለም። መቼም ቆም ማለት ይቻላል።')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl p-6 flex flex-col relative
                ${plan.highlight
                  ? 'bg-white border-2 border-[#8B2635] shadow-xl'
                  : 'bg-white border border-[#2B1E1A]/10'}`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B2635] text-white
                                text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {t('Most Popular', 'በብዛት የሚመረጥ')}
                </div>
              )}
              <div className="font-bold text-lg text-[#2B1E1A]">
                {plan.name} <span className="text-[#9b7b74] text-sm font-normal">/ {plan.nameAm}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-['Playfair_Display',serif] font-bold">{plan.price}</span>
                <span className="text-xs text-[#9b7b74]">ETB / {plan.period}</span>
              </div>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[#5a3e38]">
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? 'text-[#8B2635]' : 'text-[#E2A03F]'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href as Route}
                className={`mt-6 flex items-center justify-center gap-1.5 py-3.5 rounded-xl
                            text-sm font-bold min-h-[52px] transition-all active:scale-95
                  ${plan.highlight
                    ? 'bg-[#8B2635] hover:bg-[#7a1f2d] text-white shadow-md'
                    : 'border-2 border-[#2B1E1A]/15 hover:bg-[#F7F4EB] text-[#2B1E1A]'}`}>
                {lang === 'am' ? plan.cta : plan.ctaEn}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#2B1E1A]/10 bg-white py-12 px-4 text-center">
        <h2 className="text-xl sm:text-2xl font-['Playfair_Display',serif] font-bold tracking-tight max-w-sm mx-auto">
          {t('Start tracking your business today', 'ዛሬ ንግድዎን መከታተል ይጀምሩ')}
        </h2>
        <p className="text-[#5a3e38] mt-2 text-xs max-w-xs mx-auto">
          {t('Free to start. No installation. Just open on your phone and go.',
             'ነፃ ይጀምሩ። ምንም ጭነት የለም። ስልክዎን ይክፈቱ እና ይጀምሩ።')}
        </p>
        <Link href="/register"
          className="inline-flex items-center gap-2 mt-6 bg-[#8B2635] hover:bg-[#7a1f2d]
                     text-white font-bold px-7 py-4 rounded-xl shadow-md
                     hover:shadow-lg transition-all active:scale-95 min-h-[52px]">
          {t('Create Free Account', 'ነፃ አካውንት ፍጠሩ')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#2B1E1A] py-6 px-4 text-center">
        <div className="font-['Playfair_Display',serif] font-bold text-[#F7F4EB] text-xl mb-1">
          ሊዩ <span className="text-[#E2A03F]">POS</span>
        </div>
        <p className="text-[#F7F4EB]/35 text-[11px]">
          © {new Date().getFullYear()} Liyu POS · {t('Built in Addis Ababa', 'በአዲስ አበባ የተሰራ')}
        </p>
      </footer>

    </div>
  )
}

// import { redirect } from 'next/navigation'

// export default function RootPage() {
//   // When a user lands on liyupos.com/, redirect them directly to the default English locale layout
//   redirect('/en')
// }