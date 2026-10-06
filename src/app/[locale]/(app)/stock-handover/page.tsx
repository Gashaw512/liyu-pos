'use client'

import { useParams } from 'next/navigation'
import { PackageCheck } from 'lucide-react'
import StockHandoverPanel from '@/components/inventory/StockHandoverPanel'

export default function StockHandoverPage() {
  const params = useParams()
  const isAm = String(params.locale ?? 'en') === 'am'

  return (
    <main className="mx-auto min-h-full w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
      <header className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-berbere-50 text-berbere-600">
          <PackageCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-black text-coffee-800">
            {isAm ? 'የእቃ ርክክብ' : 'Stock handover'}
          </h1>
          <p className="text-xs text-coffee-500">
            {isAm ? 'እቃ ይስጡ ወይም የተሰጠዎትን ያረጋግጡ።' : 'Issue stock or confirm what was given to you.'}
          </p>
        </div>
      </header>
      <StockHandoverPanel isAm={isAm} />
    </main>
  )
}
