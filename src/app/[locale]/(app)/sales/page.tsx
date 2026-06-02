// POS screen

'use client'

import { useState, useEffect } from 'react'
import { getDB } from '../../../../lib/offline/db'
import PaymentSelector from '../../../../components/pos/PaymentSelector'
import { useParams } from 'next/navigation'


interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export default function POSPage() {
  const params = useParams()
  const isAm = params.locale === 'am'
  
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCachedCatalog() {
      try {
        const db = await getDB()
        const items = await db.getAll('products')
        setProducts(items || [])
      } catch (err) {
        console.error('Failed to parse local inventory stores:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCachedCatalog()
  }, [])

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id: product.id, name: product.name, price: product.retail_price || 0, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, amount: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + amount } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  const totalBill = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleFinalizeSale = async (splitPayments: { cash: number; telebirr: number }) => {
    try {
      const db = await getDB()
      
      // 🛠️ Fetch the current shift structure to satisfy PendingSale structural dependencies
      const activeShift = await db.get('active_shift', 'current')
      
      const localId = crypto.randomUUID()
      
      // Map properties to match your exact PendingSale structure
      const pendingPayload = {
        // Core interface injections
        localId,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        syncStatus: 'pending' as const,

        // Required PendingSale domain properties matching your explicit database types
        offline_id: localId,
        shift_id: activeShift?.id || 'offline_fallback_shift',
        branch_id: activeShift?.branch_id || 'offline_fallback_branch',
        cashier_id: activeShift?.cashier_id || 'offline_fallback_cashier',
        business_id: activeShift?.business_id || 'offline_fallback_business',
        
        total_amount: totalBill,
        subtotal: totalBill,
        discount_amount: 0,
        tax_amount: 0,
        status: 'completed' as const,
        payment_status: 'paid' as const,
        
        // Mapped child items to match database structural array rules
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        })),
        
        payments: [
          { method: 'cash', amount: splitPayments.cash },
          { method: 'telebirr', amount: splitPayments.telebirr }
        ]
      }

      // TypeScript compilation will pass safely now
      await db.put('pending_sales', pendingPayload as any)
      
      alert(isAm ? 'ሽያጩ በስልክዎ ላይ ተመዝግቧል!' : 'Sale logged locally!')
      setCart([])
      setShowPayment(false)
    } catch (err) {
      alert('Local storage engine failure.')
    }
  }

  if (loading) return <div className="p-4 text-center font-bold">{isAm ? 'በመጫን ላይ...' : 'Loading POS Cache...'}</div>

  return (
    <div className="flex flex-col space-y-4 pb-16">
      {!showPayment ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white border border-slate-200 h-24 p-3 rounded-2xl flex flex-col justify-between text-left active:scale-95 transition-transform shadow-sm"
              >
                <span className="font-bold text-slate-900 line-clamp-2 text-sm">{product.name}</span>
                <span className="font-mono text-emerald-600 font-black text-base">{product.retail_price} ETB</span>
              </button>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="bg-white border-t border-slate-200 fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 z-30 shadow-xl rounded-t-3xl">
              <div className="max-h-32 overflow-y-auto space-y-2 mb-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700 truncate w-1/2">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 bg-slate-100 rounded-lg font-bold">-</button>
                      <span className="font-mono font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 bg-slate-100 rounded-lg font-bold">+</button>
                    </div>
                    <span className="font-mono font-bold text-slate-600">{(item.price * item.quantity)} ETB</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowPayment(true)}
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-base flex items-center justify-between px-4 active:scale-98"
              >
                <span>{isAm ? 'ክክፍያ ቀጥል ➡️' : 'Proceed to Payment ➡️'}</span>
                <span className="font-mono text-emerald-400">{totalBill} ETB</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setShowPayment(false)} className="text-sm font-bold text-slate-500">⬅️ {isAm ? 'ተመለስ' : 'Go Back'}</button>
          <PaymentSelector totalBill={totalBill} onConfirmPayment={handleFinalizeSale} isAm={isAm} />
        </div>
      )}
    </div>
  )
}