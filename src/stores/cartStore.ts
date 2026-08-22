import { create } from 'zustand'
// ⚠️ Fixed: Pointing directly to your precise domain type files
import type { Product } from '@/types/database/catalog'
import type { PaymentMethod } from '@/types/models/pos-cart'

/**
 * 🛒 FRONTEND ACTIVE CART LINE ITEM INTERFACE
 * Explicitly structures the item to encapsulate the master Product object 
 * and its transactional quantity parameters exactly as your logic expects.
 */
export interface CartItem {
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
  paymentMethod: PaymentMethod
  note: string
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setPaymentMethod: (method: PaymentMethod) => void
  clearCart: () => void
  subtotal: () => number
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  paymentMethod: 'cash',
  note: '',
  
  addItem: (product) => {
    if (!product || !product.id) return
    const { items } = get()
    const existing = items.find(i => i.product?.id === product.id)
    
    if (existing) {
      set({ 
        items: items.map(i =>
          i.product?.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      })
    } else {
      set({ items: [...items, { product, quantity: 1 }] })
    }
  },
  
  removeItem: (productId) => {
    if (!productId) return
    set({ items: get().items.filter(i => i.product?.id !== productId) })
  },
  
  updateQty: (productId, qty) => {
    if (!productId) return
    if (qty <= 0) { 
      get().removeItem(productId)
      return 
    }
    set({ 
      items: get().items.map(i =>
        i.product?.id === productId ? { ...i, quantity: Math.floor(qty) } : i
      )
    })
  },
  
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  
  clearCart: () => set({ items: [], note: '' }),
  
  /**
   * 🔢 High-Utility Numerical Accumulators
   * Wrapped inside Number() and fallback logic to protect against undefined database pricing rows.
   */
  subtotal: () => get().items.reduce(
    (sum, i) => sum + (Number(i.product?.retail_price ?? 0) * i.quantity), 0
  ),
  
  total: () => get().subtotal(),
  
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
