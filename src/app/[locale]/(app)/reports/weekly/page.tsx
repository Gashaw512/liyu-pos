// src/app/[locale]/(app)/reports/weekly/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
} from 'lucide-react'

import { getDB } from '../../../../../lib/offline/db'

type DayData = {
  name: string
  total: number
}

const DAY_NAMES_EN: Record<string, string> = {
  Sun: 'Sun',
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
}

const DAY_NAMES_AM: Record<string, string> = {
  Sun: 'እሁድ',
  Mon: 'ሰኞ',
  Tue: 'ማክሰ',
  Wed: 'ረቡዕ',
  Thu: 'ሐሙስ',
  Fri: 'አርብ',
  Sat: 'ቅዳሜ',
}

export default function WeeklyReportPage() {
  const params = useParams()
  const router = useRouter()

  const locale = String(params.locale ?? 'en')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(true)
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const [daysData, setDaysData] = useState<DayData[]>([])

  useEffect(() => {
    async function loadWeeklyReport() {
      try {
        const db = await getDB()

        const history = await db.getAll('completed_sales_history')
        const pending = await db.getAll('pending_sales')

        const sales = [...history, ...pending]

        const from = new Date()
        from.setDate(from.getDate() - 6)
        from.setHours(0, 0, 0, 0)

        const dayTotals: Record<string, number> = {
          Sun: 0,
          Mon: 0,
          Tue: 0,
          Wed: 0,
          Thu: 0,
          Fri: 0,
          Sat: 0,
        }

        let total = 0

        for (const sale of sales as any[]) {
          const createdAt = new Date(sale.createdAt)

          if (createdAt < from) continue

          const amount = Number(
            sale.total_amount ?? sale.amount ?? 0
          )

          if (!Number.isFinite(amount)) continue

          total += amount

          const day = createdAt.toLocaleDateString('en-US', {
            weekday: 'short',
          })

          if (day in dayTotals) {
            dayTotals[day] += amount
          }
        }

        setWeeklyTotal(total)

        setDaysData(
          Object.keys(dayTotals).map((day) => ({
            name: day,
            total: dayTotals[day],
          }))
        )
      } catch (error) {
        console.error('Failed to load weekly report:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWeeklyReport()
  }, [])

  const formatMoney = (value: number) =>
    new Intl.NumberFormat(isAm ? 'am-ET' : 'en-ET', {
      maximumFractionDigits: 2,
    }).format(value)

  const maxDayValue = Math.max(
    ...daysData.map((day) => day.total),
    1
  )

  const dayLabel = (day: string) =>
    isAm ? DAY_NAMES_AM[day] : DAY_NAMES_EN[day]

  if (loading) {
    return (
      <main className="min-h-screen bg-cream-50 px-4 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-medium text-berbere-500">
            {isAm ? 'ሪፖርቱ በመጫን ላይ...' : 'Loading report...'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-5 pb-24 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* Header */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/reports`)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-100 bg-white text-coffee-600 transition hover:bg-coffee-50"
            aria-label={isAm ? 'ተመለስ' : 'Back'}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-berbere-500" />

              <h1 className="text-xl font-bold text-coffee-800">
                {isAm ? 'የሳምንት ሪፖርት' : 'Weekly Report'}
              </h1>
            </div>

            <p className="mt-0.5 text-sm text-coffee-500">
              {isAm
                ? 'ያለፉትን 7 ቀናት የሽያጭ አፈጻጸም ይመልከቱ።'
                : 'Review your sales performance over the last 7 days.'}
            </p>
          </div>
        </header>

        {/* Total Sales */}
        <section className="rounded-3xl bg-berbere-500 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {isAm ? 'የ7 ቀናት ሽያጭ' : '7-Day Sales'}
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight">
                {formatMoney(weeklyTotal)} ETB
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <CalendarDays className="h-6 w-6 text-gold-400" />
            </div>
          </div>
        </section>

        {/* Daily Sales */}
        <section className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-berbere-500" />

            <h2 className="text-sm font-bold text-coffee-800">
              {isAm ? 'ዕለታዊ ሽያጭ' : 'Daily Sales'}
            </h2>
          </div>

          <div className="space-y-3">
            {daysData.map((day) => {
              const percentage = (day.total / maxDayValue) * 100

              return (
                <div
                  key={day.name}
                  className="flex items-center gap-3"
                >
                  <span className="w-12 shrink-0 text-xs font-semibold text-coffee-600">
                    {dayLabel(day.name)}
                  </span>

                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-cream-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-gold-400 transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          day.total > 0 ? percentage : 0,
                          day.total > 0 ? 3 : 0
                        )}%`,
                      }}
                    />

                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-coffee-700">
                      {formatMoney(day.total)} ETB
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Note */}
        <p className="px-1 text-xs leading-5 text-coffee-400">
          {isAm
            ? 'ይህ ሪፖርት የአሁኑን እና የተመዘገቡ የሽያጭ መረጃዎችን በመጠቀም ይሰራል።'
            : 'This report uses recorded sales available on this device.'}
        </p>
      </div>
    </main>
  )
}