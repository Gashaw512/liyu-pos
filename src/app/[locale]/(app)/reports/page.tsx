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
  Wallet,
  ShoppingBag,
  Wifi,
  WifiOff,
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
      weekday: 'long',
      month: 'long',
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
  const [online, setOnline] = useState(true)

  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalSales: 0,
    transactionCount: 0,
    averageOrder: 0,
    pendingSyncCount: 0,
  })

  // ==========================================================
  // TRANSLATION
  // ==========================================================

  const t = (en: string, am: string) => (isAm ? am : en)

  // ==========================================================
  // FORMAT
  // ==========================================================

  const formatETB = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat(
        isAm ? 'am-ET' : 'en-ET',
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        },
      ).format(Number.isFinite(amount) ? amount : 0)
    },
    [isAm],
  )

  const todayLabel = useMemo(() => {
    return formatDate(new Date(), locale)
  }, [locale])

  // ==========================================================
  // LOAD TODAY'S REPORT
  // ==========================================================

  const loadMetrics = useCallback(async () => {
    try {
      const supabase = createClient()

      const { start, end } = getTodayRange()

      /*
       * IMPORTANT:
       *
       * The landing page represents TODAY.
       *
       * Daily / Weekly / Monthly / Range pages can perform
       * their own date-specific queries.
       *
       * We deliberately do NOT load the entire sales table here.
       */
      const { data, error } = await supabase
        .from('sales')
        .select('id, total_amount, created_at')
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        throw error
      }

      const sales = (data || []) as Sale[]

      const totalSales = sales.reduce(
        (total, sale) =>
          total + Number(sale.total_amount || 0),
        0,
      )

      const transactionCount = sales.length

      const averageOrder =
        transactionCount > 0
          ? totalSales / transactionCount
          : 0

      // --------------------------------------------------------
      // Offline pending sales
      //
      // These are shown ONLY as sync status.
      // They are NOT added to today's sales total.
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

      setOnline(true)
    } catch (error) {
      console.error(
        'Failed to load todays report:',
        error,
      )

      setOnline(false)

      /*
       * Do not erase existing numbers during a temporary
       * network/realtime failure.
       */
    }
  }, [])

  // ==========================================================
  // INITIAL LOAD + REALTIME
  // ==========================================================

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      await loadMetrics()

      if (mounted) {
        setLoading(false)
      }
    }

    initialize()

    const supabase = createClient()

    const channel = supabase
      .channel('reports-today-sales')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          loadMetrics()
        },
      )
      .subscribe((status) => {
        if (!mounted) return

        if (status === 'SUBSCRIBED') {
          setOnline(true)
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setOnline(false)
        }
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [loadMetrics])

  // ==========================================================
  // BROWSER ONLINE / OFFLINE
  // ==========================================================

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      loadMetrics()
    }

    const handleOffline = () => {
      setOnline(false)
    }

    setOnline(navigator.onLine)

    window.addEventListener(
      'online',
      handleOnline,
    )

    window.addEventListener(
      'offline',
      handleOffline,
    )

    return () => {
      window.removeEventListener(
        'online',
        handleOnline,
      )

      window.removeEventListener(
        'offline',
        handleOffline,
      )
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

  const navigateTo = (
    report: 'daily' | 'weekly' | 'monthly' | 'range',
  ) => {
    router.push(`/${locale}/reports/${report}`)
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F4EB] px-4 pb-24 pt-5">
        <div className="mx-auto max-w-md space-y-4">

          <div className="flex items-center justify-between">
            <div className="h-9 w-28 animate-pulse rounded-xl bg-white" />
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white" />
          </div>

          <div className="h-28 animate-pulse rounded-2xl bg-[#8B2635]/15" />

          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
          </div>

          <div className="h-16 animate-pulse rounded-xl bg-white" />
          <div className="h-20 animate-pulse rounded-2xl bg-white" />
          <div className="h-20 animate-pulse rounded-2xl bg-white" />
          <div className="h-20 animate-pulse rounded-2xl bg-white" />
          <div className="h-20 animate-pulse rounded-2xl bg-white" />
        </div>
      </main>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#F7F4EB] px-4 pb-24 pt-4 font-['DM_Sans',sans-serif]">
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
            className="flex items-center gap-1.5 rounded-xl border border-[#2B1E1A]/10 bg-white px-3 py-2 text-xs font-bold text-[#5A3E38] shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#8B2635]" />

            {t(
              'POS Terminal',
              'ሽያጭ',
            )}
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
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

        </header>

        {/* ====================================================
            TITLE
        ==================================================== */}

        <section className="mb-5">

          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#8B2635]" />

            <h1 className="font-['Playfair_Display',serif] text-2xl font-black text-[#2B1E1A]">
              {t(
                'Reports',
                'ሪፖርቶች',
              )}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#9B7B74]">
            <CalendarDays className="h-3.5 w-3.5" />

            <span>{todayLabel}</span>
          </div>

        </section>

        {/* ====================================================
            TODAY'S SALES
        ==================================================== */}

        <section className="mb-3 overflow-hidden rounded-2xl bg-[#8B2635] shadow-md">

          <div className="p-5">

            <div className="mb-2 flex items-center justify-between">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                  {t(
                    "Today's Sales",
                    'የዛሬ ሽያጭ',
                  )}
                </p>

                <p className="mt-0.5 text-[10px] text-white/50">
                  {t(
                    'Business sales recorded today',
                    'ዛሬ የተመዘገበ የንግድ ሽያጭ',
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-2">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>

            </div>

            <div className="flex items-end gap-2">

              <h2 className="font-mono text-3xl font-black tracking-tight text-white">
                {formatETB(metrics.totalSales)}
              </h2>

              <span className="mb-1 text-xs font-bold text-white/60">
                ETB
              </span>

            </div>

          </div>

          <div className="grid grid-cols-2 border-t border-white/10 bg-black/10">

            <div className="p-3.5">
              <p className="text-[9px] text-white/50">
                {t(
                  'Transactions',
                  'ግብይቶች',
                )}
              </p>

              <p className="mt-0.5 font-mono text-sm font-black text-white">
                {metrics.transactionCount}
              </p>
            </div>

            <div className="border-l border-white/10 p-3.5">
              <p className="text-[9px] text-white/50">
                {t(
                  'Average Order',
                  'አማካይ ትዕዛዝ',
                )}
              </p>

              <p className="mt-0.5 font-mono text-sm font-black text-white">
                {formatETB(metrics.averageOrder)}{' '}
                <span className="text-[9px] font-bold text-white/50">
                  ETB
                </span>
              </p>
            </div>

          </div>

        </section>

        {/* ====================================================
            SYNC STATUS
        ==================================================== */}

        <section className="mb-5 rounded-xl border border-[#2B1E1A]/10 bg-white px-4 py-3 shadow-sm">

          <div className="flex items-center justify-between">

            <div className="flex min-w-0 items-center gap-2">

              {online ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Wifi className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <WifiOff className="h-3.5 w-3.5" />
                </span>
              )}

              <div className="min-w-0">

                <p className="truncate text-[10px] font-bold text-[#5A3E38]">
                  {online
                    ? t(
                        'Connected',
                        'ተገናኝቷል',
                      )
                    : t(
                        'Offline',
                        'ከመስመር ውጭ',
                      )}
                </p>

                <p className="text-[9px] text-[#9B7B74]">
                  {metrics.pendingSyncCount > 0
                    ? t(
                        `${metrics.pendingSyncCount} sale waiting to sync`,
                        `${metrics.pendingSyncCount} ሽያጭ ለማመሳሰል በመጠባበቅ ላይ`,
                      )
                    : t(
                        'All sales are synchronized',
                        'ሁሉም ሽያጮች ተመሳስለዋል',
                      )}
                </p>

              </div>

            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${
                metrics.pendingSyncCount > 0
                  ? 'bg-amber-50 text-amber-700'
                  : online
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {metrics.pendingSyncCount > 0
                ? t(
                    'SYNCING',
                    'በማመሳሰል ላይ',
                  )
                : online
                  ? t(
                      'UP TO DATE',
                      'ዘምኗል',
                    )
                  : t(
                      'OFFLINE',
                      'ከመስመር ውጭ',
                    )}
            </span>

          </div>

        </section>

        {/* ====================================================
            REPORT OPTIONS
        ==================================================== */}

        <section>

          <div className="mb-3 px-1">

            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9B7B74]">
              {t(
                'Business Reports',
                'የንግድ ሪፖርቶች',
              )}
            </p>

            <h3 className="mt-0.5 text-sm font-black text-[#2B1E1A]">
              {t(
                'Choose a report',
                'ሪፖርት ይምረጡ',
              )}
            </h3>

          </div>

          <div className="space-y-2.5">

            {/* ==================================================
                DAILY
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                navigateTo('daily')
              }
              className="group flex w-full items-center justify-between rounded-2xl border border-[#2B1E1A]/10 bg-white p-4 text-left shadow-sm transition hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.99]"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>

                  <h4 className="text-sm font-black text-[#2B1E1A]">
                    {t(
                      'Daily Report',
                      'የዕለት ሪፖርት',
                    )}
                  </h4>

                  <p className="mt-0.5 text-[10px] text-[#9B7B74]">
                    {t(
                      "Today's sales, payments and cash",
                      'የዛሬ ሽያጭ፣ ክፍያ እና ካሽ',
                    )}
                  </p>

                </div>

              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

            {/* ==================================================
                WEEKLY
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                navigateTo('weekly')
              }
              className="group flex w-full items-center justify-between rounded-2xl border border-[#2B1E1A]/10 bg-white p-4 text-left shadow-sm transition hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.99]"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <BarChart3 className="h-5 w-5" />
                </div>

                <div>

                  <h4 className="text-sm font-black text-[#2B1E1A]">
                    {t(
                      'Weekly Analytics',
                      'የሳምንት ትንተና',
                    )}
                  </h4>

                  <p className="mt-0.5 text-[10px] text-[#9B7B74]">
                    {t(
                      "See this week's sales performance",
                      'የዚህን ሳምንት የሽያጭ አፈጻጸም ይመልከቱ',
                    )}
                  </p>

                </div>

              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

            {/* ==================================================
                MONTHLY
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                navigateTo('monthly')
              }
              className="group flex w-full items-center justify-between rounded-2xl border border-[#2B1E1A]/10 bg-white p-4 text-left shadow-sm transition hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.99]"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>

                <div>

                  <h4 className="text-sm font-black text-[#2B1E1A]">
                    {t(
                      'Monthly Summary',
                      'የወር ማጠቃለያ',
                    )}
                  </h4>

                  <p className="mt-0.5 text-[10px] text-[#9B7B74]">
                    {t(
                      "Review this month's performance",
                      'የዚህን ወር የንግድ አፈጻጸም ይመልከቱ',
                    )}
                  </p>

                </div>

              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

            {/* ==================================================
                DATE RANGE
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                navigateTo('range')
              }
              className="group flex w-full items-center justify-between rounded-2xl border border-[#2B1E1A]/10 bg-white p-4 text-left shadow-sm transition hover:border-[#8B2635]/20 hover:shadow-md active:scale-[0.99]"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#8B2635]">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>

                  <h4 className="text-sm font-black text-[#2B1E1A]">
                    {t(
                      'Custom Date Range',
                      'ብጁ የቀን ክልል',
                    )}
                  </h4>

                  <p className="mt-0.5 text-[10px] text-[#9B7B74]">
                    {t(
                      'Choose any dates to compare',
                      'የሚፈልጉትን የቀን ክልል ይምረጡ',
                    )}
                  </p>

                </div>

              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-[#9B7B74] transition-transform group-hover:translate-x-0.5" />

            </button>

          </div>

        </section>

        {/* ====================================================
            QUICK OWNER NOTE
        ==================================================== */}

        <section className="mt-5 rounded-xl border border-[#2B1E1A]/10 bg-white/70 px-4 py-3">

          <div className="flex items-start gap-2.5">

            <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8B2635]" />

            <p className="text-[9px] leading-4 text-[#9B7B74]">
              {t(
                'Sales reports are based on completed sales recorded in your business. Offline sales waiting to sync are shown only as a sync status and are not added again to avoid duplicate totals.',
                'የሽያጭ ሪፖርቶች በንግድዎ ላይ በተመዘገቡ የተጠናቀቁ ሽያጮች ላይ የተመሰረቱ ናቸው። ከመስመር ውጭ ያሉ እና ለማመሳሰል የሚጠብቁ ሽያጮች ድግግሞሽ እንዳይፈጠር እንደገና በጠቅላላ ላይ አይጨመሩም።',
              )}
            </p>

          </div>

        </section>

      </div>
    </main>
  )
}