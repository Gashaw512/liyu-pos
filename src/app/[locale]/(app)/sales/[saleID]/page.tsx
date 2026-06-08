'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getDB } from '../../../../../lib/offline/db' 
import { CheckCircle2, ShoppingCart, Printer, Coffee, Coins } from 'lucide-react'

export default function SaleReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const saleId = params.saleID 

  const [sale, setSale] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSaleDetails() {
      try {
        const db = await getDB()
        const data = await db.get('pending_sales', saleId as string)
        setSale(data)
      } catch (err) {
        console.error('Error reading receipt from IndexedDB:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSaleDetails()
  }, [saleId])

  if (loading) return <div className="p-8 text-center text-sm font-bold text-slate-500 animate-pulse">{isAm ? 'በመጫን ላይ...' : 'Loading Invoice...'}</div>
  if (!sale) return <div className="p-8 text-center text-rose-500 font-bold">{isAm ? 'ሂሳብ አልተገኘም' : 'Sale Not Found'}</div>

  // Clean numbers calculation
  const subtotal = sale.subtotal ?? (sale.total_amount - (sale.tip_amount ?? 0))
  const tipAmount = sale.tip_amount ?? 0
  const tableLocation = sale.table_number || (isAm ? 'ቀጥታ መሸጫ' : 'Walk-in')

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24 select-none">
      
      {/* 1. Success Message */}
      <div className="text-center py-2 space-y-1">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-black text-slate-900">{isAm ? 'ሽያጩ ተጠናቋል!' : 'Sale Completed!'}</h1>
        <p className="text-xs font-mono text-slate-400">{sale.receipt_number}</p>
      </div>

      {/* 2. Table Name Display */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex justify-between items-center shadow-sm">
        <span className="text-sm font-bold flex items-center gap-2">
          <Coffee className="w-4 h-4 text-slate-300" />
          {isAm ? 'የጠረጴዛ ስም' : 'Table Name'}
        </span>
        <span className="text-base font-black uppercase tracking-wider">{tableLocation}</span>
      </div>

      {/* 3. Items Ordered Receipt Details */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-400 block mb-2">{isAm ? 'የተሸጡ ዕቃዎች' : 'Items Sold'}</span>
          <div className="space-y-3">
            {sale.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold text-slate-800 block">{item.product_name}</span>
                  <span className="text-xs text-slate-400 font-mono">{item.unit_price} ETB x {item.quantity}</span>
                </div>
                <span className="font-mono font-black text-slate-900 text-right">{item.total_price} ETB</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Money Calculation Breakdown */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-sm text-slate-500">
            <span>{isAm ? 'የዕቃዎች ድምር' : 'Items Subtotal'}</span>
            <span className="font-mono font-bold">{subtotal} ETB</span>
          </div>
          
          {tipAmount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50/60 p-2 rounded-xl">
              <span className="flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {isAm ? 'ጉርሻ (ቲፕ)' : 'Waiter Tip'}
              </span>
              <span className="font-mono">+{tipAmount} ETB</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-3 border-t-2 border-slate-950 text-slate-900">
            <span className="font-black text-base">{isAm ? 'አጠቃላይ የተሰበሰበ' : 'Total Collected'}</span>
            <span className="font-mono font-black text-xl text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">
              {sale.total_amount} ETB
            </span>
          </div>
        </div>

        {/* 5. How Payment Was Made */}
        <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1.5 border border-slate-100">
          <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">
            {isAm ? 'የክፍያ መንገድ' : 'Payment Method'}
          </span>
          <div className="flex flex-wrap gap-2">
            {sale.payments?.map((p: any, idx: number) => (
              <span key={idx} className="bg-white border border-slate-200 px-2 py-1 rounded-lg font-bold text-slate-700 capitalize">
                {p.method}: <span className="font-mono text-slate-900">{p.amount} ETB</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Simple Layout Buttons */}
      <div className="grid grid-cols-5 gap-3">
        <button 
          onClick={() => window.print()} 
          className="col-span-1 h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
        >
          <Printer className="w-5 h-5" />
        </button>

        <button
          onClick={() => router.push(`/${params.locale}/sales`)}
          className="col-span-4 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{isAm ? 'ቀጣይ አዲስ ማዘዣ' : 'Next New Order'}</span>
        </button>
      </div>

    </div>
  )
}