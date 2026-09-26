// src/app/[locale]/(app)/reports/page.tsx
'use client'

import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileBarChart,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

type ReportCardProps = {
  number: string
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}

export default function ReportsPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params.locale ?? 'en')
  const isAm = locale === 'am'

  const t = (en: string, am: string) => isAm ? am : en
  const go = (path: string) => router.push(`/${locale}${path}`)

  return (
    <main className="min-h-screen bg-cream-50 px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-8">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go('/dashboard')}
            aria-label={t('Back to dashboard', 'ወደ ዳሽቦርድ ተመለስ')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cream-300 bg-white text-coffee-600 shadow-sm transition hover:border-berbere-200 hover:text-berbere-600 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-berbere-500" aria-hidden="true" />
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coffee-400">
                {t('Your business', 'የንግድዎ')}
              </p>
            </div>
            <h1 className="mt-0.5 text-xl font-black tracking-tight text-coffee-800 sm:text-2xl">
              {t('Reports', 'ሪፖርቶች')}
            </h1>
            <p className="mt-0.5 text-xs text-coffee-500 sm:text-sm">
              {t('Choose a report to view.', 'ለማየት ሪፖርት ይምረጡ።')}
            </p>
          </div>
        </header>

        <section aria-labelledby="today-report-title">
          <button
            type="button"
            onClick={() => go('/reports/daily')}
            className="group relative flex min-h-52 w-full items-end overflow-hidden rounded-3xl bg-berbere-600 p-5 text-left text-white shadow-elevated transition hover:bg-berbere-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-berbere-300 active:scale-[0.99] sm:min-h-64 sm:p-8"
          >
            <div className="relative z-10 w-full">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <FileBarChart className="h-5 w-5" aria-hidden="true" />
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                {t('Start here · Today', 'ከዚህ ይጀምሩ · ዛሬ')}
              </p>
              <h2 id="today-report-title" className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                {t("Today's report", 'የዛሬ ሪፖርት')}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">
                {t('See sales, expenses, profit and stock.', 'ሽያጭ፣ ወጪ፣ ትርፍ እና ክምችትን ይመልከቱ።')}
              </p>

              <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-berbere-700 transition group-hover:bg-cream-100">
                {t('Open report', 'ሪፖርቱን ክፈት')}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>

            <BarChart3 className="absolute -bottom-12 -right-9 h-48 w-48 text-white/[0.06] sm:-bottom-16 sm:right-4 sm:h-72 sm:w-72" aria-hidden="true" />
          </button>
        </section>

        <section aria-labelledby="other-reports-title">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <h2 id="other-reports-title" className="text-sm font-black text-coffee-800 sm:text-base">
                {t('Look at another time', 'ሌላ ጊዜ ይመልከቱ')}
              </h2>
              <p className="mt-0.5 text-xs text-coffee-500">
                {t('Pick a week, month or dates.', 'ሳምንት፣ ወር ወይም ቀናት ይምረጡ።')}
              </p>
            </div>
            <Clock3 className="mb-0.5 h-4 w-4 shrink-0 text-coffee-300" aria-hidden="true" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReportCard
              number="1"
              icon={<Clock3 className="h-5 w-5" />}
              title={t('This week', 'ይህ ሳምንት')}
              description={t('See sales for each day this week.', 'የዚህን ሳምንት የየቀኑን ሽያጭ ይመልከቱ።')}
              onClick={() => go('/reports/weekly')}
            />
            <ReportCard
              number="2"
              icon={<CalendarDays className="h-5 w-5" />}
              title={t('This month', 'ይህ ወር')}
              description={t('See this month’s total sales.', 'የዚህን ወር ጠቅላላ ሽያጭ ይመልከቱ።')}
              onClick={() => go('/reports/monthly')}
            />
            <ReportCard
              number="3"
              icon={<CalendarDays className="h-5 w-5" />}
              title={t('Choose dates', 'ቀናት ይምረጡ')}
              description={t('Pick the start and end dates.', 'የመጀመሪያ እና የመጨረሻ ቀን ይምረጡ።')}
              onClick={() => go('/reports/range')}
            />
          </div>
        </section>

        <p className="px-1 text-center text-[11px] leading-5 text-coffee-400">
          {t('Tap a card to open that report.', 'ሪፖርቱን ለመክፈት ካርዱን ይጫኑ።')}
        </p>
      </div>
    </main>
  )
}

function ReportCard({
  number,
  icon,
  title,
  description,
  onClick,
}: ReportCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-24 w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-berbere-200 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berbere-400 active:scale-[0.99] sm:min-h-28 sm:gap-4 sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-berbere-600 transition group-hover:bg-berbere-50">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-coffee-400">
          {number}
        </span>
        <span className="block text-sm font-black text-coffee-800">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-coffee-500">{description}</span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-coffee-300 transition group-hover:translate-x-0.5 group-hover:text-berbere-500" aria-hidden="true" />
    </button>
  )
}
