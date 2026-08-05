'use client'

import { useState } from 'react'
import { BarChart3, ChevronDown, ChevronUp, Layers, TrendingUp, DollarSign } from 'lucide-react'
import type { InventoryProduct } from '@/types/inventory'

interface ValuationProps {
  products: InventoryProduct[]
  liveStockMap: Record<string, { systemCount: number }>
  isAm: boolean
}

export default function InventoryValuation({ products, liveStockMap, isAm }: ValuationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const t = (en: string, am: string) => (isAm ? am : en)

  // Calculate executive inventory totals dynamically
  const metrics = products.reduce(
    (acc, product) => {
      const currentStock = Math.max(0, liveStockMap[product.id]?.systemCount ?? product.opening_count)
      const cost = product.cost_price || product.retail_price * 0.7 // Fallback if cost missing
      const retail = product.retail_price

      acc.totalCostValue += currentStock * cost
      acc.totalRetailValue += currentStock * retail
      
      // Group allocations under categories
      const catName = isAm && product.category_name_am ? product.category_name_am : product.category_name
      if (!acc.categories[catName]) {
        acc.categories[catName] = { count: 0, costVal: 0, retailVal: 0 }
      }
      acc.categories[catName].count += currentStock
      acc.categories[catName].costVal += currentStock * cost
      acc.categories[catName].retailVal += currentStock * retail

      return acc
    },
    { totalCostValue: 0, totalRetailValue: 0, categories: {} as Record<string, { count: number; costVal: number; retailVal: number }> }
  )

  const potentialProfit = metrics.totalRetailValue - metrics.totalCostValue

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Clickable Header Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-slate-900 text-white select-none"
      >
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <div className="text-left">
            <h2 className="text-sm font-black tracking-tight">{t('Inventory Valuation Ledger', 'የክምችት ሃብት ግምት ማጠቃለያ')}</h2>
            <p className="text-[10px] text-slate-400 font-medium">{t('Tap to expand asset valuation breakdowns', 'የንብረት ዋጋ ዝርዝር ለማየት ይህንን ይጫኑ')}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 bg-white animate-in fade-in duration-200">
          {/* Executive Value Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('Asset Value (Cost)', 'ጠቅላላ መግዣ ዋጋ')}</span>
              <div className="text-base font-black text-slate-800 font-mono mt-0.5">{metrics.totalCostValue.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500">ETB</span></div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('Retail Value (Selling)', 'ጠቅላላ መሸጫ ዋጋ')}</span>
              <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{metrics.totalRetailValue.toLocaleString()} <span className="text-[10px] font-sans font-normal text-emerald-600">ETB</span></div>
            </div>
          </div>

          {/* Potential Yield Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>{t('Expected Margin on Stock', 'ሊገኝ የሚችል ጠቅላላ ትርፍ')}</span>
            </div>
            <span className="text-xs font-mono font-black text-amber-700">+{potentialProfit.toLocaleString()} ETB</span>
          </div>

          {/* Categorized Progress Breakdown Matrix */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3" /> {t('Valuation by Category', 'የክምችት ስርጭት በምድብ')}
            </h3>
            
            <div className="space-y-2.5">
              {Object.entries(metrics.categories).map(([catName, data]) => {
                const percentage = metrics.totalRetailValue > 0 ? (data.retailVal / metrics.totalRetailValue) * 100 : 0
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[50%]">{catName} <span className="font-mono text-[10px] text-slate-400 font-normal">({data.count})</span></span>
                      <div className="font-mono text-[11px] text-slate-900 flex gap-2">
                        <span className="text-slate-400 font-normal">{data.costVal.toLocaleString()} c</span>
                        <span className="text-emerald-700 font-black">{data.retailVal.toLocaleString()} r</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}