// src/app/[locale]/(app)/reports/monthly/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ShoppingCart,
} from 'lucide-react'

import { getDB } from '../../../../../lib/offline/db'

type MonthlySummary = {
  sales: number
  orders: number
}

export default function MonthlyReportPage() {
  const params = useParams()
  const router = useRouter()

  const locale = String(params.locale ?? 'en')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<MonthlySummary>({
    sales: 0,
    orders: 0,
  })

  useEffect(() => {
    async function loadMonthlyReport() {
      try {
        const db = await getDB()

        const history = await db.getAll('completed_sales_history')
        const pending = await db.getAll('pending_sales')

        const sales = [...history, ...pending]

        const now = new Date()
        const month = now.getMonth()
        const year = now.getFullYear()

        let totalSales = 0
        let orderCount = 0

        for (const sale of sales as any[]) {
          const createdAt = new Date(sale.createdAt)

          if (
            createdAt.getMonth() !== month ||
            createdAt.getFullYear() !== year
          ) {
            continue
          }

          const amount = Number(
            sale.total_amount ?? sale.amount ?? 0
          )

          if (!Number.isFinite(amount)) continue

          totalSales += amount
          orderCount += 1
        }

        setSummary({
          sales: totalSales,
          orders: orderCount,
        })
      } catch (error) {
        console.error('Failed to load monthly report:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMonthlyReport()
  }, [])

  const formatMoney = (value: number) =>
    new Intl.NumberFormat(isAm ? 'am-ET' : 'en-ET', {
      maximumFractionDigits: 2,
    }).format(value)

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
                {isAm ? 'የወር ሪፖርት' : 'Monthly Report'}
              </h1>
            </div>

            <p className="mt-0.5 text-sm text-coffee-500">
              {isAm
                ? 'የዚህን ወር የሽያጭ አፈጻጸም ይመልከቱ።'
                : 'Review your sales performance for this month.'}
            </p>
          </div>
        </header>

        {/* Main Sales Summary */}
        <section className="rounded-3xl bg-berbere-500 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {isAm ? 'የዚህ ወር ሽያጭ' : 'Monthly Sales'}
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight">
                {formatMoney(summary.sales)} ETB
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <CalendarDays className="h-6 w-6 text-gold-400" />
            </div>
          </div>
        </section>

        {/* Sales Activity */}
        <section className="grid gap-3 sm:grid-cols-2">

          <div className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-100 text-berbere-500">
                <ShoppingCart className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-coffee-500">
                  {isAm ? 'የሽያጭ ብዛት' : 'Sales Made'}
                </p>

                <p className="mt-1 text-xl font-bold text-coffee-800">
                  {summary.orders.toLocaleString(
                    isAm ? 'am-ET' : 'en-ET'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-100 text-berbere-500">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-coffee-500">
                  {isAm ? 'አማካይ ሽያጭ' : 'Average Sale'}
                </p>

                <p className="mt-1 text-xl font-bold text-coffee-800">
                  {formatMoney(
                    summary.orders > 0
                      ? summary.sales / summary.orders
                      : 0
                  )}{' '}
                  ETB
                </p>
              </div>
            </div>
          </div>

        </section>

        {/* Report Note */}
        <div className="rounded-2xl border border-coffee-100 bg-white px-5 py-4">
          <p className="text-xs leading-5 text-coffee-500">
            {isAm
              ? 'ይህ ሪፖርት በዚህ መሣሪያ ላይ የተመዘገቡ የዚህ ወር ሽያጮችን ያሳያል።'
              : 'This report shows recorded sales for the current month available on this device.'}
          </p>
        </div>

      </div>
    </main>
  )
}