'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Settings,
  Store,
} from 'lucide-react'

interface OwnerActionHeaderProps {
  locale: string
}

export function OwnerActionHeader({
  locale,
}: OwnerActionHeaderProps) {
  const router = useRouter()
  const isAm = locale === 'am'

  const t = (en: string, am: string) =>
    isAm ? am : en

  const goToInventory = () => {
    router.push(`/${locale}/inventory`)
  }

  const goToSales = () => {
    router.push(`/${locale}/sales`)
  }

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-berbere-100 bg-berbere-50 text-berbere-600">
          <Store className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-sm font-black text-coffee-900">
            {t(
              'Live Operations Control',
              'የሱቅዎ የቀጥታ ሁኔታ',
            )}
          </h3>

          <p className="text-[11px] font-medium text-coffee-400">
            {t(
              'Real-time overview of business indicators',
              'የዛሬው የንግድ እንቅስቃሴ ማጠቃለያ',
            )}
          </p>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={goToInventory}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cream-300 bg-coffee-100 px-4 py-2.5 text-xs font-black text-coffee-900 transition-all hover:bg-cream-200 active:scale-95 sm:flex-none"
        >
          <Settings className="h-3.5 w-3.5 text-coffee-700" />

          <span>
            {t(
              'Manage Stock',
              'ዕቃዎች መጋዘን',
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={goToSales}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-berbere-600 px-4 py-2.5 text-xs font-black text-white transition-all hover:bg-berbere-700 active:scale-95 sm:flex-none"
        >
          <span>
            {t(
              'Open POS Counter',
              'ወደ ሽያጭ ማሽን',
            )}
          </span>

          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}