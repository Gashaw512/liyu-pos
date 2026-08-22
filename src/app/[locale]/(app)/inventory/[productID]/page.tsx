// src/[locale]/(app)/inventory/[product]/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { getDB } from '@/lib/offline/db'
import { getLocalInventoryProducts } from '@/hooks/useInventoryData'
import StockRow from '@/components/inventory/StockRow'
import type { InventoryProduct } from '@/types/inventory'

export const dynamic = 'force-dynamic';

export default function ProductStockTakePage() {
  const params = useParams()
  const isAm = params.locale === 'am'

  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; name_am: string | null; icon?: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // 1. Fetch data directly from our secure local client hook
  useEffect(() => {
    async function loadInventorySheetData() {
      try {
        const data = await getLocalInventoryProducts()
        setProducts(data)

        // Build a unique array of categories from products to drive our layout carousel chips
        const uniqueCategoriesMap = new Map()
        data.forEach(p => {
          if (p.category_id) {
            uniqueCategoriesMap.set(p.category_id, {
              id: p.category_id,
              name: p.category_name,
              name_am: p.category_name_am,
              icon: p.category_icon
            })
          }
        })
        setCategoriesList(Array.from(uniqueCategoriesMap.values()))

        // Set baseline counts matching what is currently inside our systems ledger
        const initialCounts: Record<string, number> = {}
        data.forEach((p) => {
          initialCounts[p.id] = p.opening_count
        })
        setCounts(initialCounts)
      } catch (err) {
        console.error('Local data load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInventorySheetData()
  }, [])

  const handleCountChange = (productId: string, newCount: number) => {
    setCounts((prev) => ({ ...prev, [productId]: Math.max(0, newCount) }))
  }

  // 2. Commit stock updates down into our IndexedDB Outbox transactions storage
  const handleSaveInventoryCount = async () => {
    try {
      const db = await getDB()
      const activeShift = await db.get('active_shift', 'current')

      if (!activeShift) {
        alert(isAm ? '❌ እባክዎ መጀመሪያ ሽፍት ይክፈቱ!' : '❌ Please open a shift before counting inventory!')
        return
      }

      const tx = db.transaction('pending_stock_reconciliations', 'readwrite')
      const store = tx.objectStore('pending_stock_reconciliations')
      const now = new Date().toISOString()

      let changeDetected = false

      for (const product of products) {
        const currentInputValue = counts[product.id] ?? 0

        // Only save changes to optimize memory footprint space
        if (currentInputValue === product.opening_count) continue

        changeDetected = true
        const uuid = crypto.randomUUID()

        const singleStockRow = {
          localId: uuid,
          createdAt: now,
          retryCount: 0,
          syncStatus: 'pending' as const,
          product_id: product.id,
          business_id: activeShift.business_id,
          branch_id: activeShift.branch_id,
          shift_id: activeShift.id,
          counted_quantity: currentInputValue,
          system_quantity: product.opening_count,
          notes: 'Hand counted via Product Specific Sheet Form'
        }

        await store.put(singleStockRow)
      }

      await tx.done

      if (!changeDetected) {
        alert(isAm ? 'ℹ️ ምንም የተቀየረ እቃ የለም።' : 'ℹ️ No adjustments were modified.')
        return
      }

      alert(isAm ? '✅ ቆጠራው በስልክዎ ላይ ተቀምጧል!' : '✅ Adjustments saved successfully!')
    } catch (err) {
      alert(isAm ? '❌ ማስቀመጥ አልተቻለም፣ እባክዎ እንደገና ይሞክሩ' : '❌ Failed to save count data, please try again.')
    }
  }

  // 3. Simple Instant Multi-language Filtering Logic Engine
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'ALL' || product.category_id === selectedCategory

      const normalizedQuery = searchQuery.toLowerCase().trim()
      const matchesSearch = !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.name_am?.toLowerCase().includes(normalizedQuery) ||
        product.barcode?.toLowerCase().includes(normalizedQuery)

      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery, products])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="text-4xl animate-spin mb-3">🔄</div>
        <p className="text-sm font-semibold text-slate-600">
          {isAm ? 'ማህደሩ በመጫን ላይ...' : 'Loading master inventory list...'}
        </p>
      </div>
    )
  }

  return (
    // Note: 'pb-40' guarantees bottom items are scrollable above the fixed buttons
    <div className="min-h-screen bg-slate-50 pt-2 pb-40 select-none">

      {/* Offline Status Top Ribbon Banner */}
      <div className="mx-4 mb-4 bg-slate-900 px-4 py-2.5 rounded-xl flex justify-between items-center text-white shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {isAm ? 'ከመስመር ውጭ ይሰራል' : 'Offline Mode Active'}
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
          v3.1 Local-First
        </span>
      </div>

      {/* Primary Clean Form Header Banner */}
      <div className="bg-white mx-4 p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          {isAm ? 'የዕቃዎች መቁጠሪያ ፎርም' : 'Physical Stock Sheet'}
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          {isAm ? 'መጋዘን ወይም መደርደሪያ ላይ ያሉትን እቃዎች በትክክል ቆጥረው ያስገቡ።' : 'Count active physical shelf items below to reconcile tracking.'}
        </p>
      </div>

      <div className="px-4 space-y-4">

        {/* Simple Fast Search Field Input wrapper */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAm ? "እቃ ለመፈለግ እዚህ ይጻፉ..." : "Search product name or barcode..."}
            className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 text-xs">
              ✕
            </button>
          )}
        </div>

        {/* Categories Chip horizontal scroll row layout */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 block">
            {isAm ? 'በምድብ መምረጫ' : 'Filter by Category'}
          </span>
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shrink-0 border active:scale-95 ${selectedCategory === 'ALL'
                ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              🌟 {isAm ? 'ሁሉም' : 'All'} ({products.length})
            </button>

            {categoriesList.map((cat) => {
              const countPerCat = products.filter(p => p.category_id === cat.id).length
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shrink-0 border active:scale-95 ${selectedCategory === cat.id
                    ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {cat.icon || '🏷️'} {isAm && cat.name_am ? cat.name_am : cat.name} ({countPerCat})
                </button>
              )
            })}
          </div>
        </div>

        {/* Products Row Loop Grid */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
              <div className="text-3xl mb-2">📦</div>
              <h4 className="font-bold text-slate-800">{isAm ? 'ምንም እቃ አልተገኘም' : 'No Items Found'}</h4>
              <p className="text-xs text-slate-400 mt-1">
                {isAm ? 'የፃፉትን ቃል ቀይረው ይሞክሩ' : 'Try checking your spelling or clear category filters.'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const hasChanged = (counts[product.id] ?? 0) !== product.opening_count;
              const categoryBadgeColor = product.category_color || '#64748b';

              return (
                <div
                  key={product.id}
                  className={`bg-white p-4 rounded-2xl border transition-all ${hasChanged
                    ? 'border-amber-400 ring-2 ring-amber-50 shadow-md'
                    : 'border-slate-200 shadow-sm'
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {isAm && product.name_am ? product.name_am : product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryBadgeColor }} />
                        <span className="text-xs font-semibold text-slate-500">
                          {product.category_icon} {isAm && product.category_name_am ? product.category_name_am : product.category_name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">{product.retail_price} ETB</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                        {product.unit_type}
                      </div>
                    </div>
                  </div>

                  <StockRow
                    productName={isAm && product.name_am ? product.name_am : product.name}
                    category={isAm && product.category_name_am ? product.category_name_am : product.category_name}
                    unitType={product.unit_type}
                    systemCount={product.opening_count}
                    currentCount={counts[product.id] ?? 0}
                    onCountChange={(newCount) => handleCountChange(product.id, newCount)}
                    isAm={isAm}
                    costPrice={product.cost_price || 0}
                    retailPrice={product.retail_price || 0}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 💾 Bottom Action Button (Cleaned up and layout-aligned) */}
      <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-t from-slate-50 via-white/95 to-transparent pt-6 pb-4 px-4 z-30">
        <button
          onClick={handleSaveInventoryCount}
          type="button"
          className="w-full h-14 rounded-xl bg-slate-950 text-white text-base font-bold active:scale-[0.99] transition-transform flex items-center justify-center gap-2 shadow-xl hover:bg-slate-900"
        >
          <span>💾</span>
          {isAm ? 'ቆጠራውን አስቀምጥ' : 'Save Adjustments'}
        </button>
      </div>

    </div>
  )
}