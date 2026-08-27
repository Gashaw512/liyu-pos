'use client'

import { Plus } from 'lucide-react'

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
  if (products.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-cream-300 bg-cream-50 p-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-200">
            <span className="text-xl">🛒</span>
          </div>

          <p className="font-black text-coffee-700">
            {isAm ? 'እቃ አልተገኘም' : 'No products found'}
          </p>

          <p className="mt-1 text-xs text-coffee-400">
            {isAm
              ? 'በዚህ ምድብ ምንም እቃ የለም'
              : 'No products are available in this category'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {products.map((product) => {
        const price = Number(product.retail_price ?? 0)
        const inCart = cartProductIds.has(product.id)

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onAddProduct(product)}
            className={[
              'group relative min-h-[132px] overflow-hidden rounded-2xl border p-3 text-left',
              'transition-all active:scale-[0.97]',
              inCart
                ? 'border-berbere-400 bg-berbere-50 ring-2 ring-berbere-200'
                : 'border-cream-300 bg-cream-50 hover:border-berbere-300 hover:bg-white',
            ].join(' ')}
          >
            {inCart && (
              <div className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-berbere-500 px-1.5 font-mono text-[10px] font-black text-white">
                ✓
              </div>
            )}

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cream-200 text-lg">
              🍽️
            </div>

            <div className="line-clamp-2 pr-2 text-sm font-black leading-tight text-coffee-800">
              {product.name}
            </div>

            <div className="mt-2 flex items-end justify-between gap-1">
              <div>
                <span className="font-mono text-sm font-black text-berbere-600">
                  {price.toLocaleString()}
                </span>

                <span className="ml-1 text-[9px] font-bold text-coffee-400">
                  ETB
                </span>
              </div>

              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coffee-900 text-white transition-transform group-active:scale-90">
                <Plus className="h-4 w-4" />
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}