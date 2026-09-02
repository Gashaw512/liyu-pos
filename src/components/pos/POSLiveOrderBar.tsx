'use client'

import { Coins, Save, ShoppingCart } from 'lucide-react'

interface POSLiveOrderBarProps {
  isAm: boolean
  selectedTable?: {
    id: string
    name: string
  } | null
  totalItems: number
  totalBill: number
  hasUnsavedChanges: boolean
  canSave: boolean
  onSave: () => void
  onPay: () => void
}

export default function POSLiveOrderBar({
  isAm,
  selectedTable,
  totalItems,
  totalBill,
  hasUnsavedChanges,
  canSave,
  onSave,
  onPay,
}: POSLiveOrderBarProps) {
  return (
    <div className="shrink-0 border-b border-cream-300 bg-cream-50/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex min-h-[58px] w-full max-w-[1600px] items-center gap-2 px-2 py-2 sm:px-3 lg:px-4">
        {/* Order information */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-berbere-100">
            <ShoppingCart className="h-4 w-4 text-berbere-600" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[10px] font-black text-berbere-600">
              {selectedTable
                ? selectedTable.name
                : isAm
                  ? 'ቀጥታ ሽያጭ'
                  : 'Walk-in'}
            </p>

            <p className="truncate text-xs font-black text-coffee-900">
              {totalItems}{' '}
              {isAm
                ? 'እቃ'
                : totalItems === 1
                  ? 'item'
                  : 'items'}{' '}
              · {totalBill.toLocaleString()} ETB
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {canSave && hasUnsavedChanges && (
            <button
              type="button"
              onClick={onSave}
              className="
                flex
                h-9
                items-center
                gap-1.5
                rounded-xl
                border
                border-cream-300
                bg-white
                px-2.5
                text-[11px]
                font-black
                text-coffee-700
                shadow-sm
                transition
                hover:bg-cream-100
                active:scale-95
              "
            >
              <Save className="h-3.5 w-3.5" />

              <span className="hidden sm:inline">
                {isAm ? 'አስቀምጥ' : 'Save'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onPay}
            disabled={totalItems === 0}
            className="
              flex
              h-9
              items-center
              gap-1.5
              rounded-xl
              bg-berbere-500
              px-3
              text-[11px]
              font-black
              text-white
              shadow-sm
              transition
              hover:bg-berbere-600
              active:scale-95
              disabled:pointer-events-none
              disabled:opacity-40
            "
          >
            <Coins className="h-3.5 w-3.5" />

            <span>
              {isAm ? 'ክፍያ' : 'Pay'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}