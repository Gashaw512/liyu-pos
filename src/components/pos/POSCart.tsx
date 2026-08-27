'use client'

import {
  Minus,
  Plus,
  Save,
  Receipt,
  Trash2,
  Loader2,
} from 'lucide-react'

import type { POSCartItem, POSTable } from './types'

interface POSCartProps {
  cart: POSCartItem[]
  totalBill: number
  selectedTable: POSTable | null
  savingTab: boolean
  onIncrease: (id: string, amount?: number) => void
  onDecrease: (id: string) => void
  onClearItem: (id: string) => void
  onSaveTab: () => Promise<void>
  onCheckout: () => void
  isAm: boolean
}

export default function POSCart({
  cart,
  totalBill,
  selectedTable,
  savingTab,
  onIncrease,
  onDecrease,
  onClearItem,
  onSaveTab,
  onCheckout,
  isAm,
}: POSCartProps) {
  if (cart.length === 0) return null

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )

  return (
    <div className="shrink-0 rounded-t-3xl border-t border-cream-300 bg-cream-50 p-3 shadow-elevated">
      {/* Cart heading */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-coffee-700">
            {isAm ? 'የአሁኑ ትዕዛዝ' : 'Current Order'}
          </span>

          <span className="ml-2 rounded-full bg-cream-200 px-2 py-0.5 text-[9px] font-black text-coffee-500">
            {totalItems}
          </span>
        </div>

        {selectedTable && (
          <span className="max-w-[110px] truncate rounded-lg bg-gold-100 px-2 py-1 text-[10px] font-black text-coffee-700">
            {selectedTable.name}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="max-h-[150px] space-y-1.5 overflow-y-auto pr-1 subtle-scrollbar">
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white p-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-coffee-800">
                {item.name}
              </p>

              <p className="font-mono text-[10px] text-coffee-400">
                {item.price.toLocaleString()} ETB
              </p>
            </div>

            <div className="flex items-center rounded-lg border border-cream-300 bg-cream-100 p-0.5">
              <button
                type="button"
                onClick={() => onDecrease(item.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white active:scale-90"
              >
                <Minus className="h-3 w-3" />
              </button>

              <span className="w-7 text-center font-mono text-xs font-black">
                {item.quantity}
              </span>

              <button
                type="button"
                onClick={() => onIncrease(item.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white active:scale-90"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <div className="w-[62px] text-right">
              <p className="font-mono text-xs font-black text-coffee-800">
                {(item.price * item.quantity).toLocaleString()}
              </p>

              <button
                type="button"
                onClick={() => onClearItem(item.id)}
                className="text-[9px] font-bold text-danger"
              >
                <Trash2 className="ml-auto h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="my-2 flex items-center justify-between rounded-xl bg-coffee-900 px-3 py-2.5 text-white">
        <span className="text-xs font-bold text-cream-300">
          {isAm ? 'ጠቅላላ' : 'TOTAL'}
        </span>

        <span className="font-mono text-lg font-black text-gold-300">
          {totalBill.toLocaleString()} ETB
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-5 gap-2">
        <button
          type="button"
          disabled={!selectedTable || savingTab}
          onClick={onSaveTab}
          className="col-span-2 flex h-12 items-center justify-center gap-1.5 rounded-xl border border-cream-300 bg-cream-200 text-xs font-black text-coffee-700 active:scale-95 disabled:opacity-40"
        >
          {savingTab ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          <span>
            {isAm ? 'አስቀምጥ' : 'Save Tab'}
          </span>
        </button>

        <button
          type="button"
          onClick={onCheckout}
          className="col-span-3 flex h-12 items-center justify-between rounded-xl bg-berbere-500 px-3 text-sm font-black text-white shadow-card active:scale-95"
        >
          <span className="flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />

            {isAm ? 'ሂሳብ ዝጋ' : 'Checkout'}
          </span>

          <span className="font-mono text-xs text-gold-200">
            {totalBill.toLocaleString()}
          </span>
        </button>
      </div>
    </div>
  )
}