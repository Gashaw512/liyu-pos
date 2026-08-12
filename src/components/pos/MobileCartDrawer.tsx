// src/components/pos/MobileCartDrawer.tsx
'use client'

import { ShoppingCart, Receipt, Loader2, FolderHeart } from 'lucide-react'
import { CartItem } from '../../types/pos'

interface MobileCartDrawerProps {
  cart: CartItem[]
  totalBill: number
  isAm: boolean
  selectedTable: any
  savingTab: boolean
  showPayment: boolean
  onOpenCheckout: () => void
  onSaveTab: () => void
}

export default function MobileCartDrawer({
  cart,
  totalBill,
  isAm,
  selectedTable,
  savingTab,
  showPayment,
  onOpenCheckout,
  onSaveTab
}: MobileCartDrawerProps) {
  if (cart.length === 0 || showPayment) return null

  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t-4 border-slate-200 shadow-[0_-12px_30px_-5px_rgba(0,0,0,0.25)] rounded-t-[2.5rem] p-4 pb-safe">
      {/* Visual drag handle bar */}
      <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
      
      <div className="flex justify-between items-center mb-3.5 px-1">
        <div className="flex items-center gap-1.5 text-slate-500 font-black text-xs uppercase tracking-wider">
          <ShoppingCart className="w-4 h-4 text-slate-400" />
          <span>{isAm ? 'የተመረጡ' : 'Basket'}</span>
          <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-md ml-1">
            {itemsCount}
          </span>
        </div>
        <div>
          <span className="font-mono font-black text-xl text-emerald-600">
            {totalBill.toLocaleString()} <span className="text-xs font-bold">ETB</span>
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-2.5">
        <button
          type="button"
          disabled={!selectedTable || savingTab}
          onClick={onSaveTab}
          className="col-span-2 h-14 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 border border-slate-200 text-slate-700 font-black text-xs rounded-2xl active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
        >
          {savingTab ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <FolderHeart className="w-4 h-4 text-slate-500" />
              <span>{isAm ? 'ትዕዛዝ ያዝ' : 'Hold Table'}</span>
            </>
          )}
        </button>
        
        <button
          type="button"
          onClick={onOpenCheckout}
          className="col-span-3 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
        >
          <Receipt className="w-5 h-5 stroke-[2.5]" />
          <span className="text-sm">{isAm ? 'ክፍያ ፈጽም' : 'Collect Bill'}</span>
        </button>
      </div>
    </div>
  )
}