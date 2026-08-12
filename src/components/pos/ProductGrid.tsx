// src/components/pos/ProductGrid.tsx
'use client'

import { Plus, Minus, ShoppingBag } from 'lucide-react'
import { CartItem } from '../../types/pos'

interface LocalProduct {
  id: string
  name: string
  retail_price: number
  category?: string
}

interface ProductGridProps {
  products: LocalProduct[]
  cart: CartItem[]
  isAm: boolean
  onAddToCart: (product: LocalProduct) => void
  onUpdateQuantity: (productId: string, amount: number) => void
}

export default function ProductGrid({
  products,
  cart,
  isAm,
  onAddToCart,
  onUpdateQuantity
}: ProductGridProps) {
  
  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6">
        <span className="text-3xl block mb-2">📦</span>
        <p className="text-xs font-bold text-slate-400">
          {isAm ? 'በዚህ ምድብ ምንም ምግብ ወይም መጠጥ አልተገኘም' : 'No items found in this section.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {products.map((product) => {
        // Find if this item is already loaded in the cart tracking array
        const cartItem = cart.find((item) => item.productId === product.id)
        const hasQty = cartItem ? cartItem.quantity : 0

        return (
          <div
            key={product.id}
            className={`rounded-2xl border-2 p-3 h-28 flex flex-col justify-between transition-all relative overflow-hidden bg-white select-none shadow-sm ${
              hasQty > 0 
                ? 'border-emerald-600 ring-2 ring-emerald-600/10 bg-emerald-50/20' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Upper half: Item Name */}
            <div className="pr-1">
              <span className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight">
                {product.name}
              </span>
            </div>

            {/* Lower half: Smart Contextual Action Area */}
            {hasQty === 0 ? (
              // Initial state: Big friendly tap targets for simple load mechanics
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="w-full flex items-center justify-between pt-1 text-left cursor-pointer group"
              >
                <span className="font-mono text-slate-950 font-black text-xs">
                  {product.retail_price.toLocaleString()} ETB
                </span>
                <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </button>
            ) : (
              // Active quantity modifier state: Turns card bottom into an oversized click interface
              <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl p-1 -mx-1 -mb-1 mt-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-emerald-700/50 hover:bg-emerald-700 text-white rounded-lg active:scale-90 transition-transform"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                
                <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
                  <span className="font-mono font-black text-sm leading-none">{hasQty}</span>
                  <span className="text-[8px] opacity-70 font-bold uppercase tracking-tighter">Qty</span>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, 1)}
                  className="w-7 h-7 flex items-center justify-center bg-emerald-700/50 hover:bg-emerald-700 text-white rounded-lg active:scale-90 transition-transform"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}