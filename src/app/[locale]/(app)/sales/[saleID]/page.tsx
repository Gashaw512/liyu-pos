'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  ShoppingCart,
  Printer,
  Coffee,
  Coins,
  Receipt,
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
  // ORIGINAL WORKING RECEIPT LOADING LOGIC
  // ============================================================
  useEffect(() => {
    async function fetchSaleDetails() {
      try {
        const db = await getDB()
        const pendingSale = await db.get('pending_sales', saleId as string)
        if (pendingSale) {
          setSale(pendingSale)
          return
        }

        const historicalSale = await db.get('completed_sales_history', saleId as string)
        if (historicalSale) {
          setSale({
            ...historicalSale,
            localId: historicalSale.id,
            table_number: historicalSale.table_name,
            items: historicalSale.items.map((item) => ({
              ...item,
              total_price: item.total_amount,
            })),
          })
        }
      } catch (err) {
        console.error('Error reading receipt from IndexedDB:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSaleDetails()
    window.addEventListener('liyu:sync-complete', fetchSaleDetails)
    window.addEventListener('liyu:sale-sync-status', fetchSaleDetails)
    return () => {
      window.removeEventListener('liyu:sync-complete', fetchSaleDetails)
      window.removeEventListener('liyu:sale-sync-status', fetchSaleDetails)
    }
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500">
            <Receipt className="h-7 w-7 text-white" />
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
    (Number(sale.total_amount || 0) - Number(sale.tip_amount || 0))

  const tipAmount = Number(sale.tip_amount || 0)
  const totalAmount = Number(sale.total_amount || 0)

  const tableLocation =
    sale.table_number || (isAm ? 'ቀጥታ መሸጫ' : 'Walk-in')

  const items = Array.isArray(sale.items) ? sale.items : []
  const payments = Array.isArray(sale.payments) ? sale.payments : []
  const isSaleSynced = sale.localSyncStatus === 'synced' || sale.syncStatus === 'success'
  const saleIsSyncing = sale.syncStatus === 'syncing'
  const saleSyncFailed = sale.syncStatus === 'failed'

  // ============================================================
  // RENDER WITH EMBEDDED SENIOR-GRADE PRINT DESIGNS
  // ============================================================
    return (
    /* 
      1. Increased pb-24 to pb-40 so very long items are scrollable *above* your sticky/fixed bottom navbar.
      2. Added print:pb-0 print:pt-0 to clear margins completely during printer operations.
    */
    <div className="min-h-dvh bg-cream-100 px-3 py-4 pb-40 print:bg-white print:p-0">
      
      {/* 
        INJECTED PRINT STYLES:
        Ensures absolute clean isolation during print tasks. Forces the print block visible,
        removes standard window elements, sidebars, and hides screen actions cleanly.
      */}
      <style jsx global>{`
        @media print {
          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide everything in your system layout */
          body * {
            visibility: hidden !important;
          }
          /* Force only the isolated receipt template component to render */
          .receipt-print-area, .receipt-print-area * {
            visibility: visible !important;
          }
          .receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4px !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Ensure explicit deletion of the bottom actions bar during print layout */
          .receipt-no-print {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* ONLY THIS PART PRINTS */}
      <div className="receipt-print-area mx-auto w-full max-w-md space-y-4 print:mx-0 print:w-full print:max-w-none">

        {/* Success */}
        <div className="text-center py-2 space-y-1 break-inside-avoid">
          {isSaleSynced
            ? <CheckCircle2 className="mx-auto h-12 w-12 text-berbere-500 print:text-black" />
            : <Clock3 className="mx-auto h-12 w-12 text-gold-600 print:text-black" />}

          <h1 className="text-xl font-black text-coffee-900 print:text-black print:text-lg">
            {isSaleSynced ? (isAm ? 'ሽያጩ ተረጋግጧል' : 'Sale confirmed') : (isAm ? 'ሽያጩ ለማመሳሰል ይጠብቃል' : 'Sale saved — awaiting confirmation')}
          </h1>

          <p className="text-xs font-mono text-coffee-400 print:text-black">
            {sale.receipt_number}
          </p>
        </div>

        {!isSaleSynced && (
          <div
            role="status"
            className={`receipt-no-print rounded-xl px-3 py-2 text-center text-xs font-bold ${saleSyncFailed ? 'bg-gold-50 text-gold-800' : 'bg-cream-100 text-coffee-600'}`}
          >
            {saleIsSyncing
              ? isAm ? 'ሽያጩ እየተላከ ነው...' : 'Syncing sale...'
              : saleSyncFailed
              ? isAm ? 'እስካሁን አልተላከም። በራሱ እንደገና ይሞክራል።' : 'Not synced yet. It will retry automatically.'
              : isAm ? 'በዚህ መሣሪያ ተቀምጧል። ኢንተርኔት ሲኖር ይላካል።' : 'Saved on this device. It will sync when online.'}
          </div>
        )}

        {/* Table */}
        <div className="flex items-center justify-between rounded-2xl bg-coffee-900 p-4 text-white print:rounded-none print:border print:border-black print:bg-transparent print:text-black">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Coffee className="h-4 w-4 text-cream-300 print:text-black" />
            {isAm ? 'የጠረጴዛ ስም' : 'Table Name'}
          </span>

          <span className="text-base font-black uppercase tracking-wider tabular-nums">
            {tableLocation}
          </span>
        </div>

        {/* Receipt Base */}
        <div className="space-y-4 rounded-3xl border border-cream-300 bg-white p-5 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">

          {/* Items Container */}
          <div className="border-b border-cream-200 pb-3 print:border-black">
            <span className="mb-3 block text-xs font-black uppercase tracking-wider text-coffee-400 print:text-black">
              {isAm ? 'የተሸጡ ዕቃዎች' : 'Items Sold'}
            </span>

            <div className="space-y-3">
              {items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 text-sm break-inside-avoid"
                >
                  <div className="min-w-0 flex-1">
                    {/* Added leading-tight for smooth multiline text-wrapping in Amharic */}
                    <span className="block truncate font-black text-coffee-800 print:text-black print:whitespace-normal leading-tight">
                      {item.product_name}
                    </span>

                    <span className="font-mono text-xs text-coffee-400 print:text-black tabular-nums">
                      {item.unit_price} ETB × {item.quantity}
                    </span>
                  </div>

                  <span className="shrink-0 font-mono text-sm font-black text-coffee-900 print:text-black tabular-nums">
                    {item.total_price} ETB
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Financials */}
          <div className="space-y-2 break-inside-avoid">

            <div className="flex justify-between text-sm text-coffee-500 print:text-black">
              <span>
                {isAm ? 'የዕቃዎች ድምር' : 'Items Subtotal'}
              </span>

              <span className="font-mono font-bold tabular-nums">
                {subtotal} ETB
              </span>
            </div>

            {tipAmount > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-cream-100 p-2 text-sm font-bold text-berbere-600 print:bg-transparent print:text-black print:p-0">
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  {isAm ? 'ጉርሻ (ቲፕ)' : 'Waiter Tip'}
                </span>

                <span className="font-mono tabular-nums">
                  +{tipAmount} ETB
                </span>
              </div>
            )}

            {/* Dynamic Discount Line Item */}
            {Number(sale.discount_amount || 0) > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-red-50 p-2 text-sm font-bold text-red-600 print:bg-transparent print:text-black print:p-0">
                <span>
                  {isAm ? 'ቅናሽ' : 'Discount'}
                </span>

                <span className="font-mono tabular-nums">
                  -{Number(sale.discount_amount)} ETB
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-t-2 border-coffee-900 pt-3 print:border-black">
              <span className="text-base font-black text-coffee-900 print:text-black">
                {isAm ? 'አጠቃላይ የተሰበሰበ' : 'Total Collected'}
              </span>

              <span className="rounded-xl bg-cream-100 px-3 py-1 font-mono text-xl font-black text-berbere-600 print:bg-transparent print:text-black print:p-0 print:text-lg tabular-nums">
                {totalAmount} ETB
              </span>
            </div>

            {/* Change Due / Return Balance */}
            {Number(sale.amount_tendered || 0) > totalAmount && (
              <div className="flex items-center justify-between border-t border-dashed border-cream-300 pt-2 text-xs font-medium text-coffee-500 print:border-black print:text-black">
                <span>
                  {isAm ? 'ተመላሽ ሂሳብ' : 'Change Due'}
                </span>
                
                <span className="font-mono tabular-nums">
                  {Number(sale.amount_tendered) - totalAmount} ETB
                </span>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 break-inside-avoid print:rounded-none print:border-none print:bg-transparent print:px-0">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-coffee-400 print:text-black">
              {isAm ? 'የክፍያ መንገድ' : 'Payment Method'}
            </span>

            <div className="flex flex-wrap gap-2">
              {payments.map((p: any, idx: number) => (
                <span
                  key={idx}
                  className="rounded-lg border border-cream-300 bg-white px-2 py-1 text-xs font-bold text-coffee-700 print:border-black print:text-black print:p-0"
                >
                  {p.method}:{' '}
                  <span className="font-mono font-black text-coffee-900 print:text-black tabular-nums">
                    {p.amount} ETB
                  </span>
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* NEVER PRINT THESE ACTION BUTTONS */}
      <div className="receipt-no-print mx-auto mt-4 grid w-full max-w-md grid-cols-5 gap-3 print:hidden">

        <button
          type="button"
          onClick={() => window.print()}
          className="col-span-1 flex h-14 items-center justify-center rounded-2xl border border-cream-300 bg-cream-200 text-coffee-700 transition active:scale-95 hover:bg-cream-300"
          aria-label="Print receipt"
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
