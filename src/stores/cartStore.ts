import { create } from 'zustand'
import type { Product, CartItem, PaymentMethod } from '@/types'

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
    const { items } = get()
    const existing = items.find(i => i.product.id === product.id)
    if (existing) {
      set({ items: items.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )})
    } else {
      set({ items: [...items, { product, quantity: 1 }] })
    }
  },
  removeItem: (productId) =>
    set({ items: get().items.filter(i => i.product.id !== productId) }),
  updateQty: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return }
    set({ items: get().items.map(i =>
      i.product.id === productId ? { ...i, quantity: qty } : i
    )})
  },
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  clearCart: () => set({ items: [], note: '' }),
  subtotal: () => get().items.reduce(
    (sum, i) => sum + i.product.retail_price * i.quantity, 0
  ),
  total: () => get().subtotal(),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))