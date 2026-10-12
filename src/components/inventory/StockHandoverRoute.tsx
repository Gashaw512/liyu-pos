'use client'

import { useParams } from 'next/navigation'
import StockHandoverPanel, { type StockHandoverView } from '@/components/inventory/StockHandoverPanel'

export default function StockHandoverRoute({ view }: { view: StockHandoverView }) {
  const params = useParams()
  const isAm = String(params.locale ?? 'en') === 'am'

  return (
    <main className="mx-auto min-h-full w-full max-w-5xl px-3 pb-5 sm:px-5">
      <StockHandoverPanel isAm={isAm} view={view} />
    </main>
  )
}
