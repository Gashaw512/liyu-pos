'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Percent, Landmark, ShieldCheck } from 'lucide-react'
import { getDB } from '../../../../../lib/offline/db'

export default function MonthlyReportPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const locale = params.locale || 'am'

  const [loading, setLoading] = useState(true)
  const [calculations, setCalculations] = useState({ gross: 0, tax: 0, net: 0, orders: 0 })

  useEffect(() => {
    async function compileMonthlyLedger() {
      try {
        const db = await getDB()
        const history = await db.getAll('completed_sales_history')
        const pending = await db.getAll('pending_sales')
        const allSales = [...history, ...pending]

        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()

        let grossSum = 0
        let currentMonthOrders = 0

        allSales.forEach((sale: any) => {
          const d = new Date(sale.createdAt)
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            grossSum += (sale.total_amount || sale.amount || 0)
            currentMonthOrders++
          }
        })

        // Standard operational accounting approximations (e.g., 15% VAT estimate mapping)
        const estimatedTax = Math.round(grossSum * 0.15)
        const netCalculated = grossSum - estimatedTax

        setCalculations({ gross: grossSum, tax: estimatedTax, net: netCalculated, orders: currentMonthOrders })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    compileMonthlyLedger()
  }, [])

  const t = (en: string, am: string) => (isAm ? am : en)

  if (loading) return <div className="p-6 text-center font-bold text-[#8B2635]">...</div>

  return (
    <div className="min-h-screen bg-[#F7F4EB] p-4 font-['DM_Sans',sans-serif] pb-24">
      <div className="max-w-md mx-auto flex items-center justify-between mb-5">
        <button onClick={() => router.push(`/${locale}/reports` as any)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5a3e38] bg-white px-3 py-2 rounded-xl border border-[#2B1E1A]/10 shadow-sm">
          <ArrowLeft className="w-3.5 h-3.5 text-[#8B2635]" />
          {t('Back', 'ተመለስ')}
        </button>
        <h1 className="font-['Playfair_Display',serif] font-black text-lg text-[#2B1E1A]">{t('Monthly Ledger', 'የወር ማጠቃለያ')}</h1>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Core Financial Cascade Cards Block */}
        <div className="bg-white rounded-xl border border-[#2B1E1A]/10 shadow-sm divide-y divide-zinc-100 overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-[#8B2635]/5">
            <span className="text-xs font-bold text-[#8B2635] flex items-center gap-1.5"><Landmark className="w-4 h-4" /> {t('Gross Volume Recorded', 'ጠቅላላ ወርሃዊ ገቢ')}</span>
            <span className="font-black font-mono text-base text-[#2B1E1A]">{calculations.gross} ETB</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <span className="text-xs font-medium text-[#5a3e38] flex items-center gap-1.5"><Percent className="w-4 h-4 text-[#9b7b74]" /> {t('Estimated VAT Reserve (15%)', 'የተገመተ አስራ አምስት በመቶ ተእታ')}</span>
            <span className="font-bold font-mono text-xs text-red-700">-{calculations.tax} ETB</span>
          </div>
          <div className="p-4 flex justify-between items-center bg-zinc-50/60">
            <span className="text-xs font-black text-[#2B1E1A] flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {t('Net Clean Balance', 'የተጣራ የተረጋገጠ ሂሳብ')}</span>
            <span className="font-black font-mono text-base text-emerald-700">{calculations.net} ETB</span>
          </div>
        </div>

        {/* Operational Volume Footprint */}
        <div className="bg-white p-4 rounded-xl border border-[#2B1E1A]/10 shadow-sm text-xs flex justify-between items-center">
          <span className="text-[#5a3e38] font-bold uppercase tracking-wider text-[10px]">{t('Total Invoices Settled This Month', 'በዚህ ወር የተቆረጡ ጠቅላላ ደረሰኞች')}</span>
          <span className="px-3 py-1 bg-zinc-100 rounded-md font-mono font-bold text-[#2B1E1A]">{calculations.orders}</span>
        </div>
      </div>
    </div>
  )
}