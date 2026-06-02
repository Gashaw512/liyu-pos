'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, BarChart2 } from 'lucide-react'
import { getDB } from '../../../../../lib/offline/db'

export default function WeeklyReportPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const locale = params.locale || 'am'

  const [loading, setLoading] = useState(true)
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const [daysData, setDaysData] = useState<{name: string, total: number}[]>([])

  useEffect(() => {
    async function loadWeeklyData() {
      try {
        const db = await getDB()
        const history = await db.getAll('completed_sales_history')
        const pending = await db.getAll('pending_sales')
        const allSales = [...history, ...pending]

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        let sum = 0
        const weekdayMap: { [key: string]: number } = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }

        allSales.forEach((sale: any) => {
          const saleDate = new Date(sale.createdAt)
          if (saleDate >= sevenDaysAgo) {
            const amt = sale.total_amount || sale.amount || 0
            sum += amt
            const dayKey = saleDate.toDateString().split(' ')[0] // e.g. "Mon"
            if (weekdayMap[dayKey] !== undefined) weekdayMap[dayKey] += amt
          }
        })

        const formattedDays = Object.keys(weekdayMap).map(key => ({
          name: key,
          total: weekdayMap[key]
        }))

        setWeeklyTotal(sum)
        setDaysData(formattedDays)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadWeeklyData()
  }, [])

  const t = (en: string, am: string) => (isAm ? am : en)
  const maxDayValue = Math.max(...daysData.map(d => d.total), 1)

  if (loading) return <div className="p-6 text-center font-bold text-[#8B2635]">...</div>

  return (
    <div className="min-h-screen bg-[#F7F4EB] p-4 font-['DM_Sans',sans-serif] pb-24">
      <div className="max-w-md mx-auto flex items-center justify-between mb-5">
        <button onClick={() => router.push(`/${locale}/reports` as any)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5a3e38] bg-white px-3 py-2 rounded-xl border border-[#2B1E1A]/10 shadow-sm">
          <ArrowLeft className="w-3.5 h-3.5 text-[#8B2635]" />
          {t('Back', 'ተመለስ')}
        </button>
        <h1 className="font-['Playfair_Display',serif] font-black text-lg text-[#2B1E1A]">{t('Weekly Analytics', 'የሳምንት ትንተና')}</h1>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Rolling 7 Day Banner Block */}
        <div className="bg-[#8B2635] text-white p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase opacity-75 tracking-wider">{t('7-Day Rolling Volume', 'የ7 ቀናት ጠቅላላ ሽያጭ')}</span>
            <p className="text-2xl font-black font-mono">{weeklyTotal} ETB</p>
          </div>
          <CalendarDays className="w-8 h-8 text-[#E2A03F] opacity-90" />
        </div>

        {/* Lightweight Visual Bar Graph Container */}
        <div className="bg-white p-4 rounded-xl border border-[#2B1E1A]/10 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-[#2B1E1A] flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-[#8B2635]" /> {t('Revenue Scaling Map', 'የገቢ ማነፃፀሪያ ገበታ')}</h3>
          <div className="space-y-3 pt-1">
            {daysData.map((day) => {
              const percentage = (day.total / maxDayValue) * 100
              return (
                <div key={day.name} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-[#5a3e38]">{t(day.name, day.name === 'Sun' ? 'እሁድ' : day.name === 'Mon' ? 'ሰኞ' : day.name === 'Tue' ? 'ማክሰ' : day.name === 'Wed' ? 'ረቡዕ' : day.name === 'Thu' ? 'ሐሙስ' : day.name === 'Fri' ? 'አርብ' : 'ቅዳሜ')}</span>
                  <div className="flex-1 h-5 bg-[#F7F4EB] rounded-md overflow-hidden relative border border-[#2B1E1A]/5">
                    <div className="h-full bg-[#E2A03F] transition-all duration-500 rounded-r" style={{ width: `${Math.max(percentage, 2)}%` }} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-[#2B1E1A]">{day.total} ETB</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}