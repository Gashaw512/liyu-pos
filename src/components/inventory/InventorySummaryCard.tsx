'use client'

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
  const totalProducts = products.length

  const totalItems = products.reduce((total, product) => {
    const stock =
      liveStockMap[product.id]?.systemCount ?? 0

    return total + stock
  }, 0)

  const pendingCount = products.filter(
    (product) =>
      liveStockMap[product.id]?.hasPendingTransactions,
  ).length

  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[#ede9db]
        bg-white
        shadow-sm
      "
    >
      <div className="bg-[#fdfcf8] px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#2B1E1A]">
              {t(
                'Stock Overview',
                'የእቃ አጠቃላይ ሁኔታ',
              )}
            </h3>

            <p className="mt-0.5 text-xs text-[#756B65]">
              {t(
                'What you have in stock now',
                'አሁን ያለዎት የእቃ መጠን',
              )}
            </p>
          </div>

          {pendingCount > 0 && (
            <span
              className="
                shrink-0
                rounded-full
                bg-[#F26522]/10
                px-2.5
                py-1
                text-[10px]
                font-semibold
                text-[#F26522]
              "
            >
              {pendingCount}{' '}
              {t(
                'pending',
                'በመጠባበቅ ላይ',
              )}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#ede9db] border-t border-[#ede9db]">
        <div className="px-4 py-3.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#756B65]">
            {t(
              'Products',
              'እቃዎች',
            )}
          </p>

          <p className="mt-1 text-lg font-bold text-[#1B2B50]">
            {totalProducts.toLocaleString(
              isAm ? 'am-ET' : 'en-US',
            )}
          </p>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#756B65]">
            {t(
              'Items in stock',
              'በክምችት ያሉ',
            )}
          </p>

          <p className="mt-1 text-lg font-bold text-[#1B2B50]">
            {totalItems.toLocaleString(
              isAm ? 'am-ET' : 'en-US',
            )}
          </p>
        </div>
      </div>
    </section>
  )
}