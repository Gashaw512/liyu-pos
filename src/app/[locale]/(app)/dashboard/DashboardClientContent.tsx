// src/app/[locale]/(app)/dashboard/DashboardClientContent.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react'

import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { OwnerActionHeader } from '@/components/dashboard/OwnerActionHeader'
import { CategoryPerformanceTable } from '@/components/dashboard/CategoryPerformanceTable'
import { LowStockWarningsTable } from '@/components/dashboard/LowStockWarningsTable'
import { DataRow, MetricCard, SectionHeader } from '@/components/shared/ReportPrimitives'

import DashboardPeriodFilter from './DashboardPeriodFilter'

/* ============================================================
   TYPES
============================================================ */

interface CategoryPerformance {
  name: string
  itemsSold: number
  revenue: number
  grossProfit?: number
}

interface LowStockItem {
  id: string
  name: string
  category: string
  stock: number
}

interface DashboardClientProps {
  locale: string
  role: string
  roles?: string[]
  businessName: string

  initialProductCount: number
  initialCategoryCount: number

  categoryBreakdown: CategoryPerformance[]
  lowStockAlerts: LowStockItem[]

  periodLabel: string
  periodFrom: string
  periodTo: string

  periodRevenue: number
  periodTransactionCount: number

  periodGrossProfit: number
  periodExpenses: number
  periodNetProfit: number

  periodDiscounts: number
  periodTax: number

  averageTicketSize: number

  pendingSyncCount: number

  hasActiveShift: boolean
  openShiftCount: number
}

/* ============================================================
   COMPONENT
============================================================ */

export default function DashboardClientContent({
  locale,
  role,
  roles = [role],
  businessName,

  initialProductCount,
  initialCategoryCount,
  categoryBreakdown,
  lowStockAlerts,

  periodLabel,
  periodFrom,
  periodTo,

  periodRevenue,
  periodTransactionCount,

  periodExpenses,
  periodNetProfit,

  averageTicketSize,

  pendingSyncCount,

  hasActiveShift: initialHasActiveShift,
  openShiftCount,
}: DashboardClientProps) {
  const router = useRouter()

  const isAm = locale === 'am'

  const [isVoicePlaying, setIsVoicePlaying] =
    useState(false)

  /* ==========================================================
     TRANSLATION
  ========================================================== */

  const t = (
    en: string,
    am: string,
  ) => (isAm ? am : en)

  /* ==========================================================
     BUSINESS STATE
  ========================================================== */

  const hasActiveShift =
    initialHasActiveShift ||
    openShiftCount > 0

  const isOwnerOrManager =
    roles.includes('owner') ||
    roles.includes('manager')

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const totalProducts =
    initialProductCount

  const totalItemsSold =
    categoryBreakdown.reduce(
      (total, item) =>
        total + item.itemsSold,
      0,
    )

  const outOfStockCount =
    lowStockAlerts.filter(
      item => item.stock <= 0,
    ).length

  const lowStockCount =
    lowStockAlerts.filter(
      item => item.stock > 0,
    ).length

  /* ==========================================================
     FORMATTING
  ========================================================== */

  const formatMoney = (
    value: number,
  ) =>
    value.toLocaleString(
      isAm ? 'am-ET' : 'en-ET',
      {
        maximumFractionDigits: 2,
      },
    )

  const formatNumber = (
    value: number,
  ) =>
    value.toLocaleString(
      isAm ? 'am-ET' : 'en-ET',
    )

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const goTo = (
    path: string,
  ) => {
    router.push(
      `/${locale}${path}`,
    )
  }

  const goToSales = () =>
    goTo('/sales')

  const goToInventory = () =>
    goTo('/inventory')

  const goToShifts = () =>
    goTo('/shifts')

  const goToCloseDay = () =>
    goTo('/dashboard/close-day')

  const goToReports = () =>
    goTo('/reports')

  const goToExpenses = () =>
    goTo('/dashboard/expenses')

  /* ==========================================================
     VOICE BRIEFING
  ========================================================== */

  const handleVoiceGuidance = () => {
    if (
      !('speechSynthesis' in window)
    ) {
      return
    }

    window.speechSynthesis.cancel()

    if (isVoicePlaying) {
      setIsVoicePlaying(false)
      return
    }

    let spokenText = ''

    if (isAm) {
      spokenText =
        `እንኳን ደህና መጡ። ` +
        `${periodLabel} ${formatMoney(
          periodRevenue,
        )} ብር የሽያጭ ገቢ አለዎት። ` +
        `${formatNumber(
          periodTransactionCount,
        )} ግብይቶች ተመዝግበዋል። ` +
        `${formatNumber(
          totalItemsSold,
        )} እቃዎች ተሽጠዋል። ` +
        `የተጣራ ትርፍ ${formatMoney(
          periodNetProfit,
        )} ብር ነው። `

      if (openShiftCount > 0) {
        spokenText +=
          `${formatNumber(
            openShiftCount,
          )} ፈረቃ ክፍት ነው። `
      }

      if (lowStockAlerts.length > 0) {
        spokenText +=
          `${formatNumber(
            lowStockAlerts.length,
          )} እቃዎች የክምችት ትኩረት ይፈልጋሉ። `
      }

      if (pendingSyncCount > 0) {
        spokenText +=
          `${formatNumber(
            pendingSyncCount,
          )} ሽያጮች ለማመሳሰል እየጠበቁ ነው።`
      }
    } else {
      spokenText =
        `Welcome back. ` +
        `${periodLabel} you have made ` +
        `${formatMoney(
          periodRevenue,
        )} ETB from ` +
        `${formatNumber(
          periodTransactionCount,
        )} transactions. ` +
        `${formatNumber(
          totalItemsSold,
        )} items have been sold. ` +
        `Net profit is ` +
        `${formatMoney(
          periodNetProfit,
        )} ETB. `

      if (openShiftCount > 0) {
        spokenText +=
          `${formatNumber(
            openShiftCount,
          )} shift${openShiftCount === 1
            ? ''
            : 's'
          } currently open. `
      }

      if (lowStockAlerts.length > 0) {
        spokenText +=
          `${formatNumber(
            lowStockAlerts.length,
          )} items need stock attention. `
      }

      if (pendingSyncCount > 0) {
        spokenText +=
          `${formatNumber(
            pendingSyncCount,
          )} sales are waiting to sync.`
      }
    }

    const utterance =
      new SpeechSynthesisUtterance(
        spokenText,
      )

    utterance.lang = isAm
      ? 'am-ET'
      : 'en-US'

    utterance.rate = 0.9

    utterance.onend = () =>
      setIsVoicePlaying(false)

    utterance.onerror = () =>
      setIsVoicePlaying(false)

    setIsVoicePlaying(true)

    window.speechSynthesis.speak(
      utterance,
    )
  }

  /* ==========================================================
     CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {
      if (
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-2 pb-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <DashboardHeader
        businessName={businessName}
        isAm={isAm}
        isVoicePlaying={isVoicePlaying}
        onToggleVoice={handleVoiceGuidance}
        activeShift={hasActiveShift}
        onDayStatusClick={goToShifts}
        onCloseDay={
          hasActiveShift
            ? goToCloseDay
            : undefined
        }
        onOpenDay={
          !hasActiveShift
            ? goToShifts
            : undefined
        }
        onSalesClick={goToSales}
        onReceiveStockClick={
          goToInventory
        }
        onExpenseClick={
          goToExpenses
        }
        lowStockCount={
          lowStockCount
        }
        rightSlot={
          <DashboardPeriodFilter
            locale={locale}
            from={periodFrom}
            to={periodTo}
          />
        }
      />

      {/* ======================================================
          OWNER / MANAGER
      ====================================================== */}

      {isOwnerOrManager ? (
        <div className="space-y-4">
          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          {/* <OwnerActionHeader
            locale={locale}
          /> */}

          {(initialProductCount === 0 || initialCategoryCount === 0) && (
            <section className="flex flex-col gap-3 rounded-xl border border-coffee-200 bg-coffee-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-black text-coffee-900">
                  {initialCategoryCount === 0
                    ? t('Create your first category', 'የመጀመሪያ ምድብዎን ይፍጠሩ')
                    : t('Add your first products', 'የመጀመሪያ ምርቶችዎን ያክሉ')}
                </h2>
                <p className="mt-1 text-xs leading-5 text-coffee-600">
                  {initialCategoryCount === 0
                    ? t(
                      'Create a category first. You can add products to it next.',
                      'መጀመሪያ ምድብ ይፍጠሩ። ከዚያ ምርቶችን ወደዚያ ማከል ይችላሉ።',
                    )
                    : t(
                      'Your catalog has no products yet. Add real products and prices under one of your categories.',
                      'የምርት ዝርዝርዎ ገና ባዶ ነው። በምድቦችዎ ስር እውነተኛ ምርቶችንና ዋጋዎችን ያክሉ።',
                    )}
                </p>
                {initialCategoryCount > 0 && (
                  <p className="mt-1 text-[10px] font-bold text-coffee-500">
                    {t('Categories ready', 'የተዘጋጁ ምድቦች')}: {formatNumber(initialCategoryCount)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => goTo(initialCategoryCount === 0
                  ? '/management/categories/new'
                  : '/management/products/new')}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-coffee-900 px-4 text-xs font-bold text-white transition hover:bg-coffee-800"
              >
                {initialCategoryCount === 0
                  ? t('Create category', 'ምድብ ፍጠር')
                  : t('Add product', 'ምርት ጨምር')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          )}

          {/* ==================================================
              MAIN BUSINESS SUMMARY

              This is the most important section.
              Keep only the numbers an owner needs immediately.
          ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-coffee-100 bg-white shadow-sm">
            <SectionHeader
              eyebrow={periodLabel}
              title={t('Business Summary', 'የንግድ ማጠቃለያ')}
              right={(
                <button
                  type="button"
                  onClick={goToReports}
                  className="flex items-center gap-1 text-[11px] font-black text-berbere-600 hover:underline"
                >
                  {t('Reports', 'ሪፖርቶች')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              className="border-coffee-100"
            />

            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:p-4">
              <MetricCard
                label={t('Sales', 'ሽያጭ')}
                value={formatMoney(periodRevenue)}
                caption="ETB"
                icon={<Wallet className="h-4 w-4" />}
              />
              <MetricCard
                label={t('Net Profit', 'የተጣራ ትርፍ')}
                value={formatMoney(periodNetProfit)}
                caption="ETB"
                tone="profit"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard
                label={t('Items Sold', 'የተሸጡ እቃዎች')}
                value={formatNumber(totalItemsSold)}
                caption={t('items', 'እቃዎች')}
                icon={<ShoppingCart className="h-4 w-4" />}
              />
              <MetricCard
                label={t('Sales Made', 'የተደረጉ ሽያጮች')}
                value={formatNumber(periodTransactionCount)}
                caption={t('sales', 'ሽያጮች')}
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>

            <div className="grid grid-cols-2 divide-x divide-coffee-100 border-t border-coffee-100 bg-coffee-50/50 px-4">
              <DataRow
                label={t('Expenses', 'ወጪ')}
                value={`${formatMoney(periodExpenses)} ETB`}
                border={false}
                className="pr-3"
                valueClassName="text-coffee-800"
              />
              <DataRow
                label={t('Average Sale', 'አማካይ ሽያጭ')}
                value={`${formatMoney(averageTicketSize)} ETB`}
                border={false}
                className="pl-3"
                valueClassName="text-coffee-800"
              />
            </div>
          </section>

          {/* ==================================================
              TODAY / ACTIONS

              Instead of separate Operations + Attention cards,
              give the owner one place to see what needs action.
          ================================================== */}

          <section className="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-50">
                  <TriangleAlert className="h-4 w-4 text-gold-600" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-coffee-900">
                    {t(
                      'Needs Your Attention',
                      'ትኩረት የሚፈልጉ',
                    )}
                  </h3>

                  <p className="text-[10px] text-coffee-400">
                    {t(
                      'Things to check now',
                      'አሁን መመርመር የሚገባቸው',
                    )}
                  </p>
                </div>
              </div>

              {lowStockAlerts.length === 0 &&
                pendingSyncCount === 0 &&
                hasActiveShift && (
                  <CheckCircle2 className="h-5 w-5 text-berbere-600" />
                )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {/* LOW STOCK */}

              {lowStockAlerts.length > 0 ? (
                <button
                  type="button"
                  onClick={
                    goToInventory
                  }
                  className="flex w-full items-center justify-between rounded-xl bg-gold-50 px-3 py-3 text-left transition hover:bg-gold-100"
                >
                  <div className="flex items-center gap-3">
                    <TriangleAlert className="h-4 w-4 shrink-0 text-gold-600" />

                    <div>
                      <p className="text-xs font-black text-coffee-800">
                        {formatNumber(
                          lowStockAlerts.length,
                        )}{' '}
                        {t(
                          'items need stock',
                          'እቃዎች ክምችት ይፈልጋሉ',
                        )}
                      </p>

                      <p className="mt-0.5 text-[9px] text-coffee-500">
                        {t(
                          'Open inventory',
                          'ክምችትን ይክፈቱ',
                        )}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-gold-600" />
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-cream-100 px-3 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-berbere-600" />

                  <span className="text-xs font-bold text-coffee-800">
                    {t(
                      'Stock looks good',
                      'የእቃ ክምችት ጥሩ ነው',
                    )}
                  </span>
                </div>
              )}

              {/* SYNC */}

              {pendingSyncCount > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 shrink-0 text-coffee-700" />

                    <div>
                      <p className="text-xs font-black text-coffee-800">
                        {formatNumber(
                          pendingSyncCount,
                        )}{' '}
                        {t(
                          'sales waiting to sync',
                          'ሽያጮች ለማመሳሰል እየጠበቁ ነው',
                        )}
                      </p>

                      <p className="mt-0.5 text-[9px] text-coffee-500">
                        {t(
                          'Sync when connection is available',
                          'ግንኙነት ሲኖር ይመሳሰላል',
                        )}
                      </p>
                    </div>
                  </div>

                  <RefreshCw className="h-4 w-4 shrink-0 text-coffee-300" />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-cream-100 px-3 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-berbere-600" />

                  <span className="text-xs font-bold text-coffee-800">
                    {t(
                      'Everything is synced',
                      'ሁሉም መረጃ ተመሳስሏል',
                    )}
                  </span>
                </div>
              )}

              {/* SHIFT STATUS */}

              <button
                type="button"
                onClick={goToShifts}
                className="flex items-center justify-between rounded-xl border border-coffee-100 bg-coffee-50 px-3 py-3 text-left transition hover:bg-coffee-100 sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <Wallet
                    className={`h-4 w-4 ${hasActiveShift
                        ? 'text-berbere-600'
                        : 'text-coffee-500'
                      }`}
                  />

                  <div>
                    <p className="text-xs font-black text-coffee-800">
                      {hasActiveShift
                        ? `${formatNumber(
                          openShiftCount,
                        )} ${openShiftCount ===
                          1
                          ? t(
                            'shift is open',
                            'ፈረቃ ክፍት ነው',
                          )
                          : t(
                            'shifts are open',
                            'ፈረቃዎች ክፍት ናቸው',
                          )
                        }`
                        : t(
                          'No shift is open',
                          'ምንም ፈረቃ ክፍት የለም',
                        )}
                    </p>

                    <p className="mt-0.5 text-[9px] text-coffee-500">
                      {hasActiveShift
                        ? t(
                          'Business is active',
                          'ንግዱ እየሰራ ነው',
                        )
                        : t(
                          'Open a shift to start',
                          'ለመጀመር ፈረቃ ይክፈቱ',
                        )}
                    </p>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-coffee-300" />
              </button>
            </div>
          </section>

          {/* ==================================================
              STOCK SUMMARY

              Simple enough for a non-technical business owner.
          ================================================== */}

          <section className="rounded-2xl border border-coffee-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-100">
                  <Boxes className="h-4 w-4 text-coffee-700" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-coffee-900">
                    {t(
                      'Your Stock',
                      'የእቃ ክምችት',
                    )}
                  </h3>

                  <p className="text-[10px] text-coffee-400">
                    {t(
                      'What you have in inventory',
                      'በክምችት ያሉ እቃዎች',
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  goToInventory
                }
                className="flex items-center gap-1 text-[11px] font-black text-berbere-600 hover:underline"
              >
                {t(
                  'Inventory',
                  'ክምችት',
                )}

                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* PRODUCTS */}

              <div className="rounded-xl bg-coffee-50 p-3">
                <p className="text-[9px] font-bold text-coffee-400">
                  {t(
                    'Products',
                    'እቃዎች',
                  )}
                </p>

                <p className="mt-1 text-xl font-black text-coffee-900">
                  {formatNumber(
                    totalProducts,
                  )}
                </p>
              </div>

              {/* LOW */}

              <div className="rounded-xl bg-gold-50 p-3">
                <p className="text-[9px] font-bold text-gold-600">
                  {t(
                    'Low',
                    'ዝቅተኛ',
                  )}
                </p>

                <p className="mt-1 text-xl font-black text-coffee-900">
                  {formatNumber(
                    lowStockCount,
                  )}
                </p>
              </div>

              {/* OUT */}

              <div className="rounded-xl bg-berbere-50 p-3">
                <p className="text-[9px] font-bold text-berbere-600">
                  {t(
                    'Out',
                    'አልቋል',
                  )}
                </p>

                <p className="mt-1 text-xl font-black text-coffee-900">
                  {formatNumber(
                    outOfStockCount,
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              LOW STOCK DETAILS

              Only shown when there is something to fix.
          ================================================== */}

          {lowStockAlerts.length > 0 && (
            <LowStockWarningsTable
              lowStockAlerts={
                lowStockAlerts
              }
              locale={locale}
            />
          )}

          {/* ==================================================
              CATEGORY PERFORMANCE

              Useful for owners, but lower priority than sales,
              profit, stock and actions.
          ================================================== */}

          {categoryBreakdown.length > 0 && (
            <CategoryPerformanceTable
              categoryBreakdown={
                categoryBreakdown
              }
              locale={locale}
            />
          )}

          {/* ==================================================
              SMALL REPORT LINK

              Detailed financial information belongs in Reports,
              not in the main dashboard.
          ================================================== */}

          <button
            type="button"
            onClick={goToReports}
            className="flex w-full items-center justify-between rounded-2xl border border-coffee-100 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-coffee-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-50">
                <BarChart3 className="h-4 w-4 text-coffee-700" />
              </div>

              <div>
                <p className="text-xs font-black text-coffee-900">
                  {t(
                    'More Reports',
                    'ተጨማሪ ሪፖርቶች',
                  )}
                </p>

                <p className="text-[10px] text-coffee-400">
                  {t(
                    'See detailed sales and financial information',
                    'ዝርዝር የሽያጭ እና የፋይናንስ መረጃ ይመልከቱ',
                  )}
                </p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-coffee-300" />
          </button>
        </div>
      ) : (
        /* ======================================================
           OPERATIONAL STAFF
        ====================================================== */

        <div className="space-y-3">
          <div className="rounded-xl border border-cream-200 bg-cream-50 p-3">
            <p className="text-xs font-bold text-coffee-800">
              {t(
                'Service Terminal Ready',
                'ፈጣን የአገልግሎት መስኮት ገባሪ ነው',
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={
              goToSales
            }
            className="flex w-full items-center justify-between rounded-2xl border border-coffee-800 bg-coffee-800 p-5 text-left text-cream-50 shadow-sm transition active:scale-[0.98] hover:bg-coffee-700"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-berbere-500">
                <ShoppingCart className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-sm font-black">
                  {t(
                    role === 'waiter'
                      ? 'Tables & Orders'
                      : role === 'cashier'
                        ? 'Open Bills & Sales'
                        : 'Open Point of Sale',
                    'አዲስ መሸጫ ክፈት',
                  )}
                </h3>

                <p className="mt-0.5 text-xs text-cream-300">
                  {t(
                    role === 'waiter'
                      ? 'View tables, create orders, and check order status'
                      : role === 'cashier'
                        ? 'Record payments and manage your shift'
                        : 'Process customer sales and receipts',
                    'የደንበኛ ሽያጭ እና ደረሰኝ ይመዝግቡ',
                  )}
                </p>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 shrink-0 text-cream-300" />
          </button>
          {roles.includes('cashier') && (
            <button
              type="button"
              onClick={goToShifts}
              className="flex w-full items-center justify-between rounded-2xl border border-coffee-100 bg-white p-4 text-left shadow-sm transition hover:bg-coffee-50"
            >
              <span className="text-sm font-black text-coffee-800">{t('View my shift', 'ፈረቃዬን ይመልከቱ')}</span>
              <ArrowRight className="h-4 w-4 text-coffee-300" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
