'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { OwnerActionHeader } from '@/components/dashboard/OwnerActionHeader'
import { MetricSummaryGrid } from '@/components/dashboard/MetricSummaryGrid'
import { CategoryPerformanceTable } from '@/components/dashboard/CategoryPerformanceTable'
import { LowStockWarningsTable } from '@/components/dashboard/LowStockWarningsTable'

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

  todayRevenue: number
  todayTransactionCount: number

  todayGrossProfit: number
  todayExpenses: number
  todayNetProfit: number

  todayDiscounts: number
  todayTax: number
  averageTicketSize: number

  pendingSyncCount: number

  /**
   * Number of currently open shifts.
   * This is the source of truth for shift status.
   */
  openShiftCount: number
}

export default function DashboardClientContent({
  locale,
  role,
  businessName,

  initialProductCount,
  initialCategoryCount,

  categoryBreakdown,
  lowStockAlerts,

  todayRevenue,
  todayTransactionCount,

  todayGrossProfit,
  todayExpenses,
  todayNetProfit,

  todayDiscounts,
  todayTax,
  averageTicketSize,

  pendingSyncCount,

  openShiftCount,
}: DashboardClientProps) {
  const router = useRouter()

  const isAm = locale === 'am'

  const [isVoicePlaying, setIsVoicePlaying] =
    useState(false)

  /* ============================================================
     TRANSLATION
     ============================================================ */

  const t = (en: string, am: string) =>
    isAm ? am : en

  /* ============================================================
     DASHBOARD STATE
     ============================================================ */

  const totalProducts =
    initialProductCount

  const totalCategories =
    initialCategoryCount

  const totalTransactions =
    todayTransactionCount

  /**
   * openShiftCount is the source of truth.
   */
  const hasActiveShift =
    openShiftCount > 0

  const isOwnerOrManager =
    role === 'owner' ||
    role === 'manager'

  /* ============================================================
     VOICE BRIEFING
     ============================================================ */

  const handleVoiceGuidance = () => {
    if (!('speechSynthesis' in window)) {
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
        `ዛሬ ${todayRevenue.toLocaleString()} ብር ` +
        `የሽያጭ ገቢ አለዎት። ` +
        `${totalTransactions} ሽያጮች ተመዝግበዋል። ` +
        `${openShiftCount} ፈረቃ ክፍት ነው።`

      if (lowStockAlerts.length > 0) {
        spokenText +=
          ` ${lowStockAlerts.length} ` +
          `እቃዎች ዝቅተኛ ክምችት አላቸው።`
      }

      if (pendingSyncCount > 0) {
        spokenText +=
          ` ${pendingSyncCount} ` +
          `ሽያጮች ለማመሳሰል እየጠበቁ ነው።`
      }
    } else {
      spokenText =
        `Welcome back. ` +
        `Today you have made ` +
        `${todayRevenue.toLocaleString()} ETB ` +
        `from ${totalTransactions} sales. ` +
        `${openShiftCount} shift${
          openShiftCount === 1 ? '' : 's'
        } are currently open.`

      if (lowStockAlerts.length > 0) {
        spokenText +=
          ` ${lowStockAlerts.length} ` +
          `items are running low on stock.`
      }

      if (pendingSyncCount > 0) {
        spokenText +=
          ` ${pendingSyncCount} ` +
          `sales are waiting to sync.`
      }
    }

    const utterance =
      new SpeechSynthesisUtterance(
        spokenText
      )

    utterance.lang =
      isAm ? 'am-ET' : 'en-US'

    utterance.rate = 0.9

    utterance.onend = () => {
      setIsVoicePlaying(false)
    }

    utterance.onerror = () => {
      setIsVoicePlaying(false)
    }

    setIsVoicePlaying(true)

    window.speechSynthesis.speak(
      utterance
    )
  }

  /* ============================================================
     CLEANUP SPEECH
     ============================================================ */

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  /* ============================================================
     NAVIGATION
     ============================================================ */

  const goToSales = () => {
    router.push(`/${locale}/sales`)
  }

  const goToShifts = () => {
    router.push(`/${locale}/shifts`)
  }

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
        pb-6
        select-none
      "
    >

      {/* =====================================================
          DASHBOARD HEADER
          ===================================================== */}

      <DashboardHeader
        businessName={businessName}
        isAm={isAm}
        isVoicePlaying={isVoicePlaying}
        onToggleVoice={handleVoiceGuidance}
        todayRevenue={todayRevenue}
        transactionCount={totalTransactions}
        lowStockCount={lowStockAlerts.length}
        pendingSyncCount={pendingSyncCount}
        activeShift={hasActiveShift}
      />

      {/* =====================================================
          OWNER / MANAGER DASHBOARD
          ===================================================== */}

      {isOwnerOrManager ? (
        <div className="space-y-5">

          <OwnerActionHeader
            locale={locale}
          />

          {/* MAIN BUSINESS METRICS */}

          <MetricSummaryGrid
            todayRevenue={todayRevenue}

            activeShift={
              hasActiveShift
                ? 'open'
                : 'closed'
            }

            onToggleShift={goToShifts}

            totalProducts={
              totalProducts
            }

            totalCategories={
              totalCategories
            }

            totalTransactionsCount={
              totalTransactions
            }

            locale={locale}
          />

          {/* SHIFT STATUS */}

          <button
            type="button"
            onClick={goToShifts}
            className="
              flex
              w-full
              items-center
              justify-between
              rounded-2xl
              border
              border-coffee-100
              bg-white
              p-4
              text-left
              shadow-sm
              transition
              hover:border-coffee-200
              hover:shadow
              active:scale-[0.99]
            "
          >
            <div className="flex items-center gap-3">

              <div
                className={`
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  text-sm
                  ${
                    hasActiveShift
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }
                `}
              >
                {hasActiveShift
                  ? '🟢'
                  : '⚪'}
              </div>

              <div>

                <p
                  className="
                    text-xs
                    font-bold
                    text-coffee-500
                  "
                >
                  {t(
                    'Shift Status',
                    'የፈረቃ ሁኔታ'
                  )}
                </p>

                <p
                  className="
                    text-sm
                    font-black
                    text-coffee-900
                  "
                >
                  {hasActiveShift
                    ? t(
                        `${openShiftCount} shift${
                          openShiftCount === 1
                            ? ''
                            : 's'
                        } open`,
                        `${openShiftCount} ፈረቃ ክፍት ነው`
                      )
                    : t(
                        'No shifts open',
                        'ምንም ፈረቃ ክፍት የለም'
                      )}
                </p>

              </div>
            </div>

            <ArrowRight
              className="
                h-5
                w-5
                text-coffee-300
              "
            />
          </button>

          {/* CATEGORY PERFORMANCE */}

          <CategoryPerformanceTable
            categoryBreakdown={
              categoryBreakdown
            }
            locale={locale}
          />

          {/* LOW STOCK */}

          <LowStockWarningsTable
            lowStockAlerts={
              lowStockAlerts
            }
            locale={locale}
          />

        </div>
      ) : (

        /* =====================================================
           OPERATIONAL STAFF
           ===================================================== */

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
                'ፈጣን የአገልግሎት መስኮት ገባሪ ነው'
              )}
            </p>
          </div>

          <button
            onClick={goToSales}
            type="button"
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

            <div className="flex items-center gap-4">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-berbere-500
                  text-lg
                "
              >
                🛍️
              </div>

              <div>

                <h3
                  className="
                    text-sm
                    font-black
                    tracking-tight
                  "
                >
                  {t(
                    'Open Point of Sale',
                    'አዲስ መሸጫ ክፈት'
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
                    'የደንበኛ ሽያጭ እና ደረሰኝ ይመዝግቡ'
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