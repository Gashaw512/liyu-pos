'use client'

import POSCheckout from './POSCheckout'

import type {
  POSCartItem,
  POSTable,
  PaymentSplit,
} from './types'

interface POSCheckoutViewProps {
  cart: POSCartItem[]
  totalBill: number
  selectedTable: POSTable | null
  manualTip: string
  onManualTipChange: (value: string) => void
  onBack: () => void
  onConfirmPayment: (
    splitPayments: PaymentSplit,
  ) => Promise<void>
  isAm: boolean
}

export default function POSCheckoutView({
  cart,
  totalBill,
  selectedTable,
  manualTip,
  onManualTipChange,
  onBack,
  onConfirmPayment,
  isAm,
}: POSCheckoutViewProps) {
  return (
    <main className="h-full overflow-y-auto subtle-scrollbar">
      <div className="mx-auto w-full max-w-2xl p-3 sm:p-4 lg:p-6">
        <POSCheckout
          cart={cart}
          totalBill={totalBill}
          selectedTable={selectedTable}
          manualTip={manualTip}
          onManualTipChange={onManualTipChange}
          onBack={onBack}
          onConfirmPayment={onConfirmPayment}
          isAm={isAm}
        />
      </div>
    </main>
  )
}