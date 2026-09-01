// src/app/[locale]/(app)/sales/[salesID]/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ShoppingCart,
  Printer,
  Coffee,
  Coins,
  Receipt,
  CreditCard,
  ArrowLeft,
} from 'lucide-react'

import { getDB } from '../../../../../lib/offline/db'

export default function SaleReceiptPage() {
  const params = useParams()
  const router = useRouter()

  const isAm = params.locale === 'am'
  const saleId = params.saleID

  const [sale, setSale] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ============================================================
  // KEEP ORIGINAL WORKING RECEIPT LOADING LOGIC
  // ============================================================

  useEffect(() => {
    async function fetchSaleDetails() {
      try {
        const db = await getDB()

        const data = await db.get(
          'pending_sales',
          saleId as string,
        )

        setSale(data)
      } catch (err) {
        console.error(
          'Error reading receipt from IndexedDB:',
          err,
        )
      } finally {
        setLoading(false)
      }
    }

    fetchSaleDetails()
  }, [saleId])

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-100 p-6">
        <div className="w-full max-w-sm rounded-3xl border border-cream-300 bg-cream-50 p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-900">
            <Receipt className="h-7 w-7 animate-pulse text-gold-400" />
          </div>

          <p className="mt-4 text-sm font-black text-coffee-800">
            {isAm ? 'በመጫን ላይ...' : 'Loading Receipt...'}
          </p>

          <p className="mt-1 text-[10px] font-medium text-coffee-400">
            {isAm
              ? 'የሽያጭ መረጃ በማንበብ ላይ'
              : 'Reading saved sale information'}
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // NOT FOUND
  // ============================================================

  if (!sale) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-100 p-6">
        <div className="w-full max-w-sm rounded-3xl border border-cream-300 bg-cream-50 p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg">
            <Receipt className="h-7 w-7 text-danger" />
          </div>

          <h1 className="mt-4 text-lg font-black text-coffee-900">
            {isAm ? 'ሂሳብ አልተገኘም' : 'Sale Not Found'}
          </h1>

          <p className="mt-2 text-xs leading-5 text-coffee-400">
            {isAm
              ? 'የዚህ ሽያጭ መረጃ በመሳሪያው ላይ አልተገኘም።'
              : 'The saved sale could not be found on this device.'}
          </p>

          <button
            type="button"
            onClick={() => router.push(`/${params.locale}/sales`)}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-berbere-500 text-sm font-black text-white shadow-card transition hover:brightness-105 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            {isAm ? 'ወደ ሽያጭ ተመለስ' : 'Back to Sales'}
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // CALCULATIONS
  // ============================================================

  const subtotal =
    sale.subtotal ??
    (Number(sale.total_amount || 0) -
      Number(sale.tip_amount || 0))

  const tipAmount = Number(sale.tip_amount || 0)

  const totalAmount = Number(sale.total_amount || 0)

  const tableLocation =
    sale.table_number ||
    (isAm ? 'ቀጥታ መሸጫ' : 'Walk-in')

  const items = Array.isArray(sale.items)
    ? sale.items
    : []

  const payments = Array.isArray(sale.payments)
    ? sale.payments
    : []

  // ============================================================
  // RECEIPT
  // ============================================================

 return (
  <div className="min-h-dvh bg-cream-100 px-3 py-4 pb-24">

    {/* ONLY THIS PART PRINTS */}
    <div className="receipt-print-area mx-auto w-full max-w-md space-y-4">

      {/* Success */}
      <div className="text-center py-2 space-y-1">
        <CheckCircle2 className="mx-auto h-12 w-12 text-berbere-500" />

        <h1 className="text-xl font-black text-coffee-900">
          {isAm ? 'ሽያጩ ተጠናቋል!' : 'Sale Completed!'}
        </h1>

        <p className="text-xs font-mono text-coffee-400">
          {sale.receipt_number}
        </p>
      </div>

      {/* Table */}
      <div className="flex items-center justify-between rounded-2xl bg-coffee-900 p-4 text-white">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Coffee className="h-4 w-4 text-cream-300" />
          {isAm ? 'የጠረጴዛ ስም' : 'Table Name'}
        </span>

        <span className="text-base font-black uppercase tracking-wider">
          {tableLocation}
        </span>
      </div>

      {/* Receipt */}
      <div className="space-y-4 rounded-3xl border border-cream-300 bg-white p-5 shadow-sm">

        {/* Items */}
        <div className="border-b border-cream-200 pb-3">
          <span className="mb-3 block text-xs font-black uppercase tracking-wider text-coffee-400">
            {isAm ? 'የተሸጡ ዕቃዎች' : 'Items Sold'}
          </span>

          <div className="space-y-3">
            {sale.items?.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="block truncate font-black text-coffee-800">
                    {item.product_name}
                  </span>

                  <span className="font-mono text-xs text-coffee-400">
                    {item.unit_price} ETB × {item.quantity}
                  </span>
                </div>

                <span className="shrink-0 font-mono text-sm font-black text-coffee-900">
                  {item.total_price} ETB
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2">

          <div className="flex justify-between text-sm text-coffee-500">
            <span>
              {isAm ? 'የዕቃዎች ድምር' : 'Items Subtotal'}
            </span>

            <span className="font-mono font-bold">
              {subtotal} ETB
            </span>
          </div>

          {tipAmount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-cream-100 p-2 text-sm font-bold text-berbere-600">
              <span className="flex items-center gap-1">
                <Coins className="h-4 w-4" />
                {isAm ? 'ጉርሻ (ቲፕ)' : 'Waiter Tip'}
              </span>

              <span className="font-mono">
                +{tipAmount} ETB
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t-2 border-coffee-900 pt-3">
            <span className="text-base font-black text-coffee-900">
              {isAm ? 'አጠቃላይ የተሰበሰበ' : 'Total Collected'}
            </span>

            <span className="rounded-xl bg-cream-100 px-3 py-1 font-mono text-xl font-black text-berbere-600">
              {sale.total_amount} ETB
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-cream-200 bg-cream-50 p-3">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-coffee-400">
            {isAm ? 'የክፍያ መንገድ' : 'Payment Method'}
          </span>

          <div className="flex flex-wrap gap-2">
            {sale.payments?.map((p: any, idx: number) => (
              <span
                key={idx}
                className="rounded-lg border border-cream-300 bg-white px-2 py-1 text-xs font-bold text-coffee-700"
              >
                {p.method}:{' '}
                <span className="font-mono font-black text-coffee-900">
                  {p.amount} ETB
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* NEVER PRINT THESE */}
    <div className="receipt-no-print mx-auto mt-4 grid w-full max-w-md grid-cols-5 gap-3">

      <button
        type="button"
        onClick={() => window.print()}
        className="col-span-1 flex h-14 items-center justify-center rounded-2xl border border-cream-300 bg-cream-200 text-coffee-700 transition active:scale-95"
      >
        <Printer className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => router.push(`/${params.locale}/sales`)}
        className="col-span-4 flex h-14 items-center justify-center gap-2 rounded-2xl bg-berbere-500 text-base font-black text-white shadow-card transition hover:brightness-105 active:scale-95"
      >
        <ShoppingCart className="h-5 w-5" />
        <span>
          {isAm ? 'ቀጣይ አዲስ ማዘዣ' : 'Next New Order'}
        </span>
      </button>

    </div>

  </div>
)
}

/**
 * Small visual helper only.
 * Does not affect receipt loading or database logic.
 */
function selectedLabel(
  isAm: boolean,
  tableNumber: any,
) {
  if (tableNumber) {
    return isAm ? 'ጠረጴዛ' : 'TABLE'
  }

  return isAm ? 'ቀጥታ' : 'WALK-IN'
}