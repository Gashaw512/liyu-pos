// src/components/pos/POSProductGrid.tsx
'use client'

import {
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'

import type {
  POSInventoryStatus,
  POSProduct,
} from './types'

interface POSProductGridProps {
  products: POSProduct[]
  cartQuantities: Map<string, number>
  onAddProduct: (product: POSProduct) => void
  onIncreaseQuantity: (id: string) => void
  onDecreaseQuantity: (id: string) => void
  onSetQuantity: (
    id: string,
    quantity: number,
  ) => void
  isAm: boolean
}

// ============================================================
// INVENTORY BADGE
// ============================================================

function getInventoryBadge(
  product: POSProduct,
  isAm: boolean,
): {
  label: string
  className: string
  title: string
} {
  const quantity =
    product.inventory_quantity

  const status: POSInventoryStatus =
    product.inventory_status ??
    'inventory_issue'

  // ==========================================================
  // INVENTORY ISSUE
  // ==========================================================
  //
  // IMPORTANT:
  // This must come BEFORE quantity == null.
  //
  // A tracked product can have:
  //
  //   inventory_id       = null
  //   inventory_quantity = null
  //   inventory_status   = inventory_issue
  //
  // That is an inventory problem, NOT "Not tracked".
  //
  if (
    status === 'inventory_issue'
  ) {
    const normalizedQuantity =
      quantity == null
        ? null
        : Number(quantity)

    return {
      label:
        normalizedQuantity == null
          ? isAm
            ? 'ችግር · ክምችት የለም'
            : 'Issue · No stock'
          : isAm
            ? `ችግር · ${normalizedQuantity}`
            : `Issue · ${normalizedQuantity}`,

      className:
        'bg-red-50 text-red-700 ring-red-200',

      title:
        normalizedQuantity == null
          ? isAm
            ? 'ኢንቬንተሪ ክትትል እንደሚደረግ ተመዝግቧል፣ ነገር ግን የክምችት መዝገብ የለም'
            : 'Inventory tracking is enabled, but no local inventory record was found'
          : isAm
            ? 'የኢንቬንተሪ መጠን ከዜሮ በታች ነው'
            : 'Inventory quantity is negative',
    }
  }

  // ==========================================================
  // EXPLICITLY NOT TRACKED
  // ==========================================================

  if (
    status === 'not_tracked'
  ) {
    return {
      label:
        isAm
          ? 'አይከታተልም'
          : 'Not tracked',

      className:
        'bg-coffee-100 text-coffee-500 ring-coffee-200',

      title:
        isAm
          ? 'የዚህ ምርት ኢንቬንተሪ ክትትል አልተከፈተም'
          : 'Inventory tracking is disabled for this product',
    }
  }

  // ==========================================================
  // UNKNOWN / MISSING QUANTITY
  // ==========================================================
  //
  // Do not call this "Not tracked".
  //

  if (
    quantity == null
  ) {
    return {
      label:
        isAm
          ? 'ችግር · ክምችት የለም'
          : 'Issue · No stock',

      className:
        'bg-red-50 text-red-700 ring-red-200',

      title:
        isAm
          ? 'የክምችት መዝገብ አልተገኘም'
          : 'No local inventory record was found',
    }
  }

  const normalizedQuantity =
    Number(quantity)

  // ==========================================================
  // INVALID QUANTITY
  // ==========================================================

  if (
    !Number.isFinite(
      normalizedQuantity,
    )
  ) {
    return {
      label:
        isAm
          ? 'ችግር · ያልታወቀ'
          : 'Issue · Invalid',

      className:
        'bg-red-50 text-red-700 ring-red-200',

      title:
        isAm
          ? 'የኢንቬንተሪ መጠኑ ልክ አይደለም'
          : 'Inventory quantity is invalid',
    }
  }

  // ==========================================================
  // NEGATIVE STOCK
  // ==========================================================

  if (
    normalizedQuantity < 0
  ) {
    return {
      label:
        isAm
          ? `ችግር · ${normalizedQuantity}`
          : `Issue · ${normalizedQuantity}`,

      className:
        'bg-red-50 text-red-700 ring-red-200',

      title:
        isAm
          ? 'የኢንቬንተሪ መጠን ከዜሮ በታች ነው'
          : 'Inventory quantity is negative',
    }
  }

  // ==========================================================
  // OUT OF STOCK
  // ==========================================================

  if (
    status === 'out_of_stock' ||
    normalizedQuantity === 0
  ) {
    return {
      label:
        isAm
          ? 'አልቋል · 0'
          : 'Out · 0',

      className:
        'bg-amber-50 text-amber-700 ring-amber-200',

      title:
        isAm
          ? 'የአካባቢ ኢንቬንተሪ ዜሮ ነው'
          : 'Local inventory is zero',
    }
  }

  // ==========================================================
  // LOW STOCK
  // ==========================================================

  if (
    status === 'low_stock'
  ) {
    return {
      label:
        isAm
          ? `ዝቅተኛ · ${normalizedQuantity}`
          : `Low · ${normalizedQuantity}`,

      className:
        'bg-amber-50 text-amber-700 ring-amber-200',

      title:
        isAm
          ? 'የኢንቬንተሪ መጠኑ ዝቅተኛ ነው'
          : 'Inventory is running low',
    }
  }

  // ==========================================================
  // IN STOCK
  // ==========================================================

  return {
    label:
      isAm
        ? `${normalizedQuantity} ቀሪ`
        : `${normalizedQuantity} left`,

    className:
      'bg-emerald-50 text-emerald-700 ring-emerald-200',

    title:
      isAm
        ? 'የአሁኑ የኢንቬንተሪ መጠን'
        : 'Current local inventory quantity',
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function POSProductGrid({
  products,
  cartQuantities,
  onAddProduct,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onSetQuantity,
  isAm,
}: POSProductGridProps) {
  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  if (products.length === 0) {
    return (
      <div
        className="
          flex min-h-28 items-center justify-center
          rounded-xl border border-cream-200
          bg-cream-50
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto mb-2 flex h-9 w-9
              items-center justify-center
              rounded-full bg-white
              text-coffee-400
            "
          >
            <ShoppingCart className="h-4 w-4" />
          </div>

          <p className="text-sm font-black text-coffee-700">
            {isAm
              ? 'እቃ አልተገኘም'
              : 'No products found'}
          </p>

          <p className="mt-0.5 text-[10px] text-coffee-400">
            {isAm
              ? 'በዚህ ምድብ እቃ የለም'
              : 'No products available'}
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // PRODUCT GRID
  // ==========================================================

  return (
    <div
      className="
        grid
        grid-cols-2
        gap-1.5
        sm:grid-cols-3
        sm:gap-2
        md:grid-cols-4
        lg:grid-cols-5
        xl:grid-cols-6
        2xl:grid-cols-7
      "
    >
      {products.map((product) => {
        const cartQuantity =
          cartQuantities.get(product.id) ?? 0

        const isAdded =
          cartQuantity > 0

        const price =
          Number(
            product.retail_price ?? 0,
          )

        const inventoryBadge =
          getInventoryBadge(
            product,
            isAm,
          )

        return (
          <div
            key={product.id}
            className={`
              group
              relative
              flex
              min-h-[82px]
              flex-col
              overflow-hidden
              rounded-lg
              border
              p-1.5
              transition-all
              duration-100
              sm:min-h-[86px]
              sm:p-2
              ${
                isAdded
                  ? `
                    border-berbere-400
                    bg-berbere-50
                    shadow-sm
                  `
                  : `
                    border-cream-200
                    bg-white
                    hover:border-berbere-300
                    hover:bg-cream-50
                  `
              }
            `}
          >
            {/* =================================================
                INVENTORY STATUS
                ================================================= */}

            <div
              className={`
                pointer-events-none
                absolute
                right-1.5
                top-1.5
                z-10
                max-w-[calc(100%-0.75rem)]
                truncate
                rounded-md
                px-1.5
                py-0.5
                text-[7px]
                font-black
                leading-none
                ring-1
                ring-inset
                sm:text-[8px]
                ${inventoryBadge.className}
              `}
              title={
                inventoryBadge.title
              }
            >
              {inventoryBadge.label}
            </div>

            {/* =================================================
                PRODUCT
                ================================================= */}

            <button
              type="button"
              onClick={() =>
                onAddProduct(product)
              }
              aria-label={
                isAdded
                  ? `${product.name}, quantity ${cartQuantity}`
                  : `Add ${product.name}`
              }
              className="
                min-h-0
                min-w-0
                flex-1
                text-left
                active:scale-[0.98]
              "
            >
              <div
                className="
                  min-w-0
                  pr-14
                  sm:pr-16
                "
              >
                <p
                  className={`
                    line-clamp-2
                    text-[10px]
                    font-black
                    leading-[1.25]
                    sm:text-[11px]
                    ${
                      isAdded
                        ? 'text-berbere-800'
                        : 'text-coffee-700'
                    }
                  `}
                >
                  {product.name}
                </p>
              </div>
            </button>

            {/* =================================================
                BOTTOM ROW
                ================================================= */}

            <div
              className="
                mt-1.5
                flex
                min-w-0
                items-center
                justify-between
                gap-1
              "
            >
              {/* PRICE */}

              <div
                className="
                  min-w-0
                  shrink
                  truncate
                "
              >
                <span
                  className={`
                    font-mono
                    text-[11px]
                    font-black
                    sm:text-xs
                    ${
                      isAdded
                        ? 'text-berbere-700'
                        : 'text-berbere-600'
                    }
                  `}
                >
                  {Number.isFinite(price)
                    ? price.toLocaleString()
                    : '0'}
                </span>

                <span
                  className="
                    ml-0.5
                    text-[7px]
                    font-bold
                    text-coffee-400
                    sm:text-[8px]
                  "
                >
                  ETB
                </span>
              </div>

              {/* =================================================
                  CART CONTROL
                  ================================================= */}

              {!isAdded ? (
                <button
                  type="button"
                  onClick={() =>
                    onAddProduct(product)
                  }
                  aria-label={
                    isAm
                      ? `${product.name} ወደ ትዕዛዝ ጨምር`
                      : `Add ${product.name}`
                  }
                  className="
                    flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    bg-cream-100
                    text-coffee-500
                    transition-all
                    hover:bg-berbere-100
                    hover:text-berbere-600
                    active:scale-90
                    sm:h-7
                    sm:w-7
                  "
                >
                  <Plus
                    className="
                      h-3
                      w-3
                      sm:h-3.5
                      sm:w-3.5
                    "
                    strokeWidth={3}
                  />
                </button>
              ) : (
                <div
                  className="
                    flex
                    h-6
                    shrink-0
                    items-center
                    gap-0.5
                    rounded-md
                    bg-white
                    p-0.5
                    shadow-sm
                    ring-1
                    ring-berbere-100
                    sm:h-7
                  "
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  {/* DECREASE */}

                  <button
                    type="button"
                    onClick={() =>
                      onDecreaseQuantity(
                        product.id,
                      )
                    }
                    aria-label={
                      isAm
                        ? 'ብዛት ቀንስ'
                        : 'Decrease quantity'
                    }
                    className="
                      flex
                      h-5
                      w-5
                      items-center
                      justify-center
                      rounded
                      text-coffee-500
                      transition-colors
                      hover:bg-cream-100
                      hover:text-berbere-600
                      active:scale-90
                      sm:h-6
                      sm:w-6
                    "
                  >
                    <Minus
                      className="
                        h-2.5
                        w-2.5
                        sm:h-3
                        sm:w-3
                      "
                      strokeWidth={3}
                    />
                  </button>

                  {/* QUANTITY */}

                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={cartQuantity}
                    onChange={(event) => {
                      if (
                        event.target.value === ''
                      ) {
                        return
                      }

                      const value =
                        Number(
                          event.target.value,
                        )

                      if (
                        !Number.isFinite(
                          value,
                        )
                      ) {
                        return
                      }

                      onSetQuantity(
                        product.id,
                        value,
                      )
                    }}
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                    onFocus={(event) =>
                      event.currentTarget.select()
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        event.currentTarget.blur()
                      }
                    }}
                    aria-label={
                      isAm
                        ? `${product.name} ብዛት`
                        : `${product.name} quantity`
                    }
                    className="
                      h-5
                      w-7
                      appearance-none
                      border-0
                      bg-transparent
                      p-0
                      text-center
                      font-mono
                      text-[10px]
                      font-black
                      text-berbere-700
                      outline-none
                      focus:ring-0
                      sm:h-6
                      sm:w-8
                      sm:text-[11px]
                    "
                  />

                  {/* INCREASE */}

                  <button
                    type="button"
                    onClick={() =>
                      onIncreaseQuantity(
                        product.id,
                      )
                    }
                    aria-label={
                      isAm
                        ? 'ብዛት ጨምር'
                        : 'Increase quantity'
                    }
                    className="
                      flex
                      h-5
                      w-5
                      items-center
                      justify-center
                      rounded
                      text-berbere-600
                      transition-colors
                      hover:bg-berbere-50
                      active:scale-90
                      sm:h-6
                      sm:w-6
                    "
                  >
                    <Plus
                      className="
                        h-2.5
                        w-2.5
                        sm:h-3
                        sm:w-3
                      "
                      strokeWidth={3}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
