'use client'

import { Check, Plus } from 'lucide-react'
import type { POSProduct } from './types'

interface POSProductGridProps {
  products: POSProduct[]
  cartProductIds: Set<string>
  onAddProduct: (product: POSProduct) => void
  isAm: boolean
}

export default function POSProductGrid({
  products,
  cartProductIds,
  onAddProduct,
  isAm,
}: POSProductGridProps) {
  if (!products.length) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-cream-300 bg-cream-50 text-center">
        <div>
          <div className="mx-auto mb-2 text-2xl">🛒</div>

          <p className="text-sm font-black text-coffee-700">
            {isAm ? 'እቃ አልተገኘም' : 'No products found'}
          </p>

          <p className="mt-1 text-xs text-coffee-400">
            {isAm
              ? 'በዚህ ምድብ እቃ የለም'
              : 'No products in this category'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => {
        const price = Number(product.retail_price ?? 0)
        const inCart = cartProductIds.has(product.id)

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onAddProduct(product)}
            className={[
              'relative flex min-h-[104px] flex-col justify-between',
              'rounded-xl border p-3 text-left',
              'transition active:scale-[0.97]',
              inCart
                ? 'border-berbere-500 bg-berbere-50 ring-1 ring-berbere-300'
                : 'border-cream-300 bg-cream-50 hover:border-berbere-300',
            ].join(' ')}
          >
            {/* Selected */}
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-black leading-tight text-coffee-700">
                {product.name}
              </span>

              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  inCart
                    ? 'bg-berbere-500 text-white'
                    : 'bg-cream-200 text-coffee-500',
                ].join(' ')}
              >
                {inCart ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </span>
            </div>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-mono text-base font-black text-berbere-600">
                {price.toLocaleString()}
              </span>

              <span className="text-[9px] font-bold text-coffee-400">
                ETB
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}