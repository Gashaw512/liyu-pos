'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import StockRow from '@/components/inventory/StockRow'

import type {
  InventoryProduct,
  LiveMetaData
} from '@/types/inventory'

interface InventoryProductListProps {
  products: InventoryProduct[]
  counts: Record<string, number>
  liveStockMap: Record<string, LiveMetaData>
  rowSavingId: string | null
  isAm: boolean
  t: (en: string, am: string) => string
  onCountChange: (productId: string, value: number) => void
  onSaveRow: (product: InventoryProduct) => void
}

export default function InventoryProductList({
  products,
  counts,
  liveStockMap,
  rowSavingId,
  isAm,
  t,
  onCountChange,
  onSaveRow
}: InventoryProductListProps) {

  return (
    <div className="space-y-4">
      {products.map((product) => {

        const live = liveStockMap[product.id]

        const systemCount =
          live?.systemCount ?? product.opening_count

        const currentCount =
          counts[product.id] ?? systemCount

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

        const costPrice =
          product.cost_price ??
          product.retail_price * 0.7

        return (
          <div key={product.id} className="relative">

            <StockRow
              productName={name}
              category={category}
              unitType={product.unit_type}
              systemCount={systemCount}
              currentCount={currentCount}
              costPrice={costPrice}
              retailPrice={product.retail_price}
              onCountChange={(value) =>
                onCountChange(product.id, value)
              }
              isAm={isAm}
            />

            {hasChanged && (
              <div className="absolute right-3 top-3 z-10">
                <Button
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => onSaveRow(product)}
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    t('Save', 'አስቀምጥ')
                  )}
                </Button>
              </div>
            )}

          </div>
        )
      })}
    </div>
  )
}