// src/app/[locale]/(app)/reports/daily/page.tsx

'use client'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useParams,
  useRouter,
} from 'next/navigation'

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Share2,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react'

import {
  getDailyReport,
} from '@/lib/reports/daily-report.service'

import type {
  DailyReport,
  LowStockSummary,
} from '@/lib/reports/report.types'

import {
  useBusinessContext,
} from '@/lib/auth/useBusinessContext'

/* ============================================================
   HELPERS
============================================================ */

function numberValue(value: unknown): number {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString()} ETB`
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString()
}

/* ============================================================
   PAGE
============================================================ */

export default function DailyReportPage() {
  const params = useParams()
  const router = useRouter()

  const locale = String(params.locale || 'en')
  const isAm = locale === 'am'

  /* ==========================================================
     BUSINESS CONTEXT
  ========================================================== */

  const {
    businessId,
    branchId,
    userId,
    loading: contextLoading,
    error: contextError,
    refresh: refreshContext,
  } = useBusinessContext()

  /* ==========================================================
     STATE
  ========================================================== */

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [report, setReport] =
    useState<DailyReport | null>(null)

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null)

  /* ==========================================================
     TRANSLATION
  ========================================================== */

  const t = useCallback(
    (en: string, am: string) => {
      return isAm ? am : en
    },
    [isAm],
  )

  /* ==========================================================
     LOAD REPORT
  ========================================================== */

  const loadReport = useCallback(
    async (showRefresh = false) => {
      if (
        !businessId ||
        !branchId ||
        !userId
      ) {
        return
      }

      try {
        if (showRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        const dailyReport =
          await getDailyReport({
            businessId,
            branchId,
            userId,
            date: new Date(),
            allowRemote: true,
          })

        setReport(dailyReport)

        const updatedValue =
          dailyReport.sync?.lastUpdated

        if (updatedValue) {
          const updated =
            new Date(updatedValue)

          if (
            !Number.isNaN(
              updated.getTime(),
            )
          ) {
            setLastUpdated(updated)
          }
        }
      } catch (error) {
        console.error(
          '[DailyReport] Failed to load report:',
          error,
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      businessId,
      branchId,
      userId,
    ],
  )

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    if (contextLoading) {
      return
    }

    if (
      !businessId ||
      !branchId ||
      !userId
    ) {
      setLoading(false)
      return
    }

    void loadReport()
  }, [
    contextLoading,
    businessId,
    branchId,
    userId,
    loadReport,
  ])

  /* ==========================================================
     SAFE REPORT DATA
  ========================================================== */

  const financials =
    report?.financials

  const expenses =
    report?.expenses

  const inventory =
    report?.inventory

  const categories =
    report?.categories ?? []

  const products =
    report?.products ?? []

  const activeShift =
    report?.activeShift ?? null

  const sync =
    report?.sync

  /* ==========================================================
     FINANCIAL VALUES
  ========================================================== */

  const salesTotal =
    numberValue(
      financials?.revenue,
    )

  const grossProfit =
    numberValue(
      financials?.grossProfit,
    )

  const netProfit =
    numberValue(
      financials?.netProfit,
    )

  const totalReceived =
    numberValue(
      financials?.totalReceived ??
        financials?.revenue,
    )

  const tips =
    numberValue(
      financials?.tips,
    )

  const expenseTotal =
    numberValue(
      expenses?.total,
    )

  /*
   * IMPORTANT:
   * DailyFinancialSummary already contains these values.
   *
   * Do NOT use:
   * report.summary.orders
   * report.summary.itemsSold
   */

  const orderCount =
    numberValue(
      financials?.transactions,
    )

  const itemsSold =
    numberValue(
      financials?.itemsSold,
    )

  /* ==========================================================
     PAYMENT SUMMARY
  ========================================================== */

  const paymentSummary =
    useMemo(() => {
      return [
        {
          label: 'Cash',
          am: 'ካሽ',
          amount: numberValue(
            financials?.cash,
          ),
        },
        {
          label: 'Telebirr',
          am: 'ቴሌብር',
          amount: numberValue(
            financials?.telebirr,
          ),
        },
        {
          label: 'Bank',
          am: 'ባንክ',
          amount: numberValue(
            financials?.bank,
          ),
        },
        {
          label: 'Card',
          am: 'ካርድ',
          amount: numberValue(
            financials?.card,
          ),
        },
        {
          label: 'Other',
          am: 'ሌላ',
          amount: numberValue(
            financials?.other,
          ),
        },
      ]
    }, [financials])

  const paymentTotal =
    useMemo(() => {
      return paymentSummary.reduce(
        (sum, payment) =>
          sum + payment.amount,
        0,
      )
    }, [paymentSummary])

  /* ==========================================================
     EXPENSE CATEGORIES
  ========================================================== */

  const expenseCategories =
    useMemo(() => {
      return expenses?.byCategory ?? []
    }, [expenses])

  const expenseTransactionCount =
    numberValue(
      expenses?.transactions,
    )

  /* ==========================================================
     PRODUCT REPORT
  ========================================================== */

  const productReport =
    useMemo(() => {
      return [...products]
        .sort(
          (a, b) =>
            numberValue(b.revenue) -
            numberValue(a.revenue),
        )
        .slice(0, 20)
    }, [products])

  /* ==========================================================
     CATEGORY REPORT
  ========================================================== */

  const categoryReport =
    useMemo(() => {
      return [...categories].sort(
        (a, b) =>
          numberValue(b.revenue) -
          numberValue(a.revenue),
      )
    }, [categories])

  /* ==========================================================
     INVENTORY
  ========================================================== */

  /*
   * IMPORTANT:
   *
   * DailyInventorySummary defines:
   *
   * lowStock: LowStockSummary[]
   *
   * It does NOT define:
   *
   * lowStockProducts
   */

  const lowStockProducts =
    useMemo<LowStockSummary[]>(() => {
      return inventory?.lowStock ?? []
    }, [inventory])

  const lowStockCount =
    numberValue(
      inventory?.lowStockCount,
    )

  const outOfStockCount =
    numberValue(
      inventory?.outOfStockCount,
    )

  /* ==========================================================
     SHIFT / CASH
  ========================================================== */

  const openingCash =
    numberValue(
      activeShift?.opening_cash,
    )

  const cashSales =
    numberValue(
      financials?.cash,
    )

  const expectedCash =
    openingCash + cashSales

  const actualCash =
    activeShift?.actual_cash != null
      ? numberValue(
          activeShift.actual_cash,
        )
      : null

  const cashDifference =
    actualCash != null
      ? actualCash - expectedCash
      : null

  /* ==========================================================
     SYNC
  ========================================================== */

  const remoteAvailable =
    sync?.remoteAvailable ?? false

  const remoteSalesCount =
    numberValue(
      sync?.remoteSales,
    )

  const localOnlySalesCount =
    numberValue(
      sync?.localOnlySales,
    )

  /* ==========================================================
     DATE
  ========================================================== */

  const reportDate =
    useMemo(() => {
      return new Date().toLocaleDateString(
        isAm ? 'am-ET' : 'en-ET',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      )
    }, [isAm])

  /* ==========================================================
     SHARE REPORT
  ========================================================== */

  const shareReport =
    useCallback(async () => {
      const text = [
        'LIYU POS — DAILY REPORT',
        reportDate,
        '',
        `Sales: ${formatMoney(
          salesTotal,
        )}`,
        `Tips: ${formatMoney(
          tips,
        )}`,
        `Total Received: ${formatMoney(
          totalReceived,
        )}`,
        `Expenses: ${formatMoney(
          expenseTotal,
        )}`,
        `Net Profit: ${formatMoney(
          netProfit,
        )}`,
        '',
        `Orders: ${formatNumber(
          orderCount,
        )}`,
        `Items Sold: ${formatNumber(
          itemsSold,
        )}`,
        '',
        'PAYMENTS',
        `Cash: ${formatMoney(
          numberValue(
            financials?.cash,
          ),
        )}`,
        `Telebirr: ${formatMoney(
          numberValue(
            financials?.telebirr,
          ),
        )}`,
        `Bank: ${formatMoney(
          numberValue(
            financials?.bank,
          ),
        )}`,
        `Card: ${formatMoney(
          numberValue(
            financials?.card,
          ),
        )}`,
        `Other: ${formatMoney(
          numberValue(
            financials?.other,
          ),
        )}`,
        '',
        `Shift: ${
          activeShift
            ? 'Open'
            : 'Closed'
        }`,
      ].join('\n')

      try {
        if (
          typeof navigator !==
            'undefined' &&
          navigator.share
        ) {
          await navigator.share({
            title:
              'Liyu POS Daily Report',
            text,
          })

          return
        }

        if (
          typeof navigator !==
            'undefined' &&
          navigator.clipboard
        ) {
          await navigator.clipboard.writeText(
            text,
          )

          window.alert(
            t(
              'Report copied to clipboard.',
              'ሪፖርቱ ወደ clipboard ተቀድቷል።',
            ),
          )
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            'AbortError'
        ) {
          return
        }

        console.error(
          '[DailyReport] Unable to share:',
          error,
        )
      }
    }, [
      reportDate,
      salesTotal,
      tips,
      totalReceived,
      expenseTotal,
      netProfit,
      orderCount,
      itemsSold,
      financials,
      activeShift,
      t,
    ])

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    contextLoading ||
    loading
  ) {
    return (
      <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8B2635] flex items-center justify-center shadow-sm">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>

          <p className="text-sm font-black text-[#5A3E38]">
            {t(
              'Preparing today’s report...',
              'የዛሬን ሪፖርት በማዘጋጀት ላይ...',
            )}
          </p>

          <p className="text-[10px] text-slate-400">
            {t(
              'Checking local and remote records',
              'የlocal እና remote መረጃዎችን በመፈተሽ ላይ',
            )}
          </p>
        </div>
      </div>
    )
  }

  /* ==========================================================
     CONTEXT ERROR
  ========================================================== */

  if (
    !businessId ||
    !branchId ||
    !userId
  ) {
    return (
      <main className="min-h-screen bg-[#F7F4EB] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-[#2B1E1A]/10 shadow-sm p-6 text-center">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>

          <h1 className="mt-4 text-base font-black text-[#2B1E1A]">
            {t(
              'Business context unavailable',
              'የንግድ መረጃ አልተገኘም',
            )}
          </h1>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {contextError ||
              t(
                'Your account is not currently connected to a business and branch.',
                'የእርስዎ መለያ ከንግድ እና ቅርንጫፍ ጋር አልተገናኘም።',
              )}
          </p>

          <button
            type="button"
            onClick={() => {
              void refreshContext()
            }}
            className="mt-5 h-10 px-4 rounded-xl bg-[#8B2635] text-white text-xs font-black hover:bg-[#76202E] active:scale-95 transition"
          >
            {t(
              'Try Again',
              'እንደገና ሞክር',
            )}
          </button>
        </div>
      </main>
    )
  }

  /* ==========================================================
     MAIN PAGE
  ========================================================== */

  return (
    <main className="min-h-screen bg-[#F7F4EB] pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${locale}/reports`,
                )
              }
              className="w-10 h-10 shrink-0 rounded-xl bg-white border border-[#2B1E1A]/10 shadow-sm flex items-center justify-center text-[#5A3E38] hover:bg-[#FAF8F2] active:scale-95 transition"
              aria-label={t(
                'Back',
                'ተመለስ',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-xl sm:text-2xl font-black text-[#2B1E1A]">
                  {t(
                    'Daily Business Report',
                    'የዕለት የንግድ ሪፖርት',
                  )}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black ${
                    activeShift
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeShift
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                  />

                  {activeShift
                    ? t(
                        'Shift Open',
                        'ፈረቃ ክፍት',
                      )
                    : t(
                        'Shift Closed',
                        'ፈረቃ ተዘግቷል',
                      )}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">

                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {reportDate}
                </span>

                {lastUpdated && (
                  <span className="hidden sm:flex items-center gap-1">
                    <Clock3 className="w-3 h-3" />

                    {lastUpdated.toLocaleTimeString(
                      isAm
                        ? 'am-ET'
                        : 'en-ET',
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <div
              className={`hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl border text-[10px] font-bold ${
                remoteAvailable
                  ? 'bg-white border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {remoteAvailable ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}

              {remoteAvailable
                ? t(
                    'Remote connected',
                    'Remote ተገናኝቷል',
                  )
                : t(
                    'Remote unavailable',
                    'Remote አልተገናኘም',
                  )}
            </div>

            <button
              type="button"
              onClick={() =>
                void loadReport(true)
              }
              disabled={refreshing}
              className="h-10 px-3 rounded-xl bg-white border border-[#2B1E1A]/10 shadow-sm text-[#5A3E38] text-xs font-bold flex items-center gap-2 hover:bg-[#FAF8F2] disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              {t(
                'Refresh',
                'አድስ',
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                void shareReport()
              }
              className="h-10 px-3 rounded-xl bg-[#8B2635] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-[#76202E] active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5" />

              {t(
                'Share',
                'አጋራ',
              )}
            </button>
          </div>
        </header>

        {/* ======================================================
            KPI CARDS
        ====================================================== */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* TOTAL RECEIVED */}

          <div className="rounded-2xl bg-[#8B2635] p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-white/60">
                  {t(
                    'Total Received',
                    'ጠቅላላ የተቀበለ',
                  )}
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black text-white font-mono">
                  {formatMoney(
                    totalReceived,
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-white" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-white/55">
              {formatMoney(
                salesTotal,
              )}{' '}
              {t(
                'sales + tips',
                'ሽያጭ + ጉርሻ',
              )}
            </p>
          </div>

          {/* EXPENSES */}

          <div className="rounded-2xl bg-white border border-[#2B1E1A]/10 p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-400">
                  {t(
                    'Expenses',
                    'ወጪ',
                  )}
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black text-[#2B1E1A] font-mono">
                  {formatMoney(
                    expenseTotal,
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {formatNumber(
                expenseTransactionCount,
              )}{' '}
              {t(
                'expense records',
                'የወጪ መዝገቦች',
              )}
            </p>
          </div>

          {/* NET PROFIT */}

          <div className="rounded-2xl bg-white border border-[#2B1E1A]/10 p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-400">
                  {t(
                    'Net Profit',
                    'የተጣራ ትርፍ',
                  )}
                </p>

                <p
                  className={`mt-2 text-xl sm:text-2xl font-black font-mono ${
                    netProfit >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatMoney(
                    netProfit,
                  )}
                </p>
              </div>

              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  netProfit >= 0
                    ? 'bg-emerald-50'
                    : 'bg-rose-50'
                }`}
              >
                {netProfit >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                )}
              </div>
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {t(
                'After expenses',
                'ከወጪ በኋላ',
              )}
            </p>
          </div>

          {/* ORDERS */}

          <div className="rounded-2xl bg-white border border-[#2B1E1A]/10 p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-400">
                  {t(
                    'Orders',
                    'ትዕዛዞች',
                  )}
                </p>

                <p className="mt-2 text-xl sm:text-2xl font-black text-[#2B1E1A] font-mono">
                  {formatNumber(
                    orderCount,
                  )}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {formatNumber(
                itemsSold,
              )}{' '}
              {t(
                'items sold',
                'እቃዎች ተሸጡ',
              )}
            </p>
          </div>
        </section>

        {/* ======================================================
            REPORT DATA / SYNC
        ====================================================== */}

        <section className="rounded-2xl bg-white border border-[#2B1E1A]/10 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {t(
                  'Report Data',
                  'የሪፖርት መረጃ',
                )}
              </p>

              <p className="mt-1 text-xs font-bold text-[#2B1E1A]">
                {t(
                  'Remote records are combined with genuinely local-only offline transactions.',
                  'Remote መረጃ ከበእውነት local-only offline ግብይቶች ጋር ተጣምሯል።',
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">
                <Wifi className="w-3 h-3" />

                {formatNumber(
                  remoteSalesCount,
                )}{' '}

                {t(
                  'remote sales',
                  'remote ሽያጭ',
                )}
              </span>

              {localOnlySalesCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5 text-[9px] font-bold text-amber-700">
                  <WifiOff className="w-3 h-3" />

                  {formatNumber(
                    localOnlySalesCount,
                  )}{' '}

                  {t(
                    'offline only',
                    'offline ብቻ',
                  )}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================
            FINANCIAL + EXPENSE
        ====================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* FINANCIAL OVERVIEW */}

          <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8B2635]" />

              <div>
                <h2 className="text-sm font-black text-[#2B1E1A]">
                  {t(
                    'Financial Overview',
                    'የገንዘብ አጠቃላይ እይታ',
                  )}
                </h2>

                <p className="text-[10px] text-slate-400">
                  {t(
                    'Where the business stands today',
                    'የንግዱ የዛሬ ሁኔታ',
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t(
                    'Sales',
                    'ሽያጭ',
                  )}
                </span>

                <span className="font-mono text-sm font-black text-[#2B1E1A]">
                  {formatMoney(
                    salesTotal,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t(
                    'Tips',
                    'ጉርሻ',
                  )}
                </span>

                <span className="font-mono text-sm font-bold text-[#2B1E1A]">
                  {formatMoney(
                    tips,
                  )}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2B1E1A]">
                  {t(
                    'Total Received',
                    'ጠቅላላ የተቀበለ',
                  )}
                </span>

                <span className="font-mono text-base font-black text-[#8B2635]">
                  {formatMoney(
                    totalReceived,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t(
                    'Expenses',
                    'ወጪ',
                  )}
                </span>

                <span className="font-mono text-sm font-black text-rose-600">
                  - {formatMoney(
                    expenseTotal,
                  )}
                </span>
              </div>

              <div className="rounded-xl bg-[#F7F4EB] px-3.5 py-3 flex items-center justify-between">
                <span className="text-xs font-black text-[#2B1E1A]">
                  {t(
                    'Net Profit',
                    'የተጣራ ትርፍ',
                  )}
                </span>

                <span
                  className={`font-mono text-base font-black ${
                    netProfit >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatMoney(
                    netProfit,
                  )}
                </span>
              </div>

              {grossProfit !== 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    {t(
                      'Gross Profit',
                      'ጠቅላላ ትርፍ',
                    )}
                  </span>

                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {formatMoney(
                      grossProfit,
                    )}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* EXPENSES */}

          <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />

              <div>
                <h2 className="text-sm font-black text-[#2B1E1A]">
                  {t(
                    'Today’s Expenses',
                    'የዛሬ ወጪዎች',
                  )}
                </h2>

                <p className="text-[10px] text-slate-400">
                  {t(
                    'Money spent by expense category',
                    'በወጪ ምድብ የወጣ ገንዘብ',
                  )}
                </p>
              </div>
            </div>

            <div className="p-4">

              {expenseCategories.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-slate-400">
                    {t(
                      'No expenses recorded today.',
                      'ዛሬ ምንም ወጪ አልተመዘገበም።',
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenseCategories.map(
                    (item) => {
                      const amount =
                        numberValue(
                          item.amount,
                        )

                      const percentage =
                        expenseTotal > 0
                          ? (amount /
                              expenseTotal) *
                            100
                          : 0

                      return (
                        <div
                          key={
                            item.category
                          }
                        >
                          <div className="flex items-center justify-between mb-1">

                            <span className="text-xs font-bold text-[#2B1E1A]">
                              {
                                item.category
                              }
                            </span>

                            <span className="font-mono text-xs font-black text-rose-600">
                              {formatMoney(
                                amount,
                              )}
                            </span>
                          </div>

                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-400"
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}

              {expenseTotal > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black">
                    {t(
                      'Total Expenses',
                      'ጠቅላላ ወጪ',
                    )}
                  </span>

                  <span className="font-mono font-black text-rose-600">
                    {formatMoney(
                      expenseTotal,
                    )}
                  </span>
                </div>
              )}
            </div>
          </section>
        </section>

        {/* ======================================================
            PAYMENTS
        ====================================================== */}

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Payment Summary',
                  'የክፍያ ማጠቃለያ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'How customers paid today',
                  'ደንበኞች ዛሬ እንዴት እንደከፈሉ',
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100">

            {paymentSummary.map(
              (item) => (
                <div
                  key={item.label}
                  className="p-4"
                >
                  <p className="text-[9px] font-bold text-slate-400">
                    {t(
                      item.label,
                      item.am,
                    )}
                  </p>

                  <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                    {formatMoney(
                      item.amount,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="px-4 py-3 bg-[#F7F4EB]/60 border-t border-slate-100 flex items-center justify-between">

            <span className="text-xs font-black">
              {t(
                'Payment Total',
                'ጠቅላላ ክፍያ',
              )}
            </span>

            <span className="font-mono font-black text-[#8B2635]">
              {formatMoney(
                paymentTotal,
              )}
            </span>
          </div>
        </section>

        {/* ======================================================
            PRODUCTS SOLD
        ====================================================== */}

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Products Sold Today',
                  'ዛሬ የተሸጡ ምርቶች',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Best-selling products by quantity and revenue',
                  'በብዛትና በገቢ የተሸጡ ምርቶች',
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">

              <thead className="bg-slate-50">
                <tr>

                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    #
                  </th>

                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Product',
                      'ምርት',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Qty',
                      'ብዛት',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Revenue',
                      'ገቢ',
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>

                {productReport.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-xs text-slate-400"
                    >
                      {t(
                        'No product sales recorded today.',
                        'ዛሬ ምንም የምርት ሽያጭ አልተመዘገበም።',
                      )}
                    </td>
                  </tr>
                ) : (
                  productReport.map(
                    (product, index) => (
                      <tr
                        key={
                          product.id ??
                          `${product.name}-${index}`
                        }
                        className="border-t border-slate-100 hover:bg-slate-50/70"
                      >

                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-[#2B1E1A]">
                            {product.name ||
                              t(
                                'Unknown Product',
                                'ያልታወቀ ምርት',
                              )}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-[#5A3E38]">
                          {formatNumber(
                            numberValue(
                              product.quantity,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                          {formatMoney(
                            numberValue(
                              product.revenue,
                            ),
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ======================================================
            CATEGORY REPORT
        ====================================================== */}

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Sales by Category',
                  'ሽያጭ በምድብ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Which category generated the most sales',
                  'የትኛው ምድብ ብዙ ሽያጭ እንዳመጣ',
                )}
              </p>
            </div>
          </div>

          <div className="p-4">

            {categoryReport.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t(
                  'No category data available.',
                  'የምድብ መረጃ የለም።',
                )}
              </div>
            ) : (
              <div className="space-y-4">

                {categoryReport.map(
                  (category) => {
                    const revenue =
                      numberValue(
                        category.revenue,
                      )

                    const quantity =
                      numberValue(
                        category.quantity,
                      )

                    const percentage =
                      salesTotal > 0
                        ? (revenue /
                            salesTotal) *
                          100
                        : 0

                    return (
                      <div
                        key={
                          category.id ??
                          category.name
                        }
                      >

                        <div className="flex items-center justify-between mb-1">

                          <div>
                            <p className="text-xs font-black text-[#2B1E1A]">
                              {
                                category.name
                              }
                            </p>

                            <p className="text-[9px] text-slate-400">
                              {formatNumber(
                                quantity,
                              )}{' '}
                              {t(
                                'items',
                                'እቃዎች',
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-black font-mono text-emerald-700">
                              {formatMoney(
                                revenue,
                              )}
                            </p>

                            <p className="text-[9px] text-slate-400">
                              {Math.round(
                                percentage,
                              )}
                              %
                            </p>
                          </div>
                        </div>

                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#8B2635] rounded-full"
                            style={{
                              width: `${Math.min(
                                percentage,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            SHIFT & CASH
        ====================================================== */}

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#8B2635]" />

            <div>
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Shift & Cash Check',
                  'የፈረቃና የካሽ ማረጋገጫ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Expected cash compared with counted cash',
                  'መኖር ያለበት ካሽ ከተቆጠረው ካሽ ጋር',
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Opening Cash',
                  'የመነሻ ካሽ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                {formatMoney(
                  openingCash,
                )}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Cash Sales',
                  'የካሽ ሽያጭ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                {formatMoney(
                  cashSales,
                )}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Expected Cash',
                  'መኖር ያለበት ካሽ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#8B2635]">
                {formatMoney(
                  expectedCash,
                )}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400">
                {t(
                  'Actual Cash',
                  'ትክክለኛ ካሽ',
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-[#2B1E1A]">
                {actualCash == null
                  ? '—'
                  : formatMoney(
                      actualCash,
                    )}
              </p>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-[#F7F4EB]/50 flex items-center justify-between">

            <span className="text-xs font-black">
              {t(
                'Difference',
                'ልዩነት',
              )}
            </span>

            {cashDifference == null ? (
              <span className="text-[10px] text-slate-400 font-bold">
                {t(
                  'Cash has not been counted yet',
                  'ካሽ ገና አልተቆጠረም',
                )}
              </span>
            ) : cashDifference === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-700">

                <CheckCircle2 className="w-3.5 h-3.5" />

                {t(
                  'Balanced',
                  'ተመጣጣኝ',
                )}
              </span>
            ) : (
              <span
                className={`font-mono text-xs font-black ${
                  cashDifference < 0
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}
              >
                {cashDifference > 0
                  ? '+'
                  : ''}

                {formatMoney(
                  cashDifference,
                )}
              </span>
            )}
          </div>
        </section>

        {/* ======================================================
            INVENTORY ALERT
        ====================================================== */}

        <section className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm overflow-hidden">

          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">

            <Package className="w-4 h-4 text-[#8B2635]" />

            <div className="flex-1">
              <h2 className="text-sm font-black text-[#2B1E1A]">
                {t(
                  'Inventory Alert',
                  'የክምችት ማስጠንቀቂያ',
                )}
              </h2>

              <p className="text-[10px] text-slate-400">
                {t(
                  'Products approaching or below their minimum stock',
                  'ዝቅተኛ ክምችት ላይ ያሉ ምርቶች',
                )}
              </p>
            </div>

            {lowStockCount > 0 && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[460px] text-sm">

              <thead className="bg-slate-50">
                <tr>

                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Product',
                      'ምርት',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Current',
                      'አሁን',
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-slate-400 font-black">
                    {t(
                      'Minimum',
                      'ዝቅተኛ',
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>

                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center"
                    >
                      <span className="text-xs font-bold text-emerald-700">
                        {t(
                          'Inventory levels look healthy.',
                          'የክምችት መጠን ጥሩ ነው።',
                        )}
                      </span>
                    </td>
                  </tr>
                ) : (
                  lowStockProducts
                    .slice(0, 8)
                    .map(
                      (
                        product: LowStockSummary,
                      ) => {
                        /*
                         * LowStockSummary fields:
                         *
                         * quantity  -> current stock
                         * alertLevel -> minimum/reorder level
                         */

                        const stock =
                          numberValue(
                            product.quantity,
                          )

                        const threshold =
                          numberValue(
                            product.alertLevel,
                          )

                        return (
                          <tr
                            key={
                              product.id
                            }
                            className="border-t border-slate-100"
                          >

                            <td className="px-4 py-3 font-bold text-[#2B1E1A]">
                              {
                                product.name
                              }
                            </td>

                            <td
                              className={`px-4 py-3 text-right font-mono font-black ${
                                stock <= 0
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {formatNumber(
                                stock,
                              )}
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-slate-500">
                              {formatNumber(
                                threshold,
                              )}
                            </td>
                          </tr>
                        )
                      },
                    )
                )}
              </tbody>
            </table>
          </div>

          {(lowStockCount > 0 ||
            outOfStockCount > 0) && (
            <div className="px-4 py-3 border-t border-slate-100 bg-amber-50/50 flex flex-wrap gap-3 text-[10px] font-bold">

              {lowStockCount > 0 && (
                <span className="text-amber-700">
                  {formatNumber(
                    lowStockCount,
                  )}{' '}

                  {t(
                    'low stock',
                    'ዝቅተኛ ክምችት',
                  )}
                </span>
              )}

              {outOfStockCount > 0 && (
                <span className="text-rose-600">
                  {formatNumber(
                    outOfStockCount,
                  )}{' '}

                  {t(
                    'out of stock',
                    'ከክምችት ውጭ',
                  )}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer className="px-4 pt-1 text-center">

          <p className="text-[10px] leading-relaxed text-slate-400">
            {t(
              'Remote synced records are used as the primary source. Local records are included only when their transaction ID does not already exist remotely, preventing duplicate sales after synchronization.',
              'Remote የተመሳሰሉ መረጃዎች ዋና የሪፖርት ምንጭ ናቸው። Local መረጃ የሚጨመረው የግብይቱ ID remote ላይ ከሌለ ብቻ ነው፣ ይህም ከsync በኋላ ድግግሞሽን ይከላከላል።',
            )}
          </p>

          <p className="mt-1 text-[9px] text-slate-300">
            Liyu POS •{' '}
            {remoteAvailable
              ? t(
                  'Remote + Offline',
                  'Remote + Offline',
                )
              : t(
                  'Offline mode',
                  'Offline ሁኔታ',
                )}
          </p>
        </footer>
      </div>
    </main>
  )
}


