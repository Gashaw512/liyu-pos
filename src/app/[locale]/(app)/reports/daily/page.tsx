// src/app/[locale]/report/daily/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Calendar, TrendingUp, Wallet, ShieldAlert, 
  User, CheckCircle, AlertTriangle, Eye, ListFilter, Share2 , Loader2
} from 'lucide-react'
import { getDB } from '../../../../../lib/offline/db'

interface MissingProduct {
  id: string
  name: string
  stock_left: number
  threshold: number
}

interface FinancialSummary {
  subtotalSales: number    // Taxable product revenue
  totalTips: number        // Manual tips collected for waiter payouts
  grandTotal: number       // Subtotal + Tips (Total money passing to owner)
  cashVolume: number
  telebirrVolume: number
  bankVolume: number
}

interface LocalCategoryBreakdown {
  name: string
  itemsSold: number
  revenue: number
}

export default function DailyReportPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const locale = params.locale || 'am'

  // Report View Toggle: 'overview' vs 'detailed'
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  const [loading, setLoading] = useState(true)

  // System States mapped logically
  const [activeShift, setActiveShift] = useState<any>(null)
  const [financials, setFinancials] = useState<FinancialSummary>({
    subtotalSales: 0,
    totalTips: 0,
    grandTotal: 0,
    cashVolume: 0,
    telebirrVolume: 0,
    bankVolume: 0,
  })
  const [categoryBreakdown, setCategoryBreakdown] = useState<LocalCategoryBreakdown[]>([])
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([])
  const [salesCount, setSalesCount] = useState(0)

  // Amharic Translator utility
  const t = (en: string, am: string) => (isAm ? am : en)

  useEffect(() => {
    async function compileDailyReport() {
      try {
        const db = await getDB()

        // 1. Fetch Shift context layout status
        const currentShift = await db.get('active_shift', 'current')
        setActiveShift(currentShift || null)

        // 2. Load supporting structures for Category mappings
        const [cachedProducts, cachedCategories] = await Promise.all([
          db.getAll('products'),
          db.getAll('categories')
        ])

        const catMap: Record<string, string> = {}
        cachedCategories?.forEach(c => {
          catMap[c.id] = c.name
        })

        // 3. Aggregate Transactions for the Current Day
        const history = await db.getAll('completed_sales_history')
        const pending = await db.getAll('pending_sales')
        const allDailySales = [...history, ...pending]

        let subtotalAccumulator = 0
        let tipAccumulator = 0
        let cashAccumulator = 0
        let telebirrAccumulator = 0
        let bankAccumulator = 0

        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const targetedSales = allDailySales.filter((sale: any) => {
          const targetDate = new Date(sale.createdAt || sale.created_at)
          return targetDate >= startOfToday
        })

        // Temporary map container to aggregate totals by normalized category names
        const breakdownMap: Record<string, { itemsSold: number; revenue: number }> = {}

        targetedSales.forEach((sale: any) => {
          const saleSubtotal = sale.subtotal || sale.total_amount || 0
          const saleTip = sale.tip_amount || 0

          subtotalAccumulator += saleSubtotal
          tipAccumulator += saleTip

          // Track items for category breakdowns
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach((item: any) => {
              const rawCatName = catMap[item.category_id] || 'General'
              
              // Normalize names to match your unified SQL database view layout buckets
              let normalizedName = rawCatName
              if (['Beer', 'ቢራ'].includes(rawCatName)) normalizedName = 'Beer / ቢራ'
              if (['Water', 'ውሃ'].includes(rawCatName)) normalizedName = 'Water / ውሃ'
              if (['Food', 'ምግብ'].includes(rawCatName)) normalizedName = 'Food / ምግብ'
              if (['Soft Drinks', 'ለስላሳ መጠጦች'].includes(rawCatName)) normalizedName = 'Soft Drinks / ለስላሳ'

              if (!breakdownMap[normalizedName]) {
                breakdownMap[normalizedName] = { itemsSold: 0, revenue: 0 }
              }

              const qty = Number(item.quantity || 0)
              const price = Number(item.unit_price || item.price || 0)
              
              breakdownMap[normalizedName].itemsSold += qty
              breakdownMap[normalizedName].revenue += qty * price
            })
          }

          // Drill-down logic safely parsing payments structure array
          if (sale.payments && Array.isArray(sale.payments)) {
            sale.payments.forEach((p: any) => {
              const method = String(p.method).toLowerCase()
              const amt = parseFloat(p.amount) || 0
              if (method === 'cash') cashAccumulator += amt
              else if (method === 'telebirr') telebirrAccumulator += amt
              else bankAccumulator += amt
            })
          } else {
            const fallbackAmt = sale.total_amount || 0
            if (sale.payment_method === 'cash') cashAccumulator += fallbackAmt
            else if (sale.payment_method === 'telebirr') telebirrAccumulator += fallbackAmt
            else bankAccumulator += fallbackAmt
          }
        })

        // Convert the structural hashmap back into a renderable array
        const formattedBreakdown = Object.entries(breakdownMap).map(([name, data]) => ({
          name,
          itemsSold: data.itemsSold,
          revenue: data.revenue
        }))

        setCategoryBreakdown(formattedBreakdown)

        setFinancials({
          subtotalSales: subtotalAccumulator,
          totalTips: tipAccumulator,
          grandTotal: subtotalAccumulator + tipAccumulator,
          cashVolume: cashAccumulator,
          telebirrVolume: telebirrAccumulator,
          bankVolume: bankAccumulator
        })
        setSalesCount(targetedSales.length)

        // 4. Scan Inventory for Missing/Low-Stock Exceptions
        if (cachedProducts) {
          const lowStockAlerts = cachedProducts
            .filter((p: any) => (p.stock_quantity !== undefined ? p.stock_quantity : p.quantity || 0) <= 5)
            .map((p: any) => ({
              id: String(p.id),
              name: p.name,
              stock_left: p.stock_quantity !== undefined ? p.stock_quantity : p.quantity || 0,
              threshold: 5
            }))
          setMissingProducts(lowStockAlerts.slice(0, 4))
        }
      } catch (err) {
        console.error('Error generating daily analytics reporting structures:', err)
      } finally {
        setLoading(false)
      }
    }
    compileDailyReport()
  }, [])

  const theoreticalRevenue = financials.subtotalSales
  const shiftDiscrepancy = activeShift?.actual_cash !== null && activeShift?.actual_cash !== undefined
    ? activeShift.actual_cash - (activeShift.opening_cash + financials.cashVolume)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EB] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-[#8B2635] animate-spin mb-2" />
        <span className="text-xs font-bold text-[#5a3e38] tracking-wider animate-pulse">{t('Compiling Daily Ledger...', 'ዕለታዊ ሪፖርት በመሰብሰብ ላይ...')}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] p-4 font-['DM_Sans',sans-serif] pb-28 select-none">
      
      {/* Upper Navigation Action Context Grid */}
      <div className="max-w-md mx-auto flex items-center justify-between mb-5">
        <button onClick={() => router.push(`/${locale}/reports`)}
          className="flex items-center gap-1.5 text-xs font-black text-[#5a3e38] bg-white px-3 py-2 rounded-xl border border-[#2B1E1A]/10 shadow-sm active:scale-95 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 text-[#8B2635]" />
          {t('Back', 'ተመለስ')}
        </button>
        <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#2B1E1A]/10 shadow-sm">
          <button 
            onClick={() => setViewMode('overview')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 ${viewMode === 'overview' ? 'bg-[#8B2635] text-white' : 'text-[#5a3e38]'}`}>
            <TrendingUp className="w-3 h-3" /> {t('Overview', 'አጠቃላይ')}
          </button>
          <button 
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 ${viewMode === 'detailed' ? 'bg-[#8B2635] text-white' : 'text-[#5a3e38]'}`}>
            <Eye className="w-3 h-3" /> {t('Detailed', 'ዝርዝር')}
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">

        {/* Master Identity Dashboard Block */}
        <div className="bg-white rounded-2xl border border-[#2B1E1A]/10 shadow-sm p-4 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E2A03F]/5 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Calendar className="w-3 h-3 text-[#E2A03F]" /> {t('Daily Flash Briefing', 'የዛሬ ዕለታዊ ሪፖርት')}</span>
              <h2 className="font-['Playfair_Display',serif] font-black text-xl text-[#2B1E1A]">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 uppercase tracking-tight ${activeShift ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-300/60'}`}>
              <CheckCircle className="w-3 h-3" /> {activeShift ? t('Active Shift', 'ክፍት ፈረቃ') : t('Closed / Finalized', 'ተዘግቷል')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-[#5a3e38]">
            <div className="flex items-center gap-1.5 bg-[#F7F4EB]/60 p-2 rounded-xl">
              <User className="w-3.5 h-3.5 text-[#8B2635]" />
              <div>
                <span className="text-[9px] block text-slate-400 font-bold uppercase">{t('Cashier Assigned', 'ተረኛ ገንዘብ ያዥ')}</span>
                <span className="font-bold text-[#2B1E1A]">{activeShift?.opened_by || 'Main_Staff'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F7F4EB]/60 p-2 rounded-xl">
              <ListFilter className="w-3.5 h-3.5 text-[#8B2635]" />
              <div>
                <span className="text-[9px] block text-slate-400 font-bold uppercase">{t('Ticket Count', 'የተቆረጠ ደረሰኝ')}</span>
                <span className="font-mono font-black text-[#2B1E1A]">{salesCount} Orders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Executive Volume Banner Card */}
        <div className="bg-[#8B2635] text-white p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute -bottom-4 -right-4 text-white/5 font-black text-7xl select-none">ETB</div>
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase opacity-75 tracking-wider">{t('Gross Food & Drink Revenue', 'የምግብና መጠጥ ሽያጭ ገቢ (Subtotal)')}</span>
              <p className="text-3xl font-black font-mono tracking-tight text-[#E2A03F]">{financials.subtotalSales} <span className="text-xs font-bold text-white">ETB</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
            <div>
              <span className="text-[9px] block text-white/60 font-medium uppercase">{t('Manual Tips for Waiters', 'ማታ ለአስተናጋጆች የሚከፈል ጉርሻ')}</span>
              <span className="font-mono font-bold text-white text-sm">+{financials.totalTips} ETB</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] block text-white/60 font-medium uppercase">{t('Combined Fund Transferred', 'ጠቅላላ ባለቤቱ የተቀበለው (Grand)')}</span>
              <span className="font-mono font-black text-amber-300 text-sm">{financials.grandTotal} ETB</span>
            </div>
          </div>
        </div>

        {/* Dynamic Mode Content Switching Container */}
        {viewMode === 'overview' ? (
          <>
            {/* Dynamic Category Volume Distribution Summary List */}
            <div className="bg-white p-4 rounded-2xl border border-[#2B1E1A]/10 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-[#2B1E1A] uppercase tracking-wider">
                📊 {t('Sales by Category', 'ሽያጭ በምድብ')}
              </h3>
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2 bg-slate-50 rounded-xl font-medium">{t('No item lines recorded today.', 'ዛሬ የተሸጠ ምንም እቃ የለም።')}</p>
              ) : (
                <div className="space-y-2">
                  {categoryBreakdown.map((row) => (
                    <div key={row.name} className="flex justify-between items-center text-xs p-2 bg-[#F7F4EB]/40 rounded-xl border border-slate-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#2B1E1A]">{row.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{row.itemsSold} {t('items sold', 'እቃዎች ተሽጠዋል')}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-700">{row.revenue} ETB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Channel Volumes Grid Layout */}
            <div className="bg-white p-4 rounded-2xl border border-[#2B1E1A]/10 shadow-sm space-y-3.5">
              <h3 className="text-xs font-black text-[#2B1E1A] uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#8B2635]" /> {t('Payment Channel Audits', 'የክፍያ አማራጮች ዝርዝር')}
              </h3>

              <div className="space-y-2.5">
                {/* Cash Allocation Line item */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#5a3e38]">
                    <span>💵 {t('Physical Cash Drawer', 'በካሽ መሳቢያ ውስጥ የገባ')}</span>
                    <span className="font-mono text-[#2B1E1A]">{financials.cashVolume} ETB</span>
                  </div>
                  <div className="w-full h-2 bg-[#F7F4EB] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${financials.grandTotal > 0 ? (financials.cashVolume / financials.grandTotal) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Telebirr Channel Allocation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#5a3e38]">
                    <span>📱 {t('Telebirr Digital Wallet', 'ቴሌቢር የገባ')}</span>
                    <span className="font-mono text-[#2B1E1A]">{financials.telebirrVolume} ETB</span>
                  </div>
                  <div className="w-full h-2 bg-[#F7F4EB] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${financials.grandTotal > 0 ? (financials.telebirrVolume / financials.grandTotal) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Bank Transfers Layout channel tracking item */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#5a3e38]">
                    <span>🏦 {t('Bank Transfers (CBE/Wegagen)', 'በባንክ ሒሳብ የተላከ')}</span>
                    <span className="font-mono text-[#2B1E1A]">{financials.bankVolume} ETB</span>
                  </div>
                  <div className="w-full h-2 bg-[#F7F4EB] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${financials.grandTotal > 0 ? (financials.bankVolume / financials.grandTotal) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Low Stock Missing Exception UI Panel */}
            <div className="bg-white p-4 rounded-2xl border border-[#2B1E1A]/10 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-[#2B1E1A] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#8B2635]" /> {t('Stock Exception Alerts', 'ያለቁ ወይም አነስተኛ ምርቶች')}
                </h3>
                {missingProducts.length > 0 && <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 font-bold rounded-md border border-rose-200">{missingProducts.length} {t('Critical', 'ሊያልቁ የቀሩ')}</span>}
              </div>

              {missingProducts.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 py-2 text-center bg-slate-50 rounded-xl">{t('All inventory items healthy.', 'ሁሉም ምርቶች በበቂ ሁኔታ አሉ።')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {missingProducts.map((p) => (
                    <div key={p.id} className="p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl flex flex-col justify-between space-y-1">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black text-rose-600 bg-rose-100/50 px-1.5 py-0.5 rounded-md">{p.stock_left} {t('Left', 'የቀረው')}</span>
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Detailed Audit Drill-down Mode Panel Layout */
          <div className="bg-white p-4 rounded-2xl border border-[#2B1E1A]/10 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-[#2B1E1A] uppercase tracking-wider">{t('Cashier Loss Audit Trail', 'የሂሳብ ማመዛዘኛ ዝርዝር')}</h3>
            
            <div className="space-y-2 divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-2 text-[#5a3e38]">
                <span>{t('Opening Cash Float Registered', 'የመጀመሪያ መነሻ ካሽ')}</span>
                <span className="font-mono font-bold text-[#2B1E1A]">{activeShift?.opening_cash || 0} ETB</span>
              </div>
              <div className="flex justify-between py-2 text-[#5a3e38]">
                <span>{t('Expected Product Net Revenue', 'የምርት ጥቅል ሽያጭ ገቢ')}</span>
                <span className="font-mono font-bold text-[#2B1E1A]">{theoreticalRevenue} ETB</span>
              </div>
              <div className="flex justify-between py-2 text-[#5a3e38]">
                <span>{t('Expected Cash Drawer Total', 'በመሳቢያ ውስጥ ሊኖር የሚገባ ካሽ')}</span>
                <span className="font-mono font-bold text-[#2B1E1A]">{(activeShift?.opening_cash || 0) + financials.cashVolume} ETB</span>
              </div>
              <div className="flex justify-between py-2 items-center text-[#5a3e38]">
                <span>{t('Shift Discrepancy Status', 'የሂሳብ ጉድለት/ትርፍ ማረጋገጫ')}</span>
                {shiftDiscrepancy === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{t('Balanced', 'ትክክል ነው')}</span>
                ) : (
                  <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{shiftDiscrepancy} ETB</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Remote Sharing Dispatch Trigger Panel Box */}
        <div className="bg-[#E2A03F]/10 border border-[#E2A03F]/30 p-3.5 rounded-2xl flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-[#2B1E1A]">{t('Dispatch Report via Messenger', 'ሪፖርቱን ለባለቤቱ ይላኩ')}</h4>
            <p className="text-[10px] text-[#5a3e38] font-medium leading-tight">{t('Forward summary to Telegram or WhatsApp instantly.', 'የዛሬውን አጠቃላይ መረጃ በቀጥታ በቴሌግራም ወይም በዋትስአፕ ያጋሩ።')}</p>
          </div>
          <button 
            type="button"
            onClick={() => {
              // Composes clean executive string layout for sharing copy workflows
              const summaryText = `📊 DAILY BREAKDOWN REPORT\nDate: ${new Date().toLocaleDateString()}\n--------------------\n• Net Sales Revenue: ${financials.subtotalSales} ETB\n• Waiter Tips Added: ${financials.totalTips} ETB\n• Grand Received: ${financials.grandTotal} ETB\n--------------------\n• Cash Drawer: ${financials.cashVolume} ETB\n• Telebirr Wallet: ${financials.telebirrVolume} ETB\n• Bank Transfer: ${financials.bankVolume} ETB\n--------------------\nShift Status: ${activeShift ? 'Open/Active' : 'Closed'}`
              
              if (navigator.share) {
                navigator.share({ title: 'Daily Shift Summary', text: summaryText })
              } else {
                navigator.clipboard.writeText(summaryText)
                alert(t('Report summary text copied to clipboard!', 'የሪፖርቱ ማጠቃለያ ኮፒ ተደርጓል!'))
              }
            }}
            className="h-10 px-3 bg-[#2B1E1A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0 shadow-sm active:scale-95">
            <Share2 className="w-3.5 h-3.5 text-[#E2A03F]" />
            <span>{t('Dispatch', 'ላክ')}</span>
          </button>
        </div>

      </div>
    </div>
  )
}