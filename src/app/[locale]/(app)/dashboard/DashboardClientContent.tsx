'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
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

  periodGrossProfit,
  periodExpenses,
  periodNetProfit,

  periodDiscounts,
  periodTax,

  averageTicketSize,

  pendingSyncCount,

  hasActiveShift: initialHasActiveShift,
  openShiftCount,
}: DashboardClientProps) {
  const router = useRouter()

  const isAm = locale === 'am'

  const [isVoicePlaying, setIsVoicePlaying] = useState(false)

  /* ============================================================
     TRANSLATION
     ============================================================ */

  const t = (en: string, am: string) =>
    isAm ? am : en

  /* ============================================================
     BUSINESS STATE
     ============================================================ */

  const hasActiveShift =
    initialHasActiveShift || openShiftCount > 0

  const isOwnerOrManager =
    role === 'owner' ||
    role === 'manager'

  /* ============================================================
     DERIVED DATA
     ============================================================ */

  const totalProducts = initialProductCount

  const totalCategories = initialCategoryCount

  const totalItemsSold = useMemo(
    () =>
      categoryBreakdown.reduce(
        (total, item) => total + item.itemsSold,
        0,
      ),
    [categoryBreakdown],
  )

  const outOfStockCount = useMemo(
    () =>
      lowStockAlerts.filter(
        item => item.stock <= 0,
      ).length,
    [lowStockAlerts],
  )

  const lowStockCount = useMemo(
    () =>
      lowStockAlerts.filter(
        item => item.stock > 0,
      ).length,
    [lowStockAlerts],
  )

  const grossMargin =
    periodRevenue > 0
      ? (
          (periodGrossProfit / periodRevenue) *
          100
        ).toFixed(1)
      : '0.0'

  const netMargin =
    periodRevenue > 0
      ? (
          (periodNetProfit / periodRevenue) *
          100
        ).toFixed(1)
      : '0.0'

  /* ============================================================
     FORMATTING
     ============================================================ */

  const formatMoney = (value: number) =>
    value.toLocaleString(
      isAm ? 'am-ET' : 'en-ET',
      {
        maximumFractionDigits: 2,
      },
    )

  const formatNumber = (value: number) =>
    value.toLocaleString(
      isAm ? 'am-ET' : 'en-ET',
    )

  /* ============================================================
     NAVIGATION
     ============================================================ */

  const goTo = (path: string) => {
    router.push(`/${locale}${path}`)
  }

  const goToSales = () => goTo('/sales')

  const goToInventory = () => goTo('/inventory')

  const goToShifts = () => goTo('/shifts')
  const goToCloseDay = () =>goTo('/dashboard/close-day')

  const goToReports = () => goTo('/reports')

  const goToExpenses = () => goTo('/dashboard/expenses')

  /* ============================================================
     VOICE BRIEFING
     ============================================================ */

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
        `Net profit is ` +
        `${formatMoney(
          periodNetProfit,
        )} ETB. `

      if (openShiftCount > 0) {
        spokenText +=
          `${formatNumber(
            openShiftCount,
          )} shift${
            openShiftCount === 1
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

  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      if (
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-6xl
        space-y-5
        px-2
        pb-8
      "
    >
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
        onReceiveStockClick={goToInventory}
        onExpenseClick={goToExpenses}
        lowStockCount={lowStockCount}
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
        <div className="space-y-5">

          {/* ==================================================
              OWNER ACTIONS
             ================================================== */}

          <OwnerActionHeader
            locale={locale}
          />

          {/* ==================================================
              TODAY OVERVIEW
             ================================================== */}

          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-coffee-100
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-coffee-100
                px-4
                py-3
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-coffee-400
                  "
                >
                  {periodLabel}
                </p>

                <h2
                  className="
                    mt-0.5
                    text-sm
                    font-black
                    text-coffee-900
                  "
                >
                  {t(
                    'Business Overview',
                    'የንግድ አጠቃላይ እይታ',
                  )}
                </h2>
              </div>

              <TrendingUp
                className="
                  h-5
                  w-5
                  text-coffee-400
                "
              />
            </div>

            <div
              className="
                grid
                grid-cols-2
                divide-x
                divide-y
                divide-coffee-100
                sm:grid-cols-4
                sm:divide-y-0
              "
            >
              {/* REVENUE */}

              <div className="p-4">
                <p
                  className="
                    text-[10px]
                    font-bold
                    text-coffee-400
                  "
                >
                  {t(
                    'Revenue',
                    'ገቢ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-lg
                    font-black
                    text-coffee-900
                  "
                >
                  {formatMoney(
                    periodRevenue,
                  )}
                </p>

                <p
                  className="
                    text-[10px]
                    text-coffee-400
                  "
                >
                  ETB
                </p>
              </div>

              {/* GROSS PROFIT */}

              <div className="p-4">
                <p
                  className="
                    text-[10px]
                    font-bold
                    text-coffee-400
                  "
                >
                  {t(
                    'Gross Profit',
                    'ጠቅላላ ትርፍ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-lg
                    font-black
                    text-green-700
                  "
                >
                  {formatMoney(
                    periodGrossProfit,
                  )}
                </p>

                <p
                  className="
                    text-[10px]
                    text-coffee-400
                  "
                >
                  ETB
                </p>
              </div>

              {/* EXPENSES */}

              <div className="p-4">
                <p
                  className="
                    text-[10px]
                    font-bold
                    text-coffee-400
                  "
                >
                  {t(
                    'Expenses',
                    'ወጪ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-lg
                    font-black
                    text-red-600
                  "
                >
                  {formatMoney(
                    periodExpenses,
                  )}
                </p>

                <p
                  className="
                    text-[10px]
                    text-coffee-400
                  "
                >
                  ETB
                </p>
              </div>

              {/* NET PROFIT */}

              <div
                className="
                  bg-green-50
                  p-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-black
                    text-green-700
                  "
                >
                  {t(
                    'Net Profit',
                    'የተጣራ ትርፍ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-lg
                    font-black
                    text-green-800
                  "
                >
                  {formatMoney(
                    periodNetProfit,
                  )}
                </p>

                <p
                  className="
                    text-[10px]
                    text-green-600
                  "
                >
                  ETB
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              SALES + PROFIT
             ================================================== */}

          <div
            className="
              grid
              gap-4
              lg:grid-cols-2
            "
          >
            {/* SALES */}

            <section
              className="
                rounded-2xl
                border
                border-coffee-100
                bg-white
                p-5
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      bg-berbere-50
                    "
                  >
                    <ShoppingCart
                      className="
                        h-4
                        w-4
                        text-berbere-600
                      "
                    />
                  </div>

                  <div>
                    <h3
                      className="
                        text-sm
                        font-black
                        text-coffee-900
                      "
                    >
                      {t(
                        'Sales',
                        'ሽያጭ',
                      )}
                    </h3>

                    <p
                      className="
                        text-[10px]
                        text-coffee-400
                      "
                    >
                      {formatNumber(
                        periodTransactionCount,
                      )}{' '}
                      {t(
                        'transactions',
                        'ግብይቶች',
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToSales}
                  className="
                    text-[11px]
                    font-black
                    text-berbere-600
                    hover:underline
                  "
                >
                  {t(
                    'View',
                    'ይመልከቱ',
                  )}
                </button>
              </div>

              <div
                className="
                  mt-5
                  grid
                  grid-cols-3
                  gap-2
                "
              >
                <div
                  className="
                    rounded-xl
                    bg-coffee-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-coffee-400
                    "
                  >
                    {t(
                      'Average',
                      'አማካይ',
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {formatMoney(
                      averageTicketSize,
                    )}
                  </p>

                  <p
                    className="
                      text-[9px]
                      text-coffee-400
                    "
                  >
                    ETB
                  </p>
                </div>

                <div
                  className="
                    rounded-xl
                    bg-coffee-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-coffee-400
                    "
                  >
                    {t(
                      'Items',
                      'እቃዎች',
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {formatNumber(
                      totalItemsSold,
                    )}
                  </p>

                  <p
                    className="
                      text-[9px]
                      text-coffee-400
                    "
                  >
                    {t(
                      'sold',
                      'ተሽጧል',
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-xl
                    bg-berbere-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-berbere-600
                    "
                  >
                    {t(
                      'Revenue',
                      'ገቢ',
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {formatMoney(
                      periodRevenue,
                    )}
                  </p>

                  <p
                    className="
                      text-[9px]
                      text-coffee-400
                    "
                  >
                    ETB
                  </p>
                </div>
              </div>
            </section>

            {/* PROFIT */}

            <section
              className="
                rounded-2xl
                border
                border-green-100
                bg-white
                p-5
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-green-50
                  "
                >
                  <CircleDollarSign
                    className="
                      h-4
                      w-4
                      text-green-600
                    "
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {t(
                      'Profit Snapshot',
                      'የትርፍ ማጠቃለያ',
                    )}
                  </h3>

                  <p
                    className="
                      text-[10px]
                      text-coffee-400
                    "
                  >
                    {periodLabel}
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-5
                  space-y-3
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >
                  <span
                    className="
                      text-xs
                      font-semibold
                      text-coffee-500
                    "
                  >
                    {t(
                      'Gross Profit',
                      'ጠቅላላ ትርፍ',
                    )}
                  </span>

                  <span
                    className="
                      text-sm
                      font-black
                      text-green-700
                    "
                  >
                    {formatMoney(
                      periodGrossProfit,
                    )}{' '}
                    ETB
                  </span>
                </div>

                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >
                  <span
                    className="
                      text-xs
                      font-semibold
                      text-coffee-500
                    "
                  >
                    {t(
                      'Expenses',
                      'ወጪ',
                    )}
                  </span>

                  <span
                    className="
                      text-sm
                      font-black
                      text-red-600
                    "
                  >
                    -
                    {formatMoney(
                      periodExpenses,
                    )}{' '}
                    ETB
                  </span>
                </div>

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-xl
                    bg-green-50
                    px-3
                    py-3
                  "
                >
                  <span
                    className="
                      text-xs
                      font-black
                      text-green-700
                    "
                  >
                    {t(
                      'Net Profit',
                      'የተጣራ ትርፍ',
                    )}
                  </span>

                  <span
                    className="
                      text-base
                      font-black
                      text-green-800
                    "
                  >
                    {formatMoney(
                      periodNetProfit,
                    )}{' '}
                    ETB
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* ==================================================
              STOCK + ATTENTION
             ================================================== */}

          <div
            className="
              grid
              gap-4
              lg:grid-cols-2
            "
          >
            {/* STOCK */}

            <section
              className="
                rounded-2xl
                border
                border-coffee-100
                bg-white
                p-5
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      bg-cream-100
                    "
                  >
                    <Boxes
                      className="
                        h-4
                        w-4
                        text-coffee-700
                      "
                    />
                  </div>

                  <div>
                    <h3
                      className="
                        text-sm
                        font-black
                        text-coffee-900
                      "
                    >
                      {t(
                        'Stock',
                        'ክምችት',
                      )}
                    </h3>

                    <p
                      className="
                        text-[10px]
                        text-coffee-400
                      "
                    >
                      {t(
                        'Current inventory',
                        'የአሁኑ ክምችት',
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToInventory}
                  className="
                    text-[11px]
                    font-black
                    text-berbere-600
                    hover:underline
                  "
                >
                  {t(
                    'View',
                    'ይመልከቱ',
                  )}
                </button>
              </div>

              <div
                className="
                  mt-5
                  grid
                  grid-cols-3
                  gap-2
                "
              >
                <div
                  className="
                    rounded-xl
                    bg-coffee-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-coffee-400
                    "
                  >
                    {t(
                      'Products',
                      'እቃዎች',
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xl
                      font-black
                      text-coffee-900
                    "
                  >
                    {formatNumber(
                      totalProducts,
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-xl
                    bg-red-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-red-500
                    "
                  >
                    {t(
                      'Out',
                      'አልቋል',
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xl
                      font-black
                      text-red-700
                    "
                  >
                    {formatNumber(
                      outOfStockCount,
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-xl
                    bg-yellow-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-yellow-600
                    "
                  >
                    {t(
                      'Low',
                      'ዝቅተኛ',
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xl
                      font-black
                      text-yellow-700
                    "
                  >
                    {formatNumber(
                      lowStockCount,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* ATTENTION */}

            <section
              className="
                rounded-2xl
                border
                border-coffee-100
                bg-white
                p-5
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-yellow-50
                  "
                >
                  <TriangleAlert
                    className="
                      h-4
                      w-4
                      text-yellow-600
                    "
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {t(
                      'Needs Attention',
                      'ትኩረት የሚፈልጉ',
                    )}
                  </h3>

                  <p
                    className="
                      text-[10px]
                      text-coffee-400
                    "
                  >
                    {t(
                      'Important things to review',
                      'መመርመር የሚያስፈልጉ',
                    )}
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-5
                  space-y-2
                "
              >
                {lowStockAlerts.length > 0 ? (
                  <button
                    type="button"
                    onClick={goToInventory}
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      rounded-xl
                      bg-yellow-50
                      px-3
                      py-3
                      text-left
                      transition
                      hover:bg-yellow-100
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <TriangleAlert
                        className="
                          h-4
                          w-4
                          text-yellow-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          font-bold
                          text-yellow-800
                        "
                      >
                        {formatNumber(
                          lowStockAlerts.length,
                        )}{' '}
                        {t(
                          'products need stock attention',
                          'እቃዎች የክምችት ትኩረት ይፈልጋሉ',
                        )}
                      </span>
                    </div>

                    <ArrowRight
                      className="
                        h-4
                        w-4
                        text-yellow-600
                      "
                    />
                  </button>
                ) : (
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-green-50
                      px-3
                      py-3
                    "
                  >
                    <CheckCircle2
                      className="
                        h-4
                        w-4
                        text-green-600
                      "
                    />

                    <span
                      className="
                        text-xs
                        font-bold
                        text-green-800
                      "
                    >
                      {t(
                        'Stock levels look healthy',
                        'የእቃ ክምችት ጥሩ ነው',
                      )}
                    </span>
                  </div>
                )}

                {pendingSyncCount > 0 ? (
                  <button
                    type="button"
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      rounded-xl
                      bg-blue-50
                      px-3
                      py-3
                      text-left
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <RefreshCw
                        className="
                          h-4
                          w-4
                          text-blue-600
                        "
                      />

                      <span
                        className="
                          text-xs
                          font-bold
                          text-blue-800
                        "
                      >
                        {formatNumber(
                          pendingSyncCount,
                        )}{' '}
                        {t(
                          'sales waiting to sync',
                          'ሽያጮች ለማመሳሰል እየጠበቁ ነው',
                        )}
                      </span>
                    </div>

                    <ArrowRight
                      className="
                        h-4
                        w-4
                        text-blue-500
                      "
                    />
                  </button>
                ) : (
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-green-50
                      px-3
                      py-3
                    "
                  >
                    <CheckCircle2
                      className="
                        h-4
                        w-4
                        text-green-600
                      "
                    />

                    <span
                      className="
                        text-xs
                        font-bold
                        text-green-800
                      "
                    >
                      {t(
                        'Everything is synced',
                        'ሁሉም መረጃ ተመሳስሏል',
                      )}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ==================================================
              LOW STOCK TABLE
             ================================================== */}

          {lowStockAlerts.length > 0 && (
            <LowStockWarningsTable
              lowStockAlerts={lowStockAlerts}
              locale={locale}
            />
          )}

          {/* ==================================================
              CATEGORY PERFORMANCE
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
              OPERATIONS
             ================================================== */}

          <section
            className="
              rounded-2xl
              border
              border-coffee-100
              bg-white
              p-5
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className={`
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    ${
                      hasActiveShift
                        ? 'bg-green-50'
                        : 'bg-gray-100'
                    }
                  `}
                >
                  <Wallet
                    className={`
                      h-4
                      w-4
                      ${
                        hasActiveShift
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }
                    `}
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {t(
                      'Operations',
                      'የስራ እንቅስቃሴ',
                    )}
                  </h3>

                  <p
                    className="
                      text-[10px]
                      font-medium
                      text-coffee-400
                    "
                  >
                    {hasActiveShift
                      ? t(
                          'Business is currently active',
                          'ንግዱ በአሁኑ ጊዜ እየሰራ ነው',
                        )
                      : t(
                          'No shift is currently open',
                          'በአሁኑ ጊዜ ፈረቃ ክፍት የለም',
                        )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={goToShifts}
                className="
                  flex
                  items-center
                  gap-1
                  text-[11px]
                  font-black
                  text-berbere-600
                  hover:underline
                "
              >
                {t(
                  'View Shifts',
                  'ፈረቃዎችን ይመልከቱ',
                )}

                <ArrowRight
                  className="
                    h-3.5
                    w-3.5
                  "
                />
              </button>
            </div>

            <div
              className="
                mt-4
                flex
                items-center
                justify-between
                rounded-xl
                border
                border-coffee-100
                bg-coffee-50
                px-4
                py-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <span
                  className={`
                    h-2.5
                    w-2.5
                    rounded-full
                    ${
                      hasActiveShift
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }
                  `}
                />

                <span
                  className="
                    text-sm
                    font-black
                    text-coffee-900
                  "
                >
                  {hasActiveShift
                    ? `${formatNumber(
                        openShiftCount,
                      )} ${
                        openShiftCount === 1
                          ? t(
                              'shift open',
                              'ፈረቃ ክፍት ነው',
                            )
                          : t(
                              'shifts open',
                              'ፈረቃዎች ክፍት ናቸው',
                            )
                      }`
                    : t(
                        'No shifts open',
                        'ምንም ፈረቃ ክፍት የለም',
                      )}
                </span>
              </div>

              <ArrowRight
                className="
                  h-4
                  w-4
                  text-coffee-300
                "
              />
            </div>
          </section>

          {/* ==================================================
              FINANCIAL DETAILS
             ================================================== */}

          <section
            className="
              rounded-2xl
              border
              border-coffee-100
              bg-white
              p-5
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-coffee-50
                  "
                >
                  <BarChart3
                    className="
                      h-4
                      w-4
                      text-coffee-700
                    "
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-sm
                      font-black
                      text-coffee-900
                    "
                  >
                    {t(
                      'Financial Details',
                      'የፋይናንስ ዝርዝሮች',
                    )}
                  </h3>

                  <p
                    className="
                      text-[10px]
                      text-coffee-400
                    "
                  >
                    {periodLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={goToReports}
                className="
                  text-[11px]
                  font-black
                  text-berbere-600
                  hover:underline
                "
              >
                {t(
                  'Reports',
                  'ሪፖርቶች',
                )}
              </button>
            </div>

            <div
              className="
                mt-4
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-4
              "
            >
              <div
                className="
                  rounded-xl
                  bg-coffee-50
                  p-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    text-coffee-400
                  "
                >
                  {t(
                    'Discounts',
                    'ቅናሽ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-black
                    text-coffee-900
                  "
                >
                  {formatMoney(
                    periodDiscounts,
                  )}{' '}
                  ETB
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  bg-coffee-50
                  p-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    text-coffee-400
                  "
                >
                  {t(
                    'Tax',
                    'ታክስ',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-black
                    text-coffee-900
                  "
                >
                  {formatMoney(
                    periodTax,
                  )}{' '}
                  ETB
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  bg-green-50
                  p-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    text-green-600
                  "
                >
                  {t(
                    'Gross Margin',
                    'ጠቅላላ ማርጂን',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-black
                    text-green-800
                  "
                >
                  {grossMargin}%
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  bg-green-50
                  p-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    text-green-600
                  "
                >
                  {t(
                    'Net Margin',
                    'የተጣራ ማርጂን',
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-black
                    text-green-800
                  "
                >
                  {netMargin}%
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* ======================================================
           OPERATIONAL STAFF
           ====================================================== */

        <div className="space-y-3">
          <div
            className="
              rounded-xl
              border
              border-cream-200
              bg-cream-50
              p-3
            "
          >
            <p
              className="
                text-xs
                font-bold
                text-coffee-800
              "
            >
              {t(
                'Service Terminal Ready',
                'ፈጣን የአገልግሎት መስኮት ገባሪ ነው',
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={goToSales}
            className="
              flex
              w-full
              items-center
              justify-between
              rounded-2xl
              border
              border-coffee-800
              bg-coffee-800
              p-5
              text-left
              text-cream-50
              shadow-sm
              transition
              active:scale-[0.98]
              hover:bg-coffee-700
            "
          >
            <div
              className="
                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-berbere-500
                "
              >
                <ShoppingCart
                  className="
                    h-5
                    w-5
                  "
                />
              </div>

              <div>
                <h3
                  className="
                    text-sm
                    font-black
                  "
                >
                  {t(
                    'Open Point of Sale',
                    'አዲስ መሸጫ ክፈት',
                  )}
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-cream-300
                  "
                >
                  {t(
                    'Process customer sales and receipts',
                    'የደንበኛ ሽያጭ እና ደረሰኝ ይመዝግቡ',
                  )}
                </p>
              </div>
            </div>

            <ArrowRight
              className="
                h-5
                w-5
                shrink-0
                text-cream-300
              "
            />
          </button>
        </div>
      )}
    </div>
  )
}