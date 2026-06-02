'use client'

import Link from 'next/link'
import { ArrowRight, WifiOff } from 'lucide-react'

const MOCK_ROWS = (lang: 'en' | 'am') => [
  {
    label: lang === 'en' ? 'St. George Beer ×12' : 'ቅዱስ ጊዮርጊስ ቢራ ×12',
    sub: lang === 'en' ? 'Cash · Chala K.' : 'በጥሬ ገንዘብ · ጫላ ከ.',
    amount: '+1,020',
    color: 'text-emerald-600'
  },
  {
    label: lang === 'en' ? 'Dashen Beer ×6' : 'ዳሽን ቢራ ×6',
    sub: lang === 'en' ? 'Telebirr · Selam' : 'ቴሌብር · ሰላም',
    amount: '+480',
    color: 'text-emerald-600'
  },
  {
    label: lang === 'en' ? 'Missing: 3 bottles' : 'የጎደለ፡ 3 ጠርሙስ',
    sub: lang === 'en' ? 'Auto-detected · Alert sent' : 'በራስ-ሰር የተገኘ · ማሳወቂያ ተልኳል',
    amount: '-180',
    color: 'text-rose-600'
  },
  {
    label: lang === 'en' ? 'Water 0.5L ×18' : 'ውሃ 0.5ሊ ×18',
    sub: lang === 'en' ? 'Cash · Chala K.' : 'በጥሬ ገንዘብ · ጫላ ከ.',
    amount: '+270',
    color: 'text-emerald-600'
  },
]

export function Hero({ lang }: { lang: 'en' | 'am' }) {
  const rows = MOCK_ROWS(lang)

  return (
    <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          {/* System/Product Title Badge */}
          <div className="text-[#2B1E1A]/70 dark:text-white/70 text-[13px] font-medium mb-1.5 tracking-wide">
            Liyu POS
          </div>

          {/* High-Impact Slogan Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-serif font-bold leading-[1.15] text-[#2B1E1A] dark:text-white tracking-tight">
            {lang === 'en' ? (
              <>
                Smart business tracking<br />
                for Ethiopian restaurants, bars & shops
              </>
            ) : (
              <>
                ለኢትዮጵያ ምግብ ቤቶች፣ ባሮች እና ሱቆች<br />
                የተሰናዳ ዘመናዊ የንግድ መቆጣጠሪያ
              </>
            )}
          </h1>

          {/* Offline Resiliency Status Indicator */}
          <div className="mt-4 inline-flex items-center gap-2 bg-[#8B2635]/10 text-[#8B2635] 
                  dark:bg-white/10 dark:text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            {/* Wi-Fi Off Icon */}
            <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 12.233c.032.551.458.983 1.01.983h19.98c.552 0 .978-.432 1.01-.983C22.616 5.485 17.844 1 12 1S1.384 5.485 1 12.233Z" opacity="0.15" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.586 10.586A2 2 0 1 0 13.414 13.41M16.95 6.95a10 10 0 0 1 1.95 2.63M7.05 6.95a10 10 0 0 0-2.433 3.738M1.5 12h21" />
            </svg>
            <span>{lang === 'en' ? 'Works offline too' : 'ያለ ኢንተርኔትም ይሰራል'}</span>
          </div>

          {/* High-Conversion Interactive Controls */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-[#8B2635] hover:bg-[#7a1f2d]
                 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md
                 hover:shadow-lg transition-all text-sm sm:text-base"
            >
              {lang === 'en' ? 'Start Your Free Trial' : 'በነፃ ይጀምሩ'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="flex items-center justify-center gap-2 bg-white hover:bg-[#2B1E1A]/5
                 text-[#2B1E1A] font-semibold px-6 py-3.5 rounded-xl border
                 border-[#2B1E1A]/10 transition-all text-sm sm:text-base dark:bg-transparent dark:text-white dark:border-white/20"
            >
              {lang === 'en' ? 'See How It Works' : 'አሰራሩን ይዩ'}
            </a>
          </div>
        </div>

        {/* Live Mock UI Display Block */}
        <div className="relative">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-[#2B1E1A]/10 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="bg-[#8B2635] px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-sm font-serif">ሊዩ POS</div>
                <div className="text-white/60 text-[10px]">
                  {lang === 'en' ? 'Flamingo Bar, Bole · Evening Shift' : 'ፍላሚንጎ ባር፣ ቦሌ · የማሽ እረፍት'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/70 text-[10px]">{lang === 'en' ? 'Synced' : 'የተመሳሰለ'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[#2B1E1A]/10 dark:bg-white/10 border-b border-[#2B1E1A]/10 dark:border-white/10">
              <div className="bg-white dark:bg-zinc-900 px-4 py-3">
                <div className="text-[10px] text-[#2B1E1A]/50 dark:text-white/50 uppercase tracking-wide">
                  {lang === 'en' ? 'Today Revenue' : 'የዛሬ ሽያጭ'}
                </div>
                <div className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                  42,500 <span className="text-xs font-normal text-[#2B1E1A]/40 dark:text-white/40">ETB</span>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 px-4 py-3">
                <div className="text-[10px] text-[#2B1E1A]/50 dark:text-white/50 uppercase tracking-wide">
                  {lang === 'en' ? 'Net Profit' : 'የተጣራ ትርፍ'}
                </div>
                <div className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                  18,200 <span className="text-xs font-normal text-[#2B1E1A]/40 dark:text-white/40">ETB</span>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="text-[10px] font-bold text-[#2B1E1A]/40 dark:text-white/40 uppercase tracking-wide px-1 mb-1">
                {lang === 'en' ? "Today's Transactions" : 'የዛሬ ግብይቶች'}
              </div>
              {rows.map((row, i) => (
                <div key={i} className="flex items-center justify-between bg-[#2B1E1A]/5 dark:bg-white/5 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs font-medium text-[#2B1E1A] dark:text-white">{row.label}</div>
                    <div className="text-[10px] text-[#2B1E1A]/60 dark:text-white/60">{row.sub}</div>
                  </div>
                  <div className={`text-xs font-bold ${row.color}`}>{row.amount} ETB</div>
                </div>
              ))}
            </div>

            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3 py-2">
                <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
                  {lang === 'en'
                    ? 'Internet disconnected — 3 sales queued, will sync automatically'
                    : 'ኢንተርኔት ተቋርጧል — 3 ሽያጮች ተራ ይዘዋል፣ በራስ-ሰር ይመሳሰላሉ'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}