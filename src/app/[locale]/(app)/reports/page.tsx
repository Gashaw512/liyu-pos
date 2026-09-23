'use client'

import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileBarChart,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

export default function ReportsPage() {
  const router = useRouter()
  const params = useParams()

  const locale = String(params.locale ?? 'en')
  const isAm = locale === 'am'

  const go = (path: string) => {
    router.push(`/${locale}${path}`)
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => go('/dashboard')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-100 bg-white text-coffee-600 transition hover:bg-coffee-50"
              aria-label={isAm ? 'ወደ ዳሽቦርድ' : 'Back to dashboard'}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-berbere-500" />
                <h1 className="text-xl font-bold text-coffee-800 sm:text-2xl">
                  {isAm ? 'ሪፖርቶች' : 'Reports'}
                </h1>
              </div>

              <p className="mt-0.5 text-sm text-coffee-500">
                {isAm
                  ? 'የንግድዎን አፈጻጸም በቀላሉ ይመልከቱ።'
                  : 'Understand your sales, profit and business performance.'}
              </p>
            </div>
          </div>
        </header>

        {/* Today's report */}
        <section
          onClick={() => go('/reports/daily')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl bg-berbere-500 p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-8"
        >
          <div className="relative z-10 max-w-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <FileBarChart className="h-6 w-6" />
            </div>

            <p className="mb-1 text-sm font-medium text-white/75">
              {isAm ? 'የዛሬ ሪፖርት' : "Today's Report"}
            </p>

            <h2 className="text-2xl font-bold sm:text-3xl">
              {isAm
                ? 'የዛሬን የንግድ አፈጻጸም ይመልከቱ'
                : 'See how your business performed today'}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
              {isAm
                ? 'ሽያጭ፣ ወጪ፣ ትርፍ፣ ክፍያዎች፣ ምርቶች እና የስቶክ ሁኔታ።'
                : 'Sales, expenses, profit, payments, products and stock performance.'}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-berbere-600 transition group-hover:bg-cream-50">
              {isAm ? 'ሪፖርቱን ይመልከቱ' : 'View today’s report'}
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          <BarChart3 className="absolute -bottom-10 -right-8 h-52 w-52 text-white/5 sm:h-64 sm:w-64" />
        </section>

        {/* Other reports */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-coffee-400" />
            <h2 className="text-sm font-semibold text-coffee-700">
              {isAm ? 'ሌሎች ሪፖርቶች' : 'More reports'}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">

            {/* Weekly */}
            <ReportCard
              icon={<Clock3 className="h-5 w-5" />}
              title={isAm ? 'የዚህ ሳምንት' : 'This Week'}
              description={
                isAm
                  ? 'የሳምንቱን ሽያጭ እና አፈጻጸም ይመልከቱ።'
                  : 'Review this week’s sales and performance.'
              }
              onClick={() => go('/reports/weekly')}
            />

            {/* Monthly */}
            <ReportCard
              icon={<CalendarDays className="h-5 w-5" />}
              title={isAm ? 'የዚህ ወር' : 'This Month'}
              description={
                isAm
                  ? 'የወሩን የንግድ አፈጻጸም ይመልከቱ።'
                  : 'Review your monthly business performance.'
              }
              onClick={() => go('/reports/monthly')}
            />

            {/* Custom */}
            <ReportCard
              icon={<CalendarDays className="h-5 w-5" />}
              title={isAm ? 'ቀናት ይምረጡ' : 'Choose Dates'}
              description={
                isAm
                  ? 'የሚፈልጉትን የቀን ክልል ይምረጡ።'
                  : 'Create a report for a custom date range.'
              }
              onClick={() => go('/reports/range')}
            />
          </div>
        </section>

        {/* Simple explanation */}
        <div className="rounded-2xl border border-coffee-100 bg-white px-5 py-4">
          <p className="text-xs leading-5 text-coffee-500">
            {isAm
              ? 'ሪፖርቶችዎ ሽያጭ፣ ክፍያዎች፣ ወጪዎች፣ ትርፍ፣ ምርቶች እና ስቶክን ያካትታሉ።'
              : 'Reports bring together your sales, payments, expenses, profit, products and stock information.'}
          </p>
        </div>
      </div>
    </main>
  )
}

function ReportCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-coffee-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-berbere-200 hover:shadow-sm"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-berbere-500 transition group-hover:bg-berbere-50">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-coffee-800">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-coffee-500">
          {description}
        </span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-coffee-300 transition group-hover:translate-x-0.5 group-hover:text-berbere-500" />
    </button>
  )
}