'use client'

import { Loader2, Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

import type {
  InventoryProduct,
  LiveMetaData,
} from '@/types/inventory'

interface InventoryProductListProps {
  products: InventoryProduct[]
  counts: Record<string, number>
  liveStockMap: Record<string, LiveMetaData>
  fifoCostByProduct: Record<string, { quantity: number; value: number }>
  fifoCostDataAvailable: boolean
  pendingReceiptCostByProduct: Record<
    string,
    { quantity: number; value: number }
  >
  rowSavingId: string | null
  isAm: boolean
  t: (en: string, am: string) => string
  onCountChange: (productId: string, value: number) => void
  onSaveRow: (product: InventoryProduct) => void
}

const COLORS = {
  navy: '#1B2B50',
  orange: '#F26522',
  cream: '#F7F4EB',
  text: '#2B1E1A',
  muted: '#756B65',
  border: '#E8E0D6',
  white: '#FFFFFF',
  success: '#3F7D4A',
  softGreen: '#F3F8F3',
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)

const formatMoney = (value: number) =>
  `${formatNumber(value)} ETB`

export default function InventoryProductList({
  products,
  counts,
  liveStockMap,
  fifoCostByProduct,
  fifoCostDataAvailable,
  pendingReceiptCostByProduct,
  rowSavingId,
  isAm,
  t,
  onCountChange,
  onSaveRow,
}: InventoryProductListProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <div
      className="overflow-hidden rounded-xl border bg-white shadow-sm"
      style={{
        borderColor: COLORS.border,
      }}
    >
      {/* =========================================================
          DESKTOP TABLE HEADER
      ========================================================= */}

      <div
        className="
          hidden md:grid
          grid-cols-[minmax(230px,1fr)_75px_95px_110px_110px_130px_92px]
          items-center
          gap-2
          border-b
          px-4
          py-2.5
        "
        style={{
          backgroundColor: COLORS.cream,
          borderColor: COLORS.border,
        }}
      >
        <TableHeader>
          {t('Product', 'ምርት')}
        </TableHeader>

        <TableHeader align="center">
          {t('System', 'ሲስተም')}
        </TableHeader>

        <TableHeader align="center">
          {t('Actual', 'ቆጠራ')}
        </TableHeader>

        <TableHeader align="right">
          {t('Avg. Cost', 'አማካይ የግዢ ዋጋ')}
        </TableHeader>

        <TableHeader align="right">
          {t('Sell Price', 'የመሸጫ ዋጋ')}
        </TableHeader>

        <TableHeader align="right">
          {t('Stock Value', 'የእቃ ዋጋ')}
        </TableHeader>

        <TableHeader align="center">
          {t('Action', 'ተግባር')}
        </TableHeader>
      </div>

      {/* =========================================================
          TABLE BODY
      ========================================================= */}

      <div>
        {products.map((product, index) => {
          const live = liveStockMap[product.id]

          const systemCount =
            live?.systemCount ??
            product.opening_count ??
            0

          const currentCount =
            counts[product.id] ??
            systemCount

          const difference =
            currentCount - systemCount

          const hasChanged =
            currentCount !== systemCount

          const isSaving =
            rowSavingId === product.id

          const name =
            isAm && product.name_am
              ? product.name_am
              : product.name

          const category =
            isAm && product.category_name_am
              ? product.category_name_am
              : product.category_name

          const configuredCost =
            typeof product.cost_price === 'number' &&
              Number.isFinite(product.cost_price) &&
              product.cost_price >= 0
              ? product.cost_price
              : null

          const fifoCost = fifoCostByProduct[product.id]
          const pendingReceipt = pendingReceiptCostByProduct[product.id]
          const hasPendingReceipt =
            pendingReceipt !== undefined && pendingReceipt.quantity > 0

          const hasFifoCost =
            fifoCostDataAvailable &&
            !live?.hasPendingTransactions &&
            fifoCost !== undefined &&
            fifoCost.quantity > 0

          const fallbackStockQuantity = hasPendingReceipt
            ? Math.max(0, systemCount - pendingReceipt.quantity)
            : systemCount

          const liveCostQuantity = hasFifoCost
            ? fifoCost.quantity + (pendingReceipt?.quantity ?? 0)
            : fallbackStockQuantity + (pendingReceipt?.quantity ?? 0)

          const liveCostValue = hasFifoCost
            ? fifoCost.value + (pendingReceipt?.value ?? 0)
            : configuredCost !== null
              ? fallbackStockQuantity * configuredCost +
                (pendingReceipt?.value ?? 0)
              : null

          // Show weighted average cost of the stock currently on hand.
          const costPrice =
            liveCostValue !== null && liveCostQuantity > 0
              ? liveCostValue / liveCostQuantity
              : configuredCost

          const retailPrice =
            typeof product.retail_price === 'number' &&
              Number.isFinite(product.retail_price)
              ? product.retail_price
              : null

          /*
           * Stock value is based on the current selling price.
           * If retail price is unavailable, we show unavailable
           * rather than inventing a number.
           */
          const stockValue =
            retailPrice !== null
              ? currentCount * retailPrice
              : null

          return (
            <div
              key={product.id}
              className={`
                relative
                ${index !== products.length - 1
                  ? 'border-b'
                  : ''
                }
                ${hasChanged
                  ? 'bg-orange-50/40'
                  : 'bg-white'
                }
                transition-colors
                hover:bg-[#FCFBF8]
              `}
              style={{
                borderColor: COLORS.border,
              }}
            >
              {/* Changed indicator */}

              {hasChanged && (
                <span
                  className="
                    absolute
                    inset-y-0
                    left-0
                    w-1
                  "
                  style={{
                    backgroundColor:
                      COLORS.orange,
                  }}
                />
              )}

              {/* ===================================================
                  DESKTOP ROW
              =================================================== */}

              <div
                className="
                  hidden md:grid
                  grid-cols-[minmax(230px,1fr)_75px_95px_110px_110px_130px_92px]
                  items-center
                  gap-2
                  px-4
                  py-2.5
                "
              >
                {/* PRODUCT */}

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">

                    {/* Product initial */}

                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        text-xs
                        font-bold
                      "
                      style={{
                        backgroundColor:
                          `${COLORS.navy}0D`,
                        color: COLORS.navy,
                      }}
                    >
                      {name?.charAt(0)?.toUpperCase() ||
                        'P'}
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          truncate
                          text-[13px]
                          font-bold
                        "
                        style={{
                          color: COLORS.text,
                        }}
                      >
                        {name}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <span
                          className="
                            max-w-[150px]
                            truncate
                            text-[10px]
                          "
                          style={{
                            color: COLORS.muted,
                          }}
                        >
                          {category}
                        </span>

                        <span
                          className="
                            text-[10px]
                            font-semibold
                          "
                          style={{
                            color: COLORS.navy,
                          }}
                        >
                          · {product.unit_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SYSTEM STOCK */}

                <div className="text-center">
                  <span
                    className="
                      text-sm
                      font-bold
                    "
                    style={{
                      color: COLORS.navy,
                    }}
                  >
                    {formatNumber(systemCount)}
                  </span>
                </div>

                {/* ACTUAL STOCK */}

                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={currentCount}
                    onChange={(event) => {
                      const value =
                        Number(event.target.value)

                      onCountChange(
                        product.id,
                        Number.isFinite(value)
                          ? Math.max(0, value)
                          : 0
                      )
                    }}
                    className={`
                      h-9
                      w-[78px]
                      rounded-lg
                      border
                      bg-white
                      px-2
                      text-center
                      text-sm
                      font-bold
                      outline-none
                      transition
                      focus:ring-2
                      focus:ring-orange-100
                      ${hasChanged
                        ? 'border-orange-300'
                        : 'border-gray-200'
                      }
                    `}
                    style={{
                      color: hasChanged
                        ? COLORS.orange
                        : COLORS.text,
                    }}
                    aria-label={t(
                      `Actual quantity for ${name}`,
                      `የ${name} ትክክለኛ ብዛት`
                    )}
                  />

                  {/* Difference */}

                  {hasChanged && (
                    <span
                      className="
                        mt-0.5
                        text-[9px]
                        font-bold
                      "
                      style={{
                        color:
                          difference < 0
                            ? COLORS.orange
                            : COLORS.success,
                      }}
                    >
                      {difference > 0
                        ? `+${formatNumber(difference)}`
                        : formatNumber(difference)}
                    </span>
                  )}
                </div>

                {/* COST PRICE */}

                <div className="text-right">
                  {costPrice !== null ? (
                    <span
                      className="
                        text-xs
                        font-semibold
                      "
                      style={{
                        color: COLORS.muted,
                      }}
                    >
                      {formatMoney(costPrice)}
                    </span>
                  ) : (
                    <span
                      className="
                        text-[10px]
                        italic
                      "
                      style={{
                        color: '#A49B94',
                      }}
                    >
                      {t(
                        'Not set',
                        'አልተገለጸም'
                      )}
                    </span>
                  )}
                </div>

                {/* SELL PRICE */}

                <div className="text-right">
                  {retailPrice !== null ? (
                    <div>
                      <span
                        className="
                          text-xs
                          font-bold
                        "
                        style={{
                          color: COLORS.navy,
                        }}
                      >
                        {formatMoney(retailPrice)}
                      </span>

                      <span
                        className="
                          ml-1
                          text-[9px]
                        "
                        style={{
                          color: COLORS.muted,
                        }}
                      >
                        / {product.unit_type}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="
                        text-[10px]
                        italic
                      "
                      style={{
                        color: '#A49B94',
                      }}
                    >
                      {t(
                        'Not set',
                        'አልተገለጸም'
                      )}
                    </span>
                  )}
                </div>

                {/* STOCK VALUE */}

                <div className="text-right">
                  {stockValue !== null ? (
                    <>
                      <div
                        className="
                          text-sm
                          font-bold
                        "
                        style={{
                          color: COLORS.text,
                        }}
                      >
                        {formatMoney(stockValue)}
                      </div>

                      <div
                        className="
                          text-[9px]
                        "
                        style={{
                          color: COLORS.muted,
                        }}
                      >
                        {t(
                          'Current value',
                          'የአሁኑ ዋጋ'
                        )}
                      </div>
                    </>
                  ) : (
                    <span
                      className="
                        text-[10px]
                        italic
                      "
                      style={{
                        color: '#A49B94',
                      }}
                    >
                      {t(
                        'Not available',
                        'አይገኝም'
                      )}
                    </span>
                  )}
                </div>

                {/* SAVE ACTION */}

                <div className="flex justify-center">
                  {hasChanged ? (
                    <Button
                      variant="secondary"
                      disabled={isSaving}
                      onClick={() =>
                        onSaveRow(product)
                      }
                      className="
                        h-9
                        min-w-[82px]
                        gap-1.5
                        rounded-lg
                        px-3
                        text-[11px]
                        font-bold
                        shadow-sm
                      "
                      aria-label={t(
                        'Save inventory count',
                        'የእቃ ቆጠራ አስቀምጥ'
                      )}
                    >
                      {isSaving ? (
                        <>
                          <Loader2
                            className="
                              h-3.5
                              w-3.5
                              animate-spin
                            "
                          />

                          <span>
                            {t(
                              'Saving...',
                              'በማስቀመጥ ላይ...'
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <Save
                            className="
                              h-3.5
                              w-3.5
                            "
                          />

                          <span>
                            {t(
                              'Save',
                              'አስቀምጥ'
                            )}
                          </span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <div
                      className="
                        flex
                        items-center
                        gap-1
                        rounded-md
                        px-2
                        py-1
                      "
                      style={{
                        backgroundColor:
                          COLORS.softGreen,
                        color: COLORS.success,
                      }}
                    >
                      <Check
                        className="h-3 w-3"
                      />

                      <span
                        className="
                          text-[9px]
                          font-bold
                        "
                      >
                        {t(
                          'Saved',
                          'ተቀምጧል'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===================================================
                  MOBILE ROW
              =================================================== */}

              <div
                className="
                  grid
                  md:hidden
                  grid-cols-[minmax(0,1fr)_60px_72px_42px]
                  items-center
                  gap-2
                  px-3
                  py-2.5
                "
              >
                {/* PRODUCT */}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        text-[10px]
                        font-bold
                      "
                      style={{
                        backgroundColor:
                          `${COLORS.navy}0D`,
                        color: COLORS.navy,
                      }}
                    >
                      {name?.charAt(0)?.toUpperCase() ||
                        'P'}
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          truncate
                          text-xs
                          font-bold
                        "
                        style={{
                          color: COLORS.text,
                        }}
                      >
                        {name}
                      </p>

                      <p
                        className="
                          truncate
                          text-[9px]
                        "
                        style={{
                          color: COLORS.muted,
                        }}
                      >
                        {category} · {product.unit_type}
                      </p>

                      {/* Mobile prices */}

                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className="
                            text-[9px]
                            font-semibold
                          "
                          style={{
                            color: COLORS.muted,
                          }}
                        >
                          {t(
                            'Cost',
                            'ግዢ'
                          )}:{' '}
                          {costPrice !== null
                            ? formatMoney(costPrice)
                            : '—'}
                        </span>

                        <span
                          className="
                            text-[9px]
                            font-bold
                          "
                          style={{
                            color: COLORS.navy,
                          }}
                        >
                          {t(
                            'Sell',
                            'ሽያጭ'
                          )}:{' '}
                          {retailPrice !== null
                            ? formatMoney(retailPrice)
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SYSTEM */}

                <div className="text-center">
                  <span
                    className="
                      block
                      text-[8px]
                      font-bold
                      uppercase
                    "
                    style={{
                      color: COLORS.muted,
                    }}
                  >
                    {t(
                      'System',
                      'ሲስተም'
                    )}
                  </span>

                  <span
                    className="
                      text-xs
                      font-bold
                    "
                    style={{
                      color: COLORS.navy,
                    }}
                  >
                    {formatNumber(systemCount)}
                  </span>
                </div>

                {/* ACTUAL */}

                <div>
                  <span
                    className="
                      block
                      text-center
                      text-[8px]
                      font-bold
                      uppercase
                    "
                    style={{
                      color: COLORS.muted,
                    }}
                  >
                    {t(
                      'Actual',
                      'ቆጠራ'
                    )}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={currentCount}
                    onChange={(event) => {
                      const value =
                        Number(event.target.value)

                      onCountChange(
                        product.id,
                        Number.isFinite(value)
                          ? Math.max(0, value)
                          : 0
                      )
                    }}
                    className={`
                      h-8
                      w-full
                      rounded-lg
                      border
                      bg-white
                      px-1
                      text-center
                      text-xs
                      font-bold
                      outline-none
                      ${hasChanged
                        ? 'border-orange-300'
                        : 'border-gray-200'
                      }
                    `}
                    style={{
                      color: hasChanged
                        ? COLORS.orange
                        : COLORS.text,
                    }}
                  />

                  {hasChanged && (
                    <div
                      className="
                        mt-0.5
                        text-center
                        text-[8px]
                        font-bold
                      "
                      style={{
                        color:
                          difference < 0
                            ? COLORS.orange
                            : COLORS.success,
                      }}
                    >
                      {difference > 0
                        ? `+${formatNumber(difference)}`
                        : formatNumber(difference)}
                    </div>
                  )}
                </div>

                {/* MOBILE SAVE */}

                <div className="flex justify-center pt-3">
                  {hasChanged ? (
                    <Button
                      variant="secondary"
                      disabled={isSaving}
                      onClick={() =>
                        onSaveRow(product)
                      }
                      className="
                        h-8
                        min-w-[40px]
                        gap-1
                        rounded-lg
                        px-1.5
                        text-[9px]
                        font-bold
                      "
                      aria-label={t(
                        'Save inventory count',
                        'የእቃ ቆጠራ አስቀምጥ'
                      )}
                    >
                      {isSaving ? (
                        <Loader2
                          className="
                            h-3.5
                            w-3.5
                            animate-spin
                          "
                        />
                      ) : (
                        <>
                          <Save
                            className="h-3.5 w-3.5"
                          />
                          <span className="hidden min-[390px]:inline">
                            {t(
                              'Save',
                              'አስቀምጥ'
                            )}
                          </span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Check
                      className="h-4 w-4"
                      style={{
                        color: COLORS.success,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* ===================================================
                  MOBILE STOCK VALUE
              =================================================== */}

              <div
                className="
                  flex
                  md:hidden
                  items-center
                  justify-end
                  border-t
                  px-3
                  py-1
                "
                style={{
                  borderColor: COLORS.border,
                  backgroundColor: '#FCFBF8',
                }}
              >
                <span
                  className="
                    text-[9px]
                  "
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {t(
                    'Stock value',
                    'የእቃ ዋጋ'
                  )}
                  :{' '}
                  <strong
                    style={{
                      color: COLORS.text,
                    }}
                  >
                    {stockValue !== null
                      ? formatMoney(stockValue)
                      : '—'}
                  </strong>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* =========================================================
          SMALL SUMMARY FOOTER
      ========================================================= */}

      <div
        className="
          hidden md:flex
          items-center
          justify-between
          border-t
          px-4
          py-2
        "
        style={{
          backgroundColor: '#FCFBF8',
          borderColor: COLORS.border,
        }}
      >
        <span
          className="
            text-[10px]
            font-medium
          "
          style={{
            color: COLORS.muted,
          }}
        >
          {products.length}{' '}
          {t(
            products.length === 1
              ? 'product'
              : 'products',
            'ምርቶች'
          )}
        </span>

        <span
          className="
            text-[10px]
            font-medium
          "
          style={{
            color: COLORS.muted,
          }}
        >
          {t(
            'Orange means stock was changed',
            'ብርቱካናማ ማለት ቆጠራው ተቀይሯል'
          )}
        </span>
      </div>
    </div>
  )
}

/* ===============================================================
   TABLE HEADER
================================================================ */

function TableHeader({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
}) {
  return (
    <div
      className={`
        text-[9px]
        font-bold
        uppercase
        tracking-[0.08em]
        ${align === 'center'
          ? 'text-center'
          : align === 'right'
            ? 'text-right'
            : 'text-left'
        }
      `}
      style={{
        color: COLORS.muted,
      }}
    >
      {children}
    </div>
  )
}
