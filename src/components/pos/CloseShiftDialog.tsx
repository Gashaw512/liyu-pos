'use client'

import { Check, Coins, Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface CloseShiftDialogProps {
  open: boolean
  isAm: boolean
  openingCash: number
  actualCash: string
  busy: boolean
  onActualCashChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

function formatMoney(value: number) {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
}

export default function CloseShiftDialog({
  open,
  isAm,
  openingCash,
  actualCash,
  busy,
  onActualCashChange,
  onCancel,
  onConfirm,
}: CloseShiftDialogProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal((
    <div
      className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[10000] flex items-end justify-center overflow-y-auto bg-coffee-900/50 p-0 pt-[env(safe-area-inset-top)] backdrop-blur-[2px] sm:inset-0 sm:items-center sm:p-4"
      onClick={busy ? undefined : onCancel}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-shift-title"
        className="flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-cream-200 bg-cream-50 shadow-modal sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 bg-coffee-900 p-5 text-white sm:p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-400">
            <Coins className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="close-shift-title" className="text-base font-black">
              {isAm ? 'ፈረቃውን ይዝጉ' : 'Close this shift'}
            </h2>
            <p className="mt-1 text-xs leading-5 text-cream-300">
              {isAm
                ? 'የተጠናቀቁ ሽያጮች ይቀመጣሉ። የካሽ ሳጥኑን ይቁጠሩ እና ያስገቡ።'
                : 'Completed sales stay saved. Count the cash drawer and enter the total below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-cream-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label={isAm ? 'ዝጋ' : 'Cancel closing shift'}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="flex items-center justify-between rounded-2xl border border-cream-200 bg-white px-4 py-3">
            <span className="text-xs font-bold text-coffee-500">
              {isAm ? 'የመነሻ ካሽ' : 'Opening cash'}
            </span>
            <span className="font-mono text-sm font-black text-coffee-800">{formatMoney(openingCash)}</span>
          </div>

          <label className="block">
            <span className="text-xs font-black text-coffee-700">
              {isAm ? 'አሁን በሳጥኑ ያለው ካሽ' : 'Cash counted in the drawer'}
            </span>
            <div className="relative mt-1.5">
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={actualCash}
                onChange={(event) => onActualCashChange(event.target.value)}
                placeholder="0.00"
                className="h-14 w-full rounded-2xl border border-cream-300 bg-white px-4 pr-16 font-mono text-lg font-black text-coffee-900 outline-none transition placeholder:text-coffee-200 focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100"
              />
              <span className="pointer-events-none absolute right-4 top-4 text-xs font-black text-coffee-400">ETB</span>
            </div>
            <span className="mt-1.5 block text-[10px] leading-4 text-coffee-400">
              {isAm ? 'ካሽ ካልቆጠሩ ባዶ ይተዉት።' : 'Leave blank if the drawer was not counted.'}
            </span>
          </label>

          <div className="rounded-xl bg-gold-50 px-3.5 py-3 text-[11px] leading-4 text-gold-800">
            {isAm
              ? 'ፈረቃው ከተዘጋ በኋላ ወደ አዲስ ፈረቃ መመለስ ይችላሉ። ሪፖርቱ የመላኪያ ሁኔታ እዚህ ይታያል።'
              : 'After closing, you can open another shift. The report delivery status will appear on the next screen.'}
          </div>
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-cream-200 bg-cream-100/70 p-3 sm:p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-3 text-xs font-black text-coffee-700 transition hover:bg-cream-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            {isAm ? 'ተወው' : 'Keep shift open'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-3 text-xs font-black text-white shadow-sm transition hover:bg-danger/90 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isAm ? 'ፈረቃ ዝጋ' : 'Close shift'}
          </button>
        </footer>
      </section>
    </div>
  ), document.body)
}
