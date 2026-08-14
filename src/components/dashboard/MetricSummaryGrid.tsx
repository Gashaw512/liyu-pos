'use client'

import React from 'react'
import {
  ArrowUpRight,
  Receipt,
  Clock3,
  Package,
  Wallet,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

interface MetricSummaryGridProps {
  todayRevenue: number
  todayExpenses?: number
  todayProfit?: number
  revenueChangePercent?: number
  transactionChangePercent?: number
  profitChangePercent?: number

  activeShift: 'open' | 'closed'
  onToggleShift: () => void

  totalProducts: number
  totalCategories: number
  totalTransactionsCount: number

  lowStockCount?: number

  locale: string
}

export function MetricSummaryGrid({
  todayRevenue,
  todayExpenses = 0,
  todayProfit = 0,
  revenueChangePercent,
  transactionChangePercent,
  profitChangePercent,

  activeShift,
  onToggleShift,

  totalProducts,
  totalCategories,
  totalTransactionsCount,

  lowStockCount = 0,

  locale,
}: MetricSummaryGridProps) {
  const isAm = locale === 'am'

  const t = (en: string, am: string) =>
    isAm ? am : en

 const formatMoney = (value?: number | 0) =>
  (value ?? 0).toLocaleString(
    isAm ? 'am-ET' : 'en-US',
    {
      maximumFractionDigits: 0,
    }
  )

  const formatChange = (value?: number) => {
    if (value === undefined || value === null) {
      return null
    }

    return `${value > 0 ? '+' : ''}${value}%`
  }

  const revenueChange = formatChange(
    revenueChangePercent
  )

  const transactionChange = formatChange(
    transactionChangePercent
  )

  const profitChange = formatChange(
    profitChangePercent
  )

  return (
    <section
      aria-label={t(
        "Today's business performance",
        'የዛሬ የንግድ አፈጻጸም'
      )}
      className="space-y-3"
    >

      {/* =====================================================
          BUSINESS PULSE
          ===================================================== */}

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-cream-200
          bg-white
          shadow-sm
        "
      >

        {/* Header */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-cream-100
            bg-cream-50/60
            px-4
            py-2.5
          "
        >

          <div className="flex items-center gap-2">

            <span
              className="
                h-2
                w-2
                rounded-full
                bg-success
              "
            />

            <span
              className="
                text-[10px]
                font-black
                uppercase
                tracking-widest
                text-coffee-500
              "
            >
              {t(
                "Today's business pulse",
                'የዛሬ የንግድ ሁኔታ'
              )}
            </span>

          </div>

          <span
            className="
              text-[10px]
              font-bold
              text-coffee-400
            "
          >
            {t('Live', 'ቀጥታ')}
          </span>

        </div>


        {/* Main metrics */}

        <div className="grid grid-cols-2 divide-x divide-y divide-cream-100 sm:grid-cols-4 sm:divide-y-0">

          {/* SALES */}

          <button
            type="button"
            onClick={() => {
              window.location.href =
                `/${locale}/sales`
            }}
            className="
              group
              p-3.5
              text-left
              transition-colors
              hover:bg-cream-50
              active:bg-cream-100
            "
          >

            <div className="flex items-center justify-between">

              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t('Sales', 'ሽያጭ')}
              </span>

              <TrendingUp
                className="
                  h-3.5
                  w-3.5
                  text-berbere-500
                "
              />

            </div>

            <p
              className="
                mt-1
                truncate
                text-lg
                font-black
                tracking-tight
                text-coffee-700
              "
            >
              {formatMoney(todayRevenue)}
              <span
                className="
                  ml-1
                  text-[9px]
                  font-black
                  text-coffee-400
                "
              >
                ETB
              </span>
            </p>

            {revenueChange ? (
              <p
                className={`
                  mt-0.5
                  text-[10px]
                  font-bold
                  ${
                    revenueChangePercent! >= 0
                      ? 'text-success'
                      : 'text-danger'
                  }
                `}
              >
                {revenueChange}
                {' '}
                {t('vs yesterday', 'ከትናንት')}
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] text-coffee-400">
                {t('Today', 'ዛሬ')}
              </p>
            )}

          </button>


          {/* TRANSACTIONS */}

          <button
            type="button"
            onClick={() => {
              window.location.href =
                `/${locale}/sales`
            }}
            className="
              group
              p-3.5
              text-left
              transition-colors
              hover:bg-cream-50
              active:bg-cream-100
            "
          >

            <div className="flex items-center justify-between">

              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t('Transactions', 'ደረሰኞች')}
              </span>

              <Receipt
                className="
                  h-3.5
                  w-3.5
                  text-coffee-400
                "
              />

            </div>

            <p
              className="
                mt-1
                text-lg
                font-black
                tracking-tight
                text-coffee-700
              "
            >
              {totalTransactionsCount.toLocaleString()}
            </p>

            {transactionChange ? (
              <p
                className={`
                  mt-0.5
                  text-[10px]
                  font-bold
                  ${
                    transactionChangePercent! >= 0
                      ? 'text-success'
                      : 'text-danger'
                  }
                `}
              >
                {transactionChange}
                {' '}
                {t('vs yesterday', 'ከትናንት')}
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] text-coffee-400">
                {t('Today', 'ዛሬ')}
              </p>
            )}

          </button>


          {/* EXPENSES */}

          <button
            type="button"
            onClick={() => {
              window.location.href =
                `/${locale}/expenses`
            }}
            className="
              group
              p-3.5
              text-left
              transition-colors
              hover:bg-cream-50
              active:bg-cream-100
            "
          >

            <div className="flex items-center justify-between">

              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t('Expenses', 'ወጪ')}
              </span>

              <Wallet
                className="
                  h-3.5
                  w-3.5
                  text-coffee-400
                "
              />

            </div>

            <p
              className="
                mt-1
                truncate
                text-lg
                font-black
                tracking-tight
                text-coffee-700
              "
            >
              {formatMoney(todayExpenses)}
              <span
                className="
                  ml-1
                  text-[9px]
                  font-black
                  text-coffee-400
                "
              >
                ETB
              </span>
            </p>

            <p className="mt-0.5 text-[10px] text-coffee-400">
              {t('Today', 'ዛሬ')}
            </p>

          </button>


          {/* PROFIT */}

          <button
            type="button"
            onClick={() => {
              window.location.href =
                `/${locale}/reports/profit`
            }}
            className="
              group
              p-3.5
              text-left
              transition-colors
              hover:bg-cream-50
              active:bg-cream-100
            "
          >

            <div className="flex items-center justify-between">

              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  text-coffee-400
                "
              >
                {t('Profit', 'ትርፍ')}
              </span>

              <ArrowUpRight
                className="
                  h-3.5
                  w-3.5
                  text-success
                "
              />

            </div>

            <p
              className={`
                mt-1
                truncate
                text-lg
                font-black
                tracking-tight
                ${
                  todayProfit >= 0
                    ? 'text-success'
                    : 'text-danger'
                }
              `}
            >
              {formatMoney(todayProfit)}
              <span
                className="
                  ml-1
                  text-[9px]
                  font-black
                "
              >
                ETB
              </span>
            </p>

            {profitChange ? (
              <p
                className={`
                  mt-0.5
                  text-[10px]
                  font-bold
                  ${
                    profitChangePercent! >= 0
                      ? 'text-success'
                      : 'text-danger'
                  }
                `}
              >
                {profitChange}
                {' '}
                {t('vs yesterday', 'ከትናንት')}
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] text-coffee-400">
                {t('Today', 'ዛሬ')}
              </p>
            )}

          </button>

        </div>


        {/* Financial relationship */}

        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-cream-100
            bg-cream-50/40
            px-4
            py-2
          "
        >

          <span
            className="
              text-[10px]
              font-medium
              text-coffee-400
            "
          >
            {t(
              'Sales − expenses',
              'ሽያጭ − ወጪ'
            )}
          </span>

          <span
            className={`
              text-[11px]
              font-black
              ${
                todayProfit >= 0
                  ? 'text-success'
                  : 'text-danger'
              }
            `}
          >
            {formatMoney(todayProfit)} ETB
          </span>

        </div>

      </div>


      {/* =====================================================
          OPERATIONS
          ===================================================== */}

      <div className="grid grid-cols-2 gap-3">

        {/* SHIFT */}

        <button
          type="button"
          onClick={onToggleShift}
          className="
            group
            rounded-2xl
            border
            border-cream-200
            bg-white
            p-3.5
            text-left
            shadow-sm
            transition-all
            hover:border-berbere-200
            hover:shadow-md
            active:scale-[0.98]
          "
        >

          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                bg-cream-100
                text-coffee-600
              "
            >
              <Clock3 className="h-4 w-4" />
            </div>

            <ChevronRight
              className="
                h-3.5
                w-3.5
                text-coffee-300
              "
            />

          </div>

          <p
            className="
              mt-3
              text-[10px]
              font-black
              uppercase
              tracking-wider
              text-coffee-400
            "
          >
            {t('Shift', 'ፈረቃ')}
          </p>

          <div className="mt-1 flex items-center gap-1.5">

            <span
              className={`
                h-2
                w-2
                rounded-full
                ${
                  activeShift === 'open'
                    ? 'bg-success'
                    : 'bg-warning'
                }
              `}
            />

            <span
              className="
                text-sm
                font-black
                text-coffee-700
              "
            >
              {activeShift === 'open'
                ? t('Open', 'ክፍት')
                : t('Closed', 'ዝግ')}
            </span>

          </div>

        </button>


        {/* INVENTORY */}

        <button
          type="button"
          onClick={() => {
            window.location.href =
              `/${locale}/inventory`
          }}
          className="
            group
            rounded-2xl
            border
            border-cream-200
            bg-white
            p-3.5
            text-left
            shadow-sm
            transition-all
            hover:border-berbere-200
            hover:shadow-md
            active:scale-[0.98]
          "
        >

          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                bg-cream-100
                text-coffee-600
              "
            >
              <Package className="h-4 w-4" />
            </div>

            <ChevronRight
              className="
                h-3.5
                w-3.5
                text-coffee-300
              "
            />

          </div>

          <p
            className="
              mt-3
              text-[10px]
              font-black
              uppercase
              tracking-wider
              text-coffee-400
            "
          >
            {t('Inventory', 'እቃ ክምችት')}
          </p>

          {lowStockCount > 0 ? (

            <div className="mt-1">

              <span
                className="
                  text-sm
                  font-black
                  text-warning
                "
              >
                {lowStockCount}
              </span>

              <span
                className="
                  ml-1
                  text-xs
                  font-semibold
                  text-coffee-500
                "
              >
                {t(
                  'need attention',
                  'ትኩረት ይፈልጋሉ'
                )}
              </span>

            </div>

          ) : (

            <div className="mt-1 flex items-center gap-1.5">

              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-success
                "
              />

              <span
                className="
                  text-sm
                  font-black
                  text-coffee-700
                "
              >
                {t('Healthy', 'ጤናማ')}
              </span>

            </div>

          )}

        </button>

      </div>


      {/* =====================================================
          CATALOG CONTEXT
          ===================================================== */}

      <button
        type="button"
        onClick={() => {
          window.location.href =
            `/${locale}/products`
        }}
        className="
          group
          flex
          w-full
          items-center
          justify-between
          rounded-xl
          border
          border-cream-200
          bg-cream-50
          px-3.5
          py-2.5
          text-left
          transition-colors
          hover:border-cream-300
          hover:bg-white
        "
      >

        <div className="flex items-center gap-2.5">

          <Package
            className="
              h-4
              w-4
              text-coffee-400
            "
          />

          <span
            className="
              text-xs
              font-semibold
              text-coffee-600
            "
          >
            {totalProducts.toLocaleString()}{' '}
            {t('products', 'ምርቶች')}
          </span>

          <span
            className="
              h-1
              w-1
              rounded-full
              bg-cream-300
            "
          />

          <span
            className="
              text-xs
              font-semibold
              text-coffee-400
            "
          >
            {totalCategories.toLocaleString()}{' '}
            {t('categories', 'ምድቦች')}
          </span>

        </div>

        <ChevronRight
          className="
            h-3.5
            w-3.5
            text-coffee-300
            transition-transform
            group-hover:translate-x-0.5
          "
        />

      </button>

    </section>
  )
}