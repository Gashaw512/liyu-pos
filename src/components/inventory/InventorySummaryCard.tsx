'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import InventoryValuation from './InventoryValuation'
import type { InventoryProduct } from '@/types/inventory'

interface LiveMetaData {
  systemCount: number
  hasPendingTransactions: boolean
}

interface InventorySummaryCardProps {
  products: InventoryProduct[]
  liveStockMap: Record<string, LiveMetaData>
  isAm: boolean
  t: (en: string, am: string) => string
}

export default function InventorySummaryCard({
  products,
  liveStockMap,
  isAm,
  t,
}: InventorySummaryCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="
        bg-white
        rounded-2xl
        border
        border-[#ede9db]
        shadow-sm
        overflow-hidden
      "
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="
          w-full
          flex
          items-center
          justify-between
          p-4
          bg-[#fdfcf8]
          active:bg-[#f9f6ef]
          transition-colors
        "
      >
        <div>
          <h3
            className="
              text-sm
              font-bold
              text-[#2B1E1A]
              text-left
            "
          >
            {t(
              'Inventory Summary',
              'የክምችት ማጠቃለያ'
            )}
          </h3>

          <p
            className="
              text-xs
              text-[#5a3e38]
              mt-1
            "
          >
            {t(
              'Stock value & inventory overview',
              'የእቃ ዋጋ እና የክምችት አጠቃላይ ሁኔታ'
            )}
          </p>
        </div>

        {expanded ? (
          <ChevronUp
            className="
              w-5
              h-5
              text-[#8B2635]
            "
          />
        ) : (
          <ChevronDown
            className="
              w-5
              h-5
              text-[#8B2635]
            "
          />
        )}
      </button>

      {expanded && (
        <div
          className="
            border-t
            border-[#ede9db]
            p-4
          "
        >
          <InventoryValuation
            products={products}
            liveStockMap={liveStockMap}
            isAm={isAm}
          />
        </div>
      )}
    </div>
  )
}