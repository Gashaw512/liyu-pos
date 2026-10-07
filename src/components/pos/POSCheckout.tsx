'use client'

import {
  ArrowLeft,
  Coins,
  Receipt,
  ShoppingBag,
} from 'lucide-react'

import PaymentSelector from './PaymentSelector'

import type {
  POSCartItem,
  POSTable,
  PaymentSplit,
} from './types'

interface POSCheckoutProps {
  cart: POSCartItem[]
  totalBill: number
  selectedTable: POSTable | null
  manualTip: string
  onManualTipChange: (value: string) => void
  onBack: () => void
  onConfirmPayment: (
    splitPayments: PaymentSplit,
    roomNumber?: string,
  ) => Promise<void>
  isAm: boolean
  isSubmitting?: boolean
  roomChargeEnabled?: boolean
}

export default function POSCheckout({
  cart,
  totalBill,
  selectedTable,
  manualTip,
  onManualTipChange,
  onBack,
  onConfirmPayment,
  isAm,
  isSubmitting = false,
  roomChargeEnabled = false,
}: POSCheckoutProps) {
  const taxRate = Math.max(0, Number(cart[0]?.business_tax_rate) || 0)
  const exclusiveTax = cart.reduce((sum, item) => {
    if (item.tax_inclusive !== false) return sum
    return sum + Number(item.price || 0) * Number(item.quantity || 0) * taxRate / 100
  }, 0)
  const amountDue = Math.round((totalBill + exclusiveTax + (Number(manualTip) || 0) + Number.EPSILON) * 100) / 100

  const totalItems = cart.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0,
  )

  const handleTipChange = (
    value: string,
  ) => {
    if (value === '') {
      onManualTipChange('')
      return
    }

    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
      return
    }

    onManualTipChange(
      String(Math.max(0, parsed)),
    )
  }

  return (
    <div
      className="
        mx-auto w-full max-w-xl
        px-1
        pb-[calc(6rem+env(safe-area-inset-bottom))]
        sm:pb-6
      "
    >
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="mb-2.5 flex h-9 items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="
            inline-flex h-8 items-center gap-1.5
            rounded-lg
            border border-cream-300
            bg-cream-50
            px-2.5
            text-xs font-black
            text-coffee-700
            transition
            hover:border-berbere-300
            hover:bg-cream-100
            active:scale-[0.97]
          "
        >
          <ArrowLeft className="h-3.5 w-3.5" />

          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <div
          className="
            flex items-center gap-1.5
            text-[10px] font-black
            uppercase tracking-wider
            text-coffee-400
          "
        >
          <Receipt className="h-3.5 w-3.5" />

          {isAm ? 'ክፍያ' : 'Checkout'}
        </div>
      </header>

      {/* ====================================================== */}
      {/* ORDER SUMMARY */}
      {/* ====================================================== */}

      <section
        className="
          mb-2.5
          rounded-xl
          border border-cream-300
          bg-cream-50
          px-3 py-2
        "
      >
        <div className="flex items-center gap-2">
          <div
            className="
              flex h-8 w-8 shrink-0
              items-center justify-center
              rounded-lg
              bg-berbere-50
            "
          >
            <ShoppingBag className="h-4 w-4 text-berbere-500" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-coffee-700">
                {isAm ? 'ትዕዛዝ' : 'Order'}
              </span>

              {selectedTable && (
                <>
                  <span className="text-coffee-300">
                    •
                  </span>

                  <span
                    className="
                      truncate
                      text-[10px]
                      font-bold
                      text-coffee-500
                    "
                  >
                    {selectedTable.name}
                  </span>
                </>
              )}
            </div>

            <p className="text-[10px] text-coffee-400">
              {totalItems}{' '}
              {isAm
                ? 'ዕቃዎች'
                : totalItems === 1
                  ? 'item'
                  : 'items'}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <div
              className="
                font-mono
                text-lg
                font-black
                leading-none
                text-berbere-500
              "
            >
              {amountDue.toLocaleString()}
            </div>

            <span
              className="
                text-[9px]
                font-black
                text-coffee-400
              "
            >
              ETB
            </span>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* TIP */}
      {/* ====================================================== */}

      <section
        className="
          mb-2.5
          rounded-xl
          border border-cream-300
          bg-cream-50
          px-3 py-2
        "
      >
        <div className="flex items-center gap-2">
          <div
            className="
              flex h-7 w-7 shrink-0
              items-center justify-center
              rounded-lg
              bg-gold-50
            "
          >
            <Coins className="h-3.5 w-3.5 text-gold-600" />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <label
              htmlFor="manual-tip"
              className="
                text-xs
                font-black
                text-coffee-700
              "
            >
              {isAm ? 'ጉርሻ' : 'Tip'}
            </label>

            <span
              className="
                text-[9px]
                text-coffee-400
              "
            >
              ({isAm ? 'አማራጭ' : 'optional'})
            </span>
          </div>

          <div className="relative ml-auto w-24">
            <input
              id="manual-tip"
              type="number"
              min="0"
              step="0.01"
              value={manualTip}
              onChange={(event) =>
                handleTipChange(
                  event.target.value,
                )
              }
              placeholder="0"
              inputMode="decimal"
              className="
                h-8 w-full
                rounded-lg
                border border-cream-300
                bg-cream-100
                px-2 pr-8
                font-mono
                text-xs
                font-bold
                text-coffee-800
                outline-none
                transition
                placeholder:text-coffee-400
                focus:border-berbere-300
                focus:bg-cream-50
                focus:ring-2
                focus:ring-berbere-100
              "
            />

            <span
              className="
                pointer-events-none
                absolute right-2 top-1/2
                -translate-y-1/2
                text-[9px]
                font-black
                text-coffee-400
              "
            >
              ETB
            </span>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* PAYMENT */}
      {/* ====================================================== */}

      <section
        className="
          rounded-xl
          border border-cream-300
          bg-cream-50
          p-3
        "
      >
        <div className="mb-2">
          <h2
            className="
              text-xs
              font-black
              text-coffee-700
            "
          >
            {isAm
              ? 'የክፍያ መንገድ'
              : 'Payment'}
          </h2>

          <p
            className="
              text-[10px]
              text-coffee-400
            "
          >
            {isAm
              ? 'የክፍያ ዘዴ ይምረጡ'
              : 'Select payment method'}
          </p>
        </div>

        <PaymentSelector
          key={amountDue}
          totalBill={amountDue}
          onConfirmPayment={onConfirmPayment}
          isAm={isAm}
          isSubmitting={isSubmitting}
          roomChargeEnabled={roomChargeEnabled}
        />
      </section>
    </div>
  )
}
