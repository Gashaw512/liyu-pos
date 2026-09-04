'use client'

import {
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import type { POSProduct } from './types'

interface POSProductGridProps {
  products: POSProduct[]
  cartQuantities: Map<string, number>
  onAddProduct: (product: POSProduct) => void
  onIncreaseQuantity: (id: string) => void
  onDecreaseQuantity: (id: string) => void
  onSetQuantity: (id: string, quantity: number) => void
  isAm: boolean
}

export default function POSProductGrid({
  products,
  cartQuantities,
  onAddProduct,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onSetQuantity,
  isAm,
}: POSProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-xl border border-cream-200 bg-cream-50">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-coffee-400">
            <ShoppingCart className="h-4 w-4" />
          </div>

          <p className="text-sm font-black text-coffee-700">
            {isAm ? 'እቃ አልተገኘም' : 'No products found'}
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

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => {
        const quantity = cartQuantities.get(product.id) ?? 0
        const isAdded = quantity > 0
        const price = Number(product.retail_price ?? 0)

        return (
          <div
            key={product.id}
            className={`
              group
              relative
              flex
              min-h-[88px]
              flex-col
              justify-between
              overflow-hidden
              rounded-xl
              border
              p-2
              transition-all
              duration-100
              ${
                isAdded
                  ? 'border-berbere-400 bg-berbere-50 shadow-sm'
                  : 'border-cream-200 bg-white hover:border-berbere-300 hover:bg-cream-50'
              }
            `}
          >
            {/* Product name */}
            <button
              type="button"
              onClick={() => onAddProduct(product)}
              aria-label={
                isAdded
                  ? `${product.name}, quantity ${quantity}`
                  : `Add ${product.name}`
              }
              className="min-w-0 flex-1 text-left active:scale-[0.98]"
            >
              <div className="min-w-0 pr-1">
                <p
                  className={`
                    line-clamp-2
                    text-[11px]
                    font-black
                    leading-[1.25]
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

            {/* Price + quantity controls */}
            <div className="mt-2 flex items-center justify-between gap-1.5">
              {/* Price */}
              <div className="min-w-0 shrink">
                <span
                  className={`
                    font-mono
                    text-xs
                    font-black
                    ${
                      isAdded
                        ? 'text-berbere-700'
                        : 'text-berbere-600'
                    }
                  `}
                >
                  {price.toLocaleString()}
                </span>

                <span className="ml-0.5 text-[8px] font-bold text-coffee-400">
                  ETB
                </span>
              </div>

              {!isAdded ? (
                /* Add button */
                <button
                  type="button"
                  onClick={() => onAddProduct(product)}
                  aria-label={
                    isAm
                      ? `${product.name} ወደ ትዕዛዝ ጨምር`
                      : `Add ${product.name}`
                  }
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-cream-100
                    text-coffee-500
                    transition-all
                    hover:bg-berbere-100
                    hover:text-berbere-600
                    active:scale-90
                  "
                >
                  <Plus
                    className="h-3.5 w-3.5"
                    strokeWidth={3}
                  />
                </button>
              ) : (
                /* Quantity controls */
                <div
                  className="
                    flex
                    h-7
                    shrink-0
                    items-center
                    gap-0.5
                    rounded-lg
                    bg-white
                    p-0.5
                    shadow-sm
                    ring-1
                    ring-berbere-100
                  "
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* Decrease */}
                  <button
                    type="button"
                    onClick={() =>
                      onDecreaseQuantity(product.id)
                    }
                    aria-label={
                      isAm
                        ? 'ብዛት ቀንስ'
                        : 'Decrease quantity'
                    }
                    className="
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-md
                      text-coffee-500
                      transition-colors
                      hover:bg-cream-100
                      hover:text-berbere-600
                      active:scale-90
                    "
                  >
                    <Minus
                      className="h-3 w-3"
                      strokeWidth={3}
                    />
                  </button>

                  {/* Exact quantity input */}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={quantity}
                    onChange={(event) => {
                      const value = Number(
                        event.target.value,
                      )

                      if (
                        event.target.value === ''
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
                      if (event.key === 'Enter') {
                        event.currentTarget.blur()
                      }
                    }}
                    aria-label={
                      isAm
                        ? `${product.name} ብዛት`
                        : `${product.name} quantity`
                    }
                    className="
                      h-6
                      w-9
                      appearance-none
                      border-0
                      bg-transparent
                      p-0
                      text-center
                      font-mono
                      text-[11px]
                      font-black
                      text-berbere-700
                      outline-none
                      focus:ring-0
                    "
                  />

                  {/* Increase */}
                  <button
                    type="button"
                    onClick={() =>
                      onIncreaseQuantity(product.id)
                    }
                    aria-label={
                      isAm
                        ? 'ብዛት ጨምር'
                        : 'Increase quantity'
                    }
                    className="
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-md
                      text-berbere-600
                      transition-colors
                      hover:bg-berbere-50
                      active:scale-90
                    "
                  >
                    <Plus
                      className="h-3 w-3"
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