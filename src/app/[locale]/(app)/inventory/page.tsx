'use client'

import { useState, useEffect } from 'react'
import { getDB } from '../../../../lib/offline/db'
import StockRow from '../../../../components/inventory/StockRow'
import { useParams } from 'next/navigation'

export default function InventoryPage() {
  const params = useParams()
  const isAm = params.locale === 'am'
  
  const [products, setProducts] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProductsForCounting() {
      const db = await getDB()
      const cachedProducts = await db.getAll('products')
      setProducts(cachedProducts || [])
      
      const initialCounts: Record<string, number> = {}
      cachedProducts?.forEach((p) => {
        initialCounts[p.id] = 0
      })
      setCounts(initialCounts)
      setLoading(false)
    }
    loadProductsForCounting()
  }, [])

  const handleCountChange = (productId: string, newCount: number) => {
    setCounts((prev) => ({ ...prev, [productId]: newCount }))
  }

  const handleSaveInventoryCount = async () => {
    try {
      const db = await getDB()
      const activeShift = await db.get('active_shift', 'current')
      
      // Use an IndexedDB transaction to save all item rows safely
      const tx = db.transaction('pending_stock_reconciliations', 'readwrite')
      const store = tx.objectStore('pending_stock_reconciliations')

      // 🛠️ Flatten individual rows to fulfill your StockCount structural rules
      for (const [productId, quantity] of Object.entries(counts)) {
        const localId = crypto.randomUUID()
        
        const singleStockRow = {
          localId,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending' as const,

          // Core structural parameters from StockCount definition types
          id: localId,
          product_id: productId,
          business_id: activeShift?.business_id || 'offline_fallback_business',
          branch_id: activeShift?.branch_id || 'offline_fallback_branch',
          counted_quantity: quantity,
          expected_quantity: 0, // Server will resolve delta reconciliation variance
          notes: 'Mobile PWA Entry'
        }

        await store.put(singleStockRow as any)
      }

      await tx.done
      alert(isAm ? 'ቆጠራው በስልክዎ ላይ ተቀምጧል!' : 'Stock count saved to device cache!')
    } catch (err) {
      alert('Inventory storage failure.')
    }
  }

  if (loading) return <div className="p-4 text-center font-bold">{isAm ? 'በመጫን ላይ...' : 'Loading Stock Sheets...'}</div>

  return (
    <div className="flex flex-col space-y-3 pb-24">
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
          {isAm ? 'የዕቃዎች መቁጠሪያ ፎርም' : 'Physical Stock Sheet'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isAm ? 'እባክዎ መጋዘን ውስጥ ያሉትን እቃዎች በትክክል ይቁጠሩ::' : 'Tap buttons to balance active crates counts.'}
        </p>
      </div>

      <div className="space-y-2">
        {products.map((product) => (
          <StockRow
            key={product.id}
            productName={product.name}
            category={product.category_id || 'General'}
            currentCount={counts[product.id] || 0}
            onCountChange={(newCount) => handleCountChange(product.id, newCount)}
            isAm={isAm}
          />
        ))}
      </div>

      <button
        onClick={handleSaveInventoryCount}
        className="h-14 w-full bg-slate-900 text-white rounded-xl font-black text-base shadow-md active:scale-95 transition-transform"
      >
        💾 {isAm ? 'ቆጠራውን መዝግብ' : 'Commit Stock Sheet'}
      </button>
    </div>
  )
}