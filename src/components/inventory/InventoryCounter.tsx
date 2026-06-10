'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { InventoryProduct } from '../../types/inventory'

interface Props {
  product: InventoryProduct
  initialCount?: number
  onChange: (productId: string, count: number) => void
}

export function InventoryCounter({ product, initialCount = 0, onChange }: Props) {
  const [count, setCount] = useState(initialCount)
  const t = useTranslations('inventory')

  const change = (delta: number) => {
    const next = Math.max(0, count + delta)
    setCount(next)
    onChange(product.id, next)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-coffee-100">
      <span className="text-2xl">{product.category_icon || '📦'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-coffee-700 truncate">{product.name}</p>
        <p className="text-xs text-coffee-400">{product.category_name} · {t('opening')}: {initialCount}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => change(-1)}
          className="w-10 h-10 rounded-full border-2 border-berbere-500
                     text-berbere-500 text-xl font-bold flex items-center justify-center
                     active:bg-berbere-50 touch-manipulation"
          aria-label="decrease"
        >−</button>
        <span className="text-lg font-bold min-w-[28px] text-center tabular-nums">
          {count}
        </span>
        <button
          onClick={() => change(1)}
          className="w-10 h-10 rounded-full bg-berbere-500
                     text-white text-xl font-bold flex items-center justify-center
                     active:bg-berbere-600 touch-manipulation"
          aria-label="increase"
        >+</button>
      </div>
    </div>
  )
}