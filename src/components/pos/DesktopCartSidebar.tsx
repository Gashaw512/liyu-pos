// src/components/pos/DesktopCartSidebar.tsx
'use client'

import { ShoppingCart, Minus, Plus, Loader2, Receipt, FolderHeart } from 'lucide-react'
import { CartItem } from '../../types/pos'

interface DesktopCartSidebarProps {
  cart: CartItem[]
  totalBill: number
  isAm: boolean
  selectedTable: any
  savingTab: boolean
  showPayment: boolean
  onUpdateQuantity: (productId: string, amount: number) => void
  onSaveTab: () => void
  onOpenCheckout: () => void
}

export default function DesktopCartSidebar({
  cart,
  totalBill,
  isAm,
  selectedTable,
  savingTab,
  showPayment,
  onUpdateQuantity,
  onSaveTab,
  onOpenCheckout
}: DesktopCartSidebarProps) {
  return (
    <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 bg-white border-2 border-slate-200 rounded-3xl p-4 sticky top-4 h-[calc(100vh-2rem)] flex-col justify-between shadow-md">
      <div className="flex flex-col flex-grow overflow-hidden">
        {/* Header Section */}
        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-100 flex-shrink-0">
          <h2 className="font-black text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-slate-400" />
            <span>{isAm ? 'የአሁኑ ማዘዣ' : 'Current Basket'}</span>
          </h2>
          {cart.length > 0 && (
            <span className="bg-slate-100 text-slate-800 font-mono font-black text-xs px-2 py-0.5 rounded-lg">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          )}
        </div>

        {/* Scrollable Cart Content List */}
        <div className="flex-grow overflow-y-auto subtle-scrollbar py-2 pr-1 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-24 text-slate-400 text-xs flex flex-col justify-center items-center gap-2">
              <span className="text-4xl animate-bounce">🍽️</span>
              <p className="max-w-[180px] font-bold text-slate-400/80">
                {isAm ? 'ትዕዛዝ ለመጀመር ከምግቦቹ ማውጫ ላይ ይምረጡ' : 'Cart is empty. Tap menu items to load.'}
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-xs p-2 bg-slate-50 border border-slate-100 rounded-xl gap-2">
                <div className="w-1/2 min-w-0">
                  <span className="font-extrabold text-slate-900 block truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{item.unitPrice.toLocaleString()} ETB</span>
                </div>
                <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5 shadow-sm flex-shrink-0">
                  <button type="button" onClick={() => onUpdateQuantity(item.productId, -1)} className="w-6 h-6 flex items-center justify-center text-slate-600 rounded-lg font-bold"><Minus className="w-3 h-3" /></button>
                  <span className="font-mono font-black w-6 text-center text-slate-800 text-xs">{item.quantity}</span>
                  <button type="button" onClick={() => onUpdateQuantity(item.productId, 1)} className="w-6 h-6 flex items-center justify-center text-slate-600 rounded-lg font-bold"><Plus className="w-3 h-3" /></button>
                </div>
                <span className="font-mono font-black text-slate-900 w-20 text-right flex-shrink-0">{item.total.toLocaleString()} ETB</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Persistent locked bottom totals section */}
      <div className="pt-3 border-t-2 border-slate-100 space-y-3 flex-shrink-0 bg-white">
        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <span className="text-xs font-black text-slate-400 uppercase">{isAm ? 'ድምር ሂሳብ' : 'Total Amount'}</span>
          <span className="font-mono font-black text-2xl text-emerald-600">{totalBill.toLocaleString()} ETB</span>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            disabled={!selectedTable || cart.length === 0 || savingTab}
            onClick={onSaveTab}
            className="col-span-2 h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
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
            disabled={cart.length === 0 || showPayment}
            className="col-span-3 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-0.5 shadow-md shadow-emerald-600/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Receipt className="w-4 h-4" />
            <span>{isAm ? 'ክፍያ ፈጽም' : 'Collect Bill'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}