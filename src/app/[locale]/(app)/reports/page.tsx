'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BarChart3, Download, TrendingUp, Calendar, ChevronRight, ArrowLeft, Clock } from 'lucide-react'
import { getDB } from '../../../../lib/offline/db'

export default function ReportsDashboardHub() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const locale = params.locale || 'am'

  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    transactionCount: 0,
    pendingSyncCount: 0,
  })

  useEffect(() => {
    async function calculateOfflineMetrics() {
      try {
        const db = await getDB()
        const historicalSales = await db.getAll('completed_sales_history')
        const pendingSales = await db.getAll('pending_sales')
        const allSales = [...historicalSales, ...pendingSales]
        
        let total = 0
        allSales.forEach((sale: any) => {
          total += (sale.total_amount || sale.amount || 0)
        })

        setMetrics({
          totalSales: total,
          transactionCount: allSales.length,
          pendingSyncCount: pendingSales.length,
        })
      } catch (err) {
        console.error("Failed to compile dashboard metrics:", err)
      } finally {
        setLoading(false)
      }
    }
    calculateOfflineMetrics()
  }, [])

  const t = (en: string, am: string) => (isAm ? am : en)

  // Quick navigation helper
 const navigateTo = (subFolder: string) => {
  // Casting as any satisfies the RouteImpl checker without modifying your tsconfig settings
  router.push(`/${locale}/reports/${subFolder}` as any);
};

  if (loading) return <div className="p-6 text-center font-bold text-[#8B2635]">...</div>

  return (
    <div className="min-h-screen bg-[#F7F4EB] p-4 font-['DM_Sans',sans-serif] pb-24">
      
      {/* Top Header Navigation */}
      <div className="max-w-md mx-auto flex items-center justify-between mb-6">
        <button 
          onClick={() => router.push(`/${locale}/sales`)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5a3e38] bg-white px-3 py-2 rounded-xl border border-[#2B1E1A]/10 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#8B2635]" />
          {t('POS Terminal', 'ሽያጭ መመለሻ')}
        </button>
        
        <h1 className="font-['Playfair_Display',serif] font-black text-xl text-[#2B1E1A]">
          {t('Reports Hub', 'የሪፖርት ማዕከል')}
        </h1>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        
        {/* Total High-Level Snapshot Card */}
        <div className="bg-[#8B2635] text-white p-5 rounded-2xl shadow-md space-y-2">
          <p className="text-[10px] font-bold tracking-wider opacity-75 uppercase">
            {t('TOTAL SYSTEM VOLUME (OFFLINE + CLOUD)', 'ጠቅላላ የተመዘገበ ሽያጭ')}
          </p>
          <h2 className="text-3xl font-black font-mono">
            {metrics.totalSales} <span className="text-sm font-sans font-normal text-white/80">ETB</span>
          </h2>
          <div className="text-xs text-white/70 pt-1 border-t border-white/10 flex justify-between">
            <span>{t('Invoices Run:', 'ጠቅላላ ደረሰኞች:')} <strong>{metrics.transactionCount}</strong></span>
            <span>{t('Unsynced:', 'ያልተላኩ:')} <strong>{metrics.pendingSyncCount}</strong></span>
          </div>
        </div>

        {/* ─── NAVIGATION LINKS TO SUB-FOLDERS ─── */}
        <div className="space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#9b7b74] px-1">
            {t('Select Analytical Breakdown', 'የሪፖርት አይነት ይምረጡ')}
          </h3>

          {/* Daily Sub-folder Route Link */}
          <button onClick={() => navigateTo('daily')} className="w-full text-left bg-white p-4 rounded-xl border border-[#2B1E1A]/10 shadow-sm flex items-center justify-between hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700">📆</div>
              <div>
                <h4 className="text-sm font-bold text-[#2B1E1A]">{t('Daily Report', 'የዕለት ሪፖርት')}</h4>
                <p className="text-[11px] text-[#9b7b74]">{t('Review individual shift timelines', 'የየዕለቱን የፈረቃ ስራዎች ይገምግሙ')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9b7b74]" />
          </button>

          {/* Weekly Sub-folder Route Link */}
          <button onClick={() => navigateTo('weekly')} className="w-full text-left bg-white p-4 rounded-xl border border-[#2B1E1A]/10 shadow-sm flex items-center justify-between hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-700">📊</div>
              <div>
                <h4 className="text-sm font-bold text-[#2B1E1A]">{t('Weekly Analytics', 'የሳምንት ትንተና')}</h4>
                <p className="text-[11px] text-[#9b7b74]">{t('Track growth and performance cycles', 'የሳምንታዊ እድገትና አፈጻጸም ዑደቶች ይከታተሉ')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9b7b74]" />
          </button>

          {/* Monthly Sub-folder Route Link */}
          <button onClick={() => navigateTo('monthly')} className="w-full text-left bg-white p-4 rounded-xl border border-[#2B1E1A]/10 shadow-sm flex items-center justify-between hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">📈</div>
              <div>
                <h4 className="text-sm font-bold text-[#2B1E1A]">{t('Monthly Summary', 'የወር ማጠቃለያ')}</h4>
                <p className="text-[11px] text-[#9b7b74]">{t('Tax, ledger balances and statements', 'የግብር፣ የሂሳብ ሚዛን እና መግለጫዎች')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9b7b74]" />
          </button>

          {/* Custom Range Sub-folder Route Link */}
          <button onClick={() => navigateTo('range')} className="w-full text-left bg-white p-4 rounded-xl border border-[#2B1E1A]/10 shadow-sm flex items-center justify-between hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 rounded-lg text-[#8B2635]">🗓️</div>
              <div>
                <h4 className="text-sm font-bold text-[#2B1E1A]">{t('Custom Date Range', 'ብጁ የቀን ክልል')}</h4>
                <p className="text-[11px] text-[#9b7b74]">{t('Audit specific historical boundaries', 'የተወሰኑ የታሪክ ወቅቶችን መርጠው ይመርምሩ')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9b7b74]" />
          </button>
        </div>

      </div>
    </div>
  )
}