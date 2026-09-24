'use client'

import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Layers3,
  Package,
  TrendingUp,
} from 'lucide-react'

import type {
  InventoryProduct,
  LiveMetaData,
} from '@/types/inventory'

interface ValuationProps {
  products: InventoryProduct[]
  liveStockMap: Record<string, LiveMetaData>
  fifoCostValueByProduct: Record<string, number>
  fifoCostDataAvailable: boolean
  isAm: boolean
}

interface CategoryValuation {
  count: number
  costValue: number
  retailValue: number
}

const COLORS = {
  navy: '#1B2B50',
  orange: '#F26522',
  cream: '#F7F4EB',
  text: '#2B1E1A',
  muted: '#756B65',
  border: '#E8E0D6',
  white: '#FFFFFF',
} as const

export default function InventoryValuation({
  products,
  liveStockMap,
  fifoCostValueByProduct,
  fifoCostDataAvailable,
  isAm,
}: ValuationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const t = (en: string, am: string) =>
    isAm ? am : en

  // ============================================================
  // FORMATTERS
  // ============================================================

  const formatMoney = (value: number) => {
    if (!Number.isFinite(value)) {
      return '0'
    }

    return Math.round(value).toLocaleString()
  }

  const formatCompactMoney = (value: number) => {
    if (!Number.isFinite(value)) {
      return '0'
    }

    const abs = Math.abs(value)

    if (abs >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`
    }

    if (abs >= 10_000) {
      return `${Math.round(value / 1_000)}K`
    }

    return Math.round(value).toLocaleString()
  }

  // ============================================================
  // CALCULATE CURRENT STOCK VALUE
  // ============================================================

  const metrics = useMemo(() => {
    let totalUnits = 0
    let totalCostValue = 0
    let totalRetailValue = 0

    const categories: Record<
      string,
      CategoryValuation
    > = {}

    for (const product of products) {
      const liveStock =
        liveStockMap[product.id]

      const currentStock = Math.max(
        0,
        Number(
          liveStock?.systemCount ??
          product.opening_count ??
          0,
        ),
      )

      if (
        !Number.isFinite(currentStock) ||
        currentStock <= 0
      ) {
        continue
      }

      const costPrice = Number(
        product.cost_price,
      )

      const retailPrice = Number(
        product.retail_price,
      )

      const hasValidCost =
        Number.isFinite(costPrice) &&
        costPrice >= 0

      const hasFifoCostValue =
        fifoCostDataAvailable &&
        !liveStock?.hasPendingTransactions &&
        Object.prototype.hasOwnProperty.call(
          fifoCostValueByProduct,
          product.id,
        )

      const costValue = hasFifoCostValue
        ? fifoCostValueByProduct[product.id]
        : hasValidCost
          ? currentStock * costPrice
          : 0

      const safeRetailPrice =
        Number.isFinite(retailPrice) &&
          retailPrice >= 0
          ? retailPrice
          : 0

      totalUnits += currentStock

      totalCostValue += costValue

      totalRetailValue +=
        currentStock * safeRetailPrice

      const categoryName =
        isAm &&
          product.category_name_am
          ? product.category_name_am
          : product.category_name

      const category =
        categoryName ||
        t(
          'Other',
          'ሌሎች',
        )

      if (!categories[category]) {
        categories[category] = {
          count: 0,
          costValue: 0,
          retailValue: 0,
        }
      }

      categories[category].count +=
        currentStock

      categories[category].costValue += costValue

      categories[category].retailValue +=
        currentStock * safeRetailPrice
    }

    const categoryList =
      Object.entries(categories).sort(
        ([, a], [, b]) =>
          b.retailValue -
          a.retailValue,
      )

    const possibleGain = Math.max(
      0,
      totalRetailValue -
      totalCostValue,
    )

    const gainPercentage =
      totalRetailValue > 0
        ? (possibleGain /
          totalRetailValue) *
        100
        : 0

    return {
      totalUnits,
      totalCostValue,
      totalRetailValue,
      possibleGain,
      gainPercentage,
      categoryList,
    }
  }, [
    products,
    liveStockMap,
    fifoCostValueByProduct,
    fifoCostDataAvailable,
    isAm,
  ])

  // ============================================================
  // CATEGORY PERCENTAGE
  // ============================================================

  const getCategoryPercentage = (
    retailValue: number,
  ) => {
    if (
      metrics.totalRetailValue <= 0
    ) {
      return 0
    }

    return Math.min(
      100,
      Math.max(
        0,
        (retailValue /
          metrics.totalRetailValue) *
        100,
      ),
    )
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section
      className="
        w-full
        overflow-hidden
        rounded-2xl
        border
        bg-white
        shadow-sm
      "
      style={{
        borderColor: COLORS.border,
      }}
    >
      {/* ======================================================
          COLLAPSED HEADER
      ======================================================= */}

      {/* ======================================================
    COMPACT HEADER
======================================================= */}

      <button
        type="button"
        onClick={() =>
          setIsOpen((previous) => !previous)
        }
        className="
    w-full
    px-3
    py-2.5
    text-left
    transition
    active:bg-[#faf8f3]
  "
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between gap-3">
          {/* LEFT */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-lg
          "
                style={{
                  backgroundColor:
                    'rgba(27,43,80,0.08)',
                  color: COLORS.navy,
                }}
              >
                <Package className="h-3.5 w-3.5" />
              </div>

              <h2
                className="
            text-sm
            font-bold
          "
                style={{
                  color: COLORS.text,
                }}
              >
                {t(
                  'Stock Value',
                  'የእቃ ዋጋ',
                )}
              </h2>
            </div>

            {/* FOUR KEY VALUES */}
            <div
              className="
          mt-2
          flex
          flex-wrap
          items-center
          gap-x-3
          gap-y-1
          pl-9
        "
            >
              {/* PRODUCTS */}

              <div className="flex items-center gap-1">
                <span
                  className="text-[9px]"
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Products',
                    'እቃ',
                  )}
                </span>

                <strong
                  className="text-[11px]"
                  style={{
                    color: COLORS.text,
                  }}
                >
                  {products.length.toLocaleString()}
                </strong>
              </div>

              {/* ITEMS */}

              <div className="flex items-center gap-1">
                <span
                  className="text-[9px]"
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Items',
                    'ፍሬ',
                  )}
                </span>

                <strong
                  className="text-[11px]"
                  style={{
                    color: COLORS.text,
                  }}
                >
                  {metrics.totalUnits.toLocaleString()}
                </strong>
              </div>

              {/* COST */}

              <div className="flex items-center gap-1">
                <span
                  className="text-[9px]"
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Cost',
                    'መግዣ',
                  )}
                </span>

                <strong
                  className="text-[11px]"
                  style={{
                    color: COLORS.text,
                  }}
                >
                  {formatCompactMoney(
                    metrics.totalCostValue,
                  )}
                </strong>
              </div>

              {/* SELL */}

              <div className="flex items-center gap-1">
                <span
                  className="text-[9px]"
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Sell',
                    'መሸጫ',
                  )}
                </span>

                <strong
                  className="text-[11px]"
                  style={{
                    color: COLORS.navy,
                  }}
                >
                  {formatCompactMoney(
                    metrics.totalRetailValue,
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* EXPAND */}
          <div
            className="
        flex
        h-7
        w-7
        shrink-0
        items-center
        justify-center
        rounded-lg
      "
            style={{
              backgroundColor:
                'rgba(27,43,80,0.06)',
              color: COLORS.navy,
            }}
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {/* ======================================================
          DETAILS
      ======================================================= */}

      {isOpen && (
        <div
          className="
            space-y-3
            border-t
            px-4
            pb-4
            pt-3
          "
          style={{
            borderColor: COLORS.border,
          }}
        >
          {/* VALUE DETAILS */}

          <div className="grid grid-cols-2 gap-2">
            {/* BUYING VALUE */}

            <div
              className="
                rounded-xl
                border
                p-3
              "
              style={{
                backgroundColor:
                  '#FAF9F6',
                borderColor:
                  COLORS.border,
              }}
            >
              <div className="flex items-center gap-1.5">
                <Package
                  className="h-3.5 w-3.5"
                  style={{
                    color: COLORS.muted,
                  }}
                />

                <span
                  className="
                    text-[10px]
                    font-semibold
                  "
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Buying value',
                    'የመግዣ ዋጋ',
                  )}
                </span>
              </div>

              <p
                className="
                  mt-1
                  truncate
                  text-base
                  font-black
                "
                style={{
                  color: COLORS.text,
                }}
              >
                {formatMoney(
                  metrics.totalCostValue,
                )}{' '}
                <span className="text-[9px] font-medium">
                  ETB
                </span>
              </p>
            </div>

            {/* SELLING VALUE */}

            <div
              className="
                rounded-xl
                border
                p-3
              "
              style={{
                backgroundColor:
                  'rgba(27,43,80,0.04)',
                borderColor:
                  'rgba(27,43,80,0.10)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp
                  className="h-3.5 w-3.5"
                  style={{
                    color: COLORS.navy,
                  }}
                />

                <span
                  className="
                    text-[10px]
                    font-semibold
                  "
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Selling value',
                    'የመሸጫ ዋጋ',
                  )}
                </span>
              </div>

              <p
                className="
                  mt-1
                  truncate
                  text-base
                  font-black
                "
                style={{
                  color: COLORS.navy,
                }}
              >
                {formatMoney(
                  metrics.totalRetailValue,
                )}{' '}
                <span className="text-[9px] font-medium">
                  ETB
                </span>
              </p>
            </div>
          </div>

          {/* POSSIBLE GAIN */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              rounded-xl
              border
              px-3
              py-2.5
            "
            style={{
              backgroundColor:
                'rgba(242,101,34,0.07)',
              borderColor:
                'rgba(242,101,34,0.15)',
            }}
          >
            <div className="min-w-0">
              <p
                className="
                  text-[11px]
                  font-bold
                "
                style={{
                  color: COLORS.text,
                }}
              >
                {t(
                  'Possible gain',
                  'ሊገኝ የሚችል ትርፍ',
                )}
              </p>

              <p
                className="
                  mt-0.5
                  text-[9px]
                "
                style={{
                  color: COLORS.muted,
                }}
              >
                {t(
                  'If all stock is sold',
                  'ሁሉም እቃ ከተሸጠ',
                )}
              </p>
            </div>

            <span
              className="
                shrink-0
                text-sm
                font-black
              "
              style={{
                color: COLORS.orange,
              }}
            >
              +{formatMoney(
                metrics.possibleGain,
              )}{' '}
              ETB
            </span>
          </div>

          {/* CATEGORY BREAKDOWN */}

          {metrics.categoryList.length > 0 && (
            <div className="pt-1">
              <div className="mb-2 flex items-center justify-between">
                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-bold
                  "
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  <Layers3 className="h-3 w-3" />

                  {t(
                    'By category',
                    'በምድብ',
                  )}
                </div>

                <span
                  className="text-[9px]"
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {metrics.categoryList.length}{' '}
                  {t(
                    'groups',
                    'ምድቦች',
                  )}
                </span>
              </div>

              <div className="space-y-2">
                {metrics.categoryList.map(
                  ([category, data]) => {
                    const percentage =
                      getCategoryPercentage(
                        data.retailValue,
                      )

                    return (
                      <div
                        key={category}
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                          "
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="
                                truncate
                                text-[11px]
                                font-semibold
                              "
                              style={{
                                color:
                                  COLORS.text,
                              }}
                            >
                              {category}
                            </span>

                            <span
                              className="shrink-0 text-[9px]"
                              style={{
                                color:
                                  COLORS.muted,
                              }}
                            >
                              (
                              {data.count.toLocaleString()}
                              )
                            </span>
                          </div>

                          <span
                            className="
                              shrink-0
                              text-[10px]
                              font-bold
                            "
                            style={{
                              color:
                                COLORS.navy,
                            }}
                          >
                            {formatCompactMoney(
                              data.retailValue,
                            )}{' '}
                            ETB
                          </span>
                        </div>

                        <div
                          className="
                            mt-1
                            h-1
                            w-full
                            overflow-hidden
                            rounded-full
                          "
                          style={{
                            backgroundColor:
                              '#EEEAE4',
                          }}
                        >
                          <div
                            className="
                              h-full
                              rounded-full
                              transition-all
                            "
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                COLORS.orange,
                            }}
                          />
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          )}

          {/* SHORT NOTE */}

          <p
            className="
              border-t
              pt-2
              text-[9px]
              leading-relaxed
            "
            style={{
              borderColor:
                COLORS.border,
              color: COLORS.muted,
            }}
          >
            {t(
              'This shows the value of the stock you have now. It is not the profit from past sales.',
              'ይህ አሁን ያለዎትን የእቃ ዋጋ ያሳያል። ካለፉት ሽያጮች የተገኘ ትርፍ አይደለም።',
            )}
          </p>
        </div>
      )}
    </section>
  )
}
