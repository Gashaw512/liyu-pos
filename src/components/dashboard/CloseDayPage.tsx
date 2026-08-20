'use client'

import React from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'

interface CloseDayPageProps {
  businessName: string
  isAm: boolean

  sales: number
  transactionCount: number
  grossProfit: number
  expenses: number
  netProfit: number

  onBack?: () => void
  onContinue?: () => void
}

function formatETB(value: number) {
  return new Intl.NumberFormat('en-ET', {
    maximumFractionDigits: 0,
  }).format(value)
}

function getBusinessDate(isAm: boolean) {
  try {
    return new Intl.DateTimeFormat(
      isAm ? 'am-ET-u-ca-ethiopic' : 'en-ET-u-ca-ethiopic',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    ).format(new Date())
  } catch {
    return new Intl.DateTimeFormat(
      isAm ? 'am-ET' : 'en-US',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    ).format(new Date())
  }
}

export function CloseDayPage({
  businessName,
  isAm,
  sales,
  transactionCount,
  grossProfit,
  expenses,
  netProfit,
  onBack,
  onContinue,
}: CloseDayPageProps) {
  const t = (en: string, am: string) =>
    isAm ? am : en

  return (
    <main
      className="
        min-h-screen
        bg-cream-50
        pb-24
      "
    >
      {/* HEADER */}
      <header
        className="
          sticky
          top-0
          z-30
          border-b
          border-cream-200
          bg-white/95
          backdrop-blur
        "
      >
        <div
          className="
            mx-auto
            flex
            h-16
            max-w-2xl
            items-center
            gap-3
            px-4
          "
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-cream-200
                bg-white
                text-coffee-600
                transition
                hover:bg-cream-50
                active:scale-95
              "
              aria-label={t(
                'Back',
                'ተመለስ',
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0">
            <p
              className="
                truncate
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-coffee-400
              "
            >
              {businessName}
            </p>

            <h1
              className="
                text-base
                font-black
                tracking-tight
                text-coffee-900
              "
            >
              {t(
                'Close Day',
                'ቀኑን ዝጋ',
              )}
            </h1>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div
        className="
          mx-auto
          max-w-2xl
          px-4
          pt-6
        "
      >
        {/* DATE */}
        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            font-semibold
            text-coffee-400
          "
        >
          <CalendarDays className="h-4 w-4" />

          {getBusinessDate(isAm)}
        </div>

        {/* TITLE */}
        <div className="mt-4">
          <h2
            className="
              text-2xl
              font-black
              tracking-tight
              text-coffee-900
            "
          >
            {t(
              "Today's Summary",
              'የዛሬ ማጠቃለያ',
            )}
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-coffee-400
            "
          >
            {t(
              'Review today before closing.',
              'ቀኑን ከመዝጋትዎ በፊት ዛሬን ይመልከቱ።',
            )}
          </p>
        </div>

        {/* SUMMARY */}
        <section
          className="
            mt-5
            overflow-hidden
            rounded-2xl
            border
            border-cream-200
            bg-white
            shadow-sm
          "
        >
          {/* SALES */}
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-cream-100
              px-5
              py-5
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-bold
                  text-coffee-400
                "
              >
                {t(
                  'Sales',
                  'ሽያጭ',
                )}
              </p>

              <p
                className="
                  mt-1
                  text-3xl
                  font-black
                  tracking-tight
                  text-coffee-900
                "
              >
                {formatETB(sales)}
                <span
                  className="
                    ml-1
                    text-sm
                    font-bold
                    text-coffee-400
                  "
                >
                  ETB
                </span>
              </p>
            </div>

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-cream-100
                text-berbere-600
              "
            >
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>

          {/* METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <SummaryItem
              icon={<ShoppingBag className="h-4 w-4" />}
              value={transactionCount}
              label={t(
                'Transactions',
                'ግብይቶች',
              )}
            />

            <SummaryItem
              icon={<TrendingUp className="h-4 w-4" />}
              value={formatETB(grossProfit)}
              label={t(
                'Gross Profit',
                'ጠቅላላ ትርፍ',
              )}
            />

            <SummaryItem
              icon={<ReceiptText className="h-4 w-4" />}
              value={formatETB(expenses)}
              label={t(
                'Expenses',
                'ወጪ',
              )}
            />

            <SummaryItem
              icon={<TrendingUp className="h-4 w-4" />}
              value={formatETB(netProfit)}
              label={t(
                'Net Profit',
                'የተጣራ ትርፍ',
              )}
              last
            />
          </div>
        </section>

        {/* SIMPLE NEXT STEP */}
        <div
          className="
            mt-5
            rounded-xl
            border
            border-cream-200
            bg-white
            px-4
            py-3
            text-center
          "
        >
          <p
            className="
              text-xs
              font-medium
              text-coffee-400
            "
          >
            {t(
              'Next, review any sales that were not entered during the day.',
              'በመቀጠል በቀኑ ያልተመዘገቡ ሽያጮችን ይመልከቱ።',
            )}
          </p>
        </div>
      </div>

      {/* BOTTOM ACTION */}
      <div
        className="
          fixed
          inset-x-0
          bottom-0
          z-40
          border-t
          border-cream-200
          bg-white/95
          p-3
          backdrop-blur
        "
      >
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={onContinue}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-coffee-900
              px-4
              py-3.5
              text-sm
              font-black
              text-white
              transition
              hover:bg-coffee-800
              active:scale-[0.99]
            "
          >
            {t(
              'Continue',
              'ቀጥል',
            )}

            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  )
}

/* ============================================================
   SUMMARY ITEM
   ============================================================ */

interface SummaryItemProps {
  icon: React.ReactNode
  value: string | number
  label: string
  last?: boolean
}

function SummaryItem({
  icon,
  value,
  label,
  last = false,
}: SummaryItemProps) {
  return (
    <div
      className={`
        px-4
        py-4
        ${!last ? 'border-b border-cream-100 sm:border-b-0 sm:border-r' : ''}
      `}
    >
      <div className="text-coffee-400">
        {icon}
      </div>

      <p
        className="
          mt-2
          truncate
          text-lg
          font-black
          text-coffee-900
        "
      >
        {value}
      </p>

      <p
        className="
          mt-0.5
          text-[10px]
          font-bold
          text-coffee-400
        "
      >
        {label}
      </p>
    </div>
  )
}