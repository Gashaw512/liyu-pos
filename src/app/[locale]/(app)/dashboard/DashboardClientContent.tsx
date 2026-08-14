'use client'

import React, { useState, useEffect } from 'react'
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
  hasActiveShift: boolean
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
  hasActiveShift,
}: DashboardClientProps)  {
  const router = useRouter()

  const isAm = locale === 'am'

  const [isVoicePlaying, setIsVoicePlaying] =
    useState(false)

  const t = (en: string, am: string) =>
    isAm ? am : en

  /*
   * ----------------------------------------------------
   * BASIC CATALOG METRICS
   * ----------------------------------------------------
   */

  const totalProducts =
  initialProductCount

const totalCategories =
  initialCategoryCount

const totalTransactionsCount =
  todayTransactionCount

  /*
   * ----------------------------------------------------
   * VOICE BRIEFING
   * ----------------------------------------------------
   */

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
      `${totalTransactionsCount} ሽያጮች ተመዝግበዋል።`

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
      `from ${totalTransactionsCount} sales.`

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

  utterance.onend = () =>
    setIsVoicePlaying(false)

  utterance.onerror = () =>
    setIsVoicePlaying(false)

  setIsVoicePlaying(true)

  window.speechSynthesis.speak(
    utterance
  )
}

  /*
   * ----------------------------------------------------
   * CLEANUP SPEECH
   * ----------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  /*
   * ----------------------------------------------------
   * ROLE
   * ----------------------------------------------------
   */

  const isOwnerOrManager =
    role === 'owner' ||
    role === 'manager'

  /*
   * ----------------------------------------------------
   * RENDER
   * ----------------------------------------------------
   */

  return (
    <div
      className="
        mx-auto
        max-w-4xl
        space-y-5
        px-2
        pb-6
        select-none
      "
    >

      {/* =================================================
          1. DASHBOARD HEADER
          ================================================= */}

      <DashboardHeader
        businessName={businessName}
        isAm={isAm}
        isVoicePlaying={isVoicePlaying}
        onToggleVoice={handleVoiceGuidance}

        todayRevenue={todayRevenue}

        transactionCount={
          totalTransactionsCount
        }

        lowStockCount={
          lowStockAlerts.length
        }

        pendingSyncCount={
          pendingSyncCount
        }

        activeShift={
          hasActiveShift
        }
      />

      {/* =================================================
          2. OWNER / MANAGER DASHBOARD
          ================================================= */}

      {isOwnerOrManager ? (
        <div className="space-y-5">

          <OwnerActionHeader
            locale={locale}
          />

          <MetricSummaryGrid
            todayRevenue={todayRevenue}

            activeShift={
              hasActiveShift
                ? 'open'
                : 'closed'
            }

            onToggleShift={() => {
              router.push(
                `/${locale}/shifts`
              )
            }}

            totalProducts={
              totalProducts
            }

            totalCategories={
              totalCategories
            }

            totalTransactionsCount={
              totalTransactionsCount
            }

            locale={locale}
          />

          <CategoryPerformanceTable
            categoryBreakdown={
              categoryBreakdown
            }
            locale={locale}
          />

          <LowStockWarningsTable
            lowStockAlerts={
              lowStockAlerts
            }
            locale={locale}
          />

        </div>
      ) : (

        /* =================================================
           3. OPERATIONAL STAFF / WAITER
           ================================================= */

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
            onClick={() => {
              router.push(
                `/${locale}/sales`
              )
            }}
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