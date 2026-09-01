'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  RefreshCw,
  TrendingUp,
  UploadCloud,
} from 'lucide-react'

import { getDB } from '../../../../lib/offline/db'
import createClient from '../../../../lib/supabase/client'

// ============================================================
// TYPES
// ============================================================

interface Sale {
  id: string
  total_amount: number | null
  created_at: string
}

interface ReportMetrics {
  totalSales: number
  transactionCount: number
  averageOrder: number
  pendingSyncCount: number
}

// ============================================================
// HELPERS
// ============================================================

function getTodayRange() {
  const now = new Date()

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  )

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  )

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(
    locale === 'am' ? 'am-ET' : 'en-ET',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(date)
}

// ============================================================
// PAGE
// ============================================================

export default function ReportsDashboardHub() {
  const params = useParams()
  const router = useRouter()

  const locale = String(params.locale || 'en')
  const isAm = locale === 'am'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalSales: 0,
    transactionCount: 0,
    averageOrder: 0,
    pendingSyncCount: 0,
  })

  // ==========================================================
  // TRANSLATION
  // ==========================================================

  const t = useCallback(
    (en: string, am: string) => (isAm ? am : en),
    [isAm],
  )

  // ==========================================================
  // FORMAT
  // ==========================================================

  const formatETB = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(
        isAm ? 'am-ET' : 'en-ET',
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        },
      ).format(Number.isFinite(amount) ? amount : 0),
    [isAm],
  )

  const todayLabel = useMemo(
    () => formatDate(new Date(), locale),
    [locale],
  )

  // ==========================================================
  // LOAD TODAY'S REPORT
  // ==========================================================

  const loadMetrics = useCallback(async () => {
    try {
      const supabase = createClient()
      const { start, end } = getTodayRange()

      // --------------------------------------------------------
      // SERVER SALES
      // --------------------------------------------------------

      const { data, error } = await supabase
        .from('sales')
        .select('id, total_amount, created_at')
        .gte('created_at', start)
        .lt('created_at', end)

      if (error) {
        throw error
      }

      const sales = (data || []) as Sale[]

      const totalSales = sales.reduce(
        (sum, sale) =>
          sum + Number(sale.total_amount || 0),
        0,
      )

      const transactionCount = sales.length

      const averageOrder =
        transactionCount > 0
          ? totalSales / transactionCount
          : 0

      // --------------------------------------------------------
      // LOCAL PENDING SALES
      //
      // These are NOT added to totalSales because they may
      // already exist on the server or may be synced later.
      // --------------------------------------------------------

      let pendingSyncCount = 0

      try {
        const db = await getDB()

        const pendingSales =
          await db.getAll('pending_sales')

        pendingSyncCount = pendingSales.length
      } catch (error) {
        console.warn(
          'Unable to read pending sales:',
          error,
        )
      }

      setMetrics({
        totalSales,
        transactionCount,
        averageOrder,
        pendingSyncCount,
      })
    } catch (error) {
      console.error(
        "Failed to load today's report:",
        error,
      )
    }
  }, [])

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      await loadMetrics()

      if (mounted) {
        setLoading(false)
      }
    }

    void initialize()

    return () => {
      mounted = false
    }
  }, [loadMetrics])

  // ==========================================================
  // REALTIME SALES UPDATE
  // ==========================================================

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('reports-dashboard-sales')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          void loadMetrics()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadMetrics])

  // ==========================================================
  // BROWSER ONLINE EVENT
  //
  // Useful for refreshing pending sync count when the device
  // reconnects, but we do not display online/offline status.
  // ==========================================================

  useEffect(() => {
    const handleOnline = () => {
      void loadMetrics()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [loadMetrics])

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    if (refreshing) return

    setRefreshing(true)

    try {
      await loadMetrics()
    } finally {
      setRefreshing(false)
    }
  }

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigateTo = useCallback(
    (
      report:
        | 'daily'
        | 'weekly'
        | 'monthly'
        | 'range',
    ) => {
      router.push(`/${locale}/reports/${report}`)
    },
    [locale, router],
  )

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F4EB] px-4 pt-4">
        <div className="mx-auto max-w-md">

          <div className="mb-5 flex items-center justify-between">
            <div className="h-9 w-20 animate-pulse rounded-xl bg-white" />
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white" />
          </div>

          <div className="mb-2 h-6 w-24 animate-pulse rounded-lg bg-black/5" />

          <div className="mb-5 h-4 w-36 animate-pulse rounded-lg bg-black/5" />

          <div className="h-44 animate-pulse rounded-3xl bg-[#8B2635]/15" />

          <div className="mt-7 h-4 w-28 animate-pulse rounded-lg bg-black/5" />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
          </div>

        </div>
      </main>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#F7F4EB] px-4 pb-20 pt-4 font-['DM_Sans',sans-serif]">
      <div className="mx-auto max-w-md">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="mb-5 flex items-center justify-between">

          <button
            type="button"
            onClick={() =>
              router.push(`/${locale}/sales`)
            }
            className="group flex items-center gap-1.5 rounded-xl border border-[#2B1E1A]/10 bg-white px-3 py-2 text-xs font-black text-[#5A3E38] shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#8B2635] transition-transform group-hover:-translate-x-0.5" />

            {t('Sales', 'ሽያጭ')}
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl border border-[#2B1E1A]/10 bg-white p-2.5 text-[#5A3E38] shadow-sm transition active:scale-95 disabled:opacity-50"
            aria-label={t(
              'Refresh reports',
              'ሪፖርቶችን አድስ',
            )}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
          </button>

        </header>

        {/* ====================================================
            TITLE
        ==================================================== */}

        <section className="mb-5">

          <div className="flex items-center gap-2.5">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-sm">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>

            <div>
              <h1 className="font-['Playfair_Display',serif] text-2xl font-black leading-none text-[#2B1E1A]">
                {t('Reports', 'ሪፖርቶች')}
              </h1>

              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-[#9B7B74]">
                <CalendarDays className="h-3 w-3" />

                <span>
                  {todayLabel}
                </span>
              </div>
            </div>

          </div>

        </section>

        {/* ====================================================
            TODAY SNAPSHOT
        ==================================================== */}

        <section className="overflow-hidden rounded-3xl bg-[#8B2635] shadow-lg">

          <div className="p-5">

            {/* MAIN VALUE */}

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/55">
                  {t('Today', 'ዛሬ')}
                </p>

                <div className="mt-2 flex items-end gap-2">

                  <span className="font-mono text-[2.2rem] font-black leading-none tracking-tight text-white">
                    {formatETB(metrics.totalSales)}
                  </span>

                  <span className="mb-0.5 text-[10px] font-black text-white/55">
                    ETB
                  </span>

                </div>

              </div>

              <div className="rounded-2xl bg-white/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>

            </div>

            {/* SMALL SUMMARY */}

            <div className="mt-5 flex items-center divide-x divide-white/10">

              <div className="pr-6">

                <p className="text-[9px] text-white/50">
                  {t('Sales', 'ሽያጮች')}
                </p>

                <p className="mt-0.5 font-mono text-sm font-black text-white">
                  {metrics.transactionCount}
                </p>

              </div>

              <div className="pl-6">

                <p className="text-[9px] text-white/50">
                  {t('Average', 'አማካይ')}
                </p>

                <p className="mt-0.5 font-mono text-sm font-black text-white">
                  {formatETB(metrics.averageOrder)}

                  <span className="ml-1 text-[8px] text-white/50">
                    ETB
                  </span>
                </p>

              </div>

            </div>

            {/* UNSYNCED STATUS */}

            <div className="mt-4">

              {metrics.pendingSyncCount > 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2">

                  <UploadCloud className="h-3.5 w-3.5 shrink-0 text-amber-200" />

                  <p className="text-[9px] font-bold text-white/80">
                    {isAm
                      ? `${metrics.pendingSyncCount} ሽያጭ ለማመሳሰል በመጠባበቅ ላይ`
                      : `${metrics.pendingSyncCount} ${
                          metrics.pendingSyncCount === 1
                            ? 'sale'
                            : 'sales'
                        } waiting to sync`}
                  </p>

                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2">

                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                  <p className="text-[9px] font-bold text-white/70">
                    {t(
                      'All sales synced',
                      'ሁሉም ሽያጮች ተመሳስለዋል',
                    )}
                  </p>

                </div>
              )}

            </div>

          </div>

          {/* PRIMARY ACTION */}

          <button
            type="button"
            onClick={() => navigateTo('daily')}
            className="group flex w-full items-center justify-between border-t border-white/10 bg-black/10 px-5 py-3.5 text-left transition hover:bg-black/15 active:bg-black/20"
          >

            <div>

              <p className="text-xs font-black text-white">
                {t(
                  "Open today's report",
                  'የዛሬን ሪፖርት ክፈት',
                )}
              </p>

              <p className="mt-0.5 text-[9px] text-white/50">
                {t(
                  'Sales, payments & cash',
                  'ሽያጭ፣ ክፍያ እና ካሽ',
                )}
              </p>

            </div>

            <ChevronRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />

          </button>

        </section>

        {/* ====================================================
            OTHER REPORTS
        ==================================================== */}

        <section className="mt-7">

          <div className="mb-3 px-1">

            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9B7B74]">
              {t(
                'More reports',
                'ተጨማሪ ሪፖርቶች',
              )}
            </p>

            <h2 className="mt-0.5 text-sm font-black text-[#2B1E1A]">
              {t(
                'Choose a period',
                'የጊዜ ክልል ይምረጡ',
              )}
            </h2>

          </div>

          <div className="grid grid-cols-3 gap-2">

            {/* WEEKLY */}

            <button
              type="button"
              onClick={() => navigateTo('weekly')}
              className="group rounded-2xl border border-[#2B1E1A]/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.98]"
            >

              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <BarChart3 className="h-4 w-4" />
              </div>

              <p className="text-[11px] font-black text-[#2B1E1A]">
                {t('Weekly', 'ሳምንታዊ')}
              </p>

              <p className="mt-1 text-[8px] text-[#9B7B74]">
                {t('Last 7 days', '7 ቀን')}
              </p>

              <ChevronRight className="mt-2 h-3 w-3 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

            {/* MONTHLY */}

            <button
              type="button"
              onClick={() => navigateTo('monthly')}
              className="group rounded-2xl border border-[#2B1E1A]/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.98]"
            >

              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </div>

              <p className="text-[11px] font-black text-[#2B1E1A]">
                {t('Monthly', 'ወርሃዊ')}
              </p>

              <p className="mt-1 text-[8px] text-[#9B7B74]">
                {t('This month', 'ይህ ወር')}
              </p>

              <ChevronRight className="mt-2 h-3 w-3 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

            {/* CUSTOM DATE */}

            <button
              type="button"
              onClick={() => navigateTo('range')}
              className="group rounded-2xl border border-[#2B1E1A]/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.98]"
            >

              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#8B2635]">
                <Clock3 className="h-4 w-4" />
              </div>

              <p className="text-[11px] font-black text-[#2B1E1A]">
                {t('Custom', 'ብጁ')}
              </p>

              <p className="mt-1 text-[8px] text-[#9B7B74]">
                {t('Choose dates', 'ቀን ይምረጡ')}
              </p>

              <ChevronRight className="mt-2 h-3 w-3 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

          </div>

        </section>

      </div>
    </main>
  )
}