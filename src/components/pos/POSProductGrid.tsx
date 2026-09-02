'use client'

import { Plus, ShoppingCart } from 'lucide-react'
import type { POSProduct } from './types'

interface POSProductGridProps {
  products: POSProduct[]
  cartQuantities: Map<string, number>
  onAddProduct: (product: POSProduct) => void
  isAm: boolean
}

export default function POSProductGrid({
  products,
  cartQuantities,
  onAddProduct,
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
          <button
            key={product.id}
            type="button"
            onClick={() => onAddProduct(product)}
            aria-label={
              isAdded
                ? `${product.name}, quantity ${quantity}`
                : `Add ${product.name}`
            }
            className={`
              group
              relative
              flex
              min-h-[78px]
              flex-col
              justify-between
              overflow-hidden
              rounded-xl
              border
              p-2
              text-left
              transition-all
              duration-100
              active:scale-[0.97]
              ${
                isAdded
                  ? 'border-berbere-400 bg-berbere-50 shadow-sm'
                  : 'border-cream-200 bg-white hover:border-berbere-300 hover:bg-cream-50'
              }
            `}
          >
            {/* Quantity badge */}
            {isAdded && (
              <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-berbere-600 px-1.5 text-[10px] font-black text-white shadow-sm">
                {quantity}
              </span>
            )}

            {/* Product name */}
            <div className="min-w-0 pr-7">
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

            {/* Bottom */}
            <div className="mt-2 flex items-center justify-between gap-1">
              <div className="min-w-0">
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

              <span
                className={`
                  flex
                  h-6
                  w-6
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  ${
                    isAdded
                      ? 'bg-white text-berbere-600'
                      : 'bg-cream-100 text-coffee-500 group-hover:bg-berbere-100 group-hover:text-berbere-600'
                  }
                `}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}