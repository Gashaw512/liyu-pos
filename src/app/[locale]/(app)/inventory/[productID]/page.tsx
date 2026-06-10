'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getDB } from '../../../../../lib/offline/db'
import StockRow from '../../../../../components/inventory/StockRow'

export default function InventoryPage() {
  const params = useParams()
  const isAm = params.locale === 'am'
  
  const [products, setProducts] = useState<any[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [categoriesList, setCategoriesList] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInventorySheetData() {
      const db = await getDB()
      
      // Pull catalog entities from multi-tenant local stores concurrently
      const [cachedProducts, cachedCategories] = await Promise.all([
        db.getAll('products'),
        db.getAll('categories')
      ])

      // Map Category UUIDs to their onboarding names for the layout renderers
      const catMap: Record<string, string> = {}
      cachedCategories?.forEach((cat) => {
        catMap[cat.id] = cat.name
      })
      
      setCategoryMap(catMap)
      setCategoriesList(cachedCategories || [])
      setProducts(cachedProducts || [])
      
      // Construct clean initial baseline for counter states
      const initialCounts: Record<string, number> = {}
      cachedProducts?.forEach((p) => {
        initialCounts[p.id] = 0
      })
      setCounts(initialCounts)
      setLoading(false)
    }
    loadInventorySheetData()
  }, [])

  const handleCountChange = (productId: string, newCount: number) => {
    setCounts((prev) => ({ ...prev, [productId]: Math.max(0, newCount) }))
  }

  const handleSaveInventoryCount = async () => {
    try {
      const db = await getDB()
      const activeShift = await db.get('active_shift', 'current')
      
      const tx = db.transaction('pending_stock_reconciliations', 'readwrite')
      const store = tx.objectStore('pending_stock_reconciliations')

      // Flatten state map out into structural rows
      for (const [productId, quantity] of Object.entries(counts)) {
        const localId = crypto.randomUUID()
        
        // Find product to determine its associated structural category name
        const productRef = products.find(p => p.id === productId)
        const mappedCatName = productRef ? (categoryMap[productRef.category_id] || 'General') : 'General'
        
        const singleStockRow = {
          localId,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending' as const,

          id: localId,
          product_id: productId,
          category_name: mappedCatName, // Enriches the record payload for downstream dashboard processing
          business_id: activeShift?.business_id || 'offline_fallback_business',
          branch_id: activeShift?.branch_id || 'offline_fallback_branch',
          counted_quantity: Number(quantity || 0),
          expected_quantity: 0, 
          notes: 'Mobile PWA Entry'
        }

        await store.put(singleStockRow as any)
      }

      await tx.done
      alert(isAm ? '🎉 ቆጠራው በስልክዎ ላይ ተቀምጧል!' : '🎉 Stock count saved to device cache!')
    } catch (err) {
      alert(isAm ? '❌ ስህተት አጋጥሟል፡ መረጃው አልተቀመጠም።' : '❌ Inventory storage failure.')
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center font-black text-coffee-800 animate-pulse text-sm">
        {isAm ? '📦 የዕቃዎች ዝርዝር በመጫን ላይ ነው...' : '📦 Loading Stock Sheets...'}
      </div>
    )
  }

  // Filter items based on selected category bubble or search query inputs
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'ALL' || product.category_id === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="flex flex-col space-y-4 pb-28 max-w-xl mx-auto px-2 select-none">
      
      {/* HEADER EXPLANATORY PROFILE CARD */}
      <div className="bg-coffee-900 text-cream-50 p-4 rounded-2xl border border-coffee-950 shadow-sm">
        <h2 className="text-base font-black tracking-tight flex items-center gap-1.5">
          📝 {isAm ? 'የዕቃዎች መቁጠሪያ ፎርም' : 'Physical Stock Sheet'}
        </h2>
        <p className="text-xs text-coffee-300 font-medium mt-1 leading-normal">
          {isAm ? 'መጋዘን ወይም መደርደሪያ ላይ ያሉትን እቃዎች በትክክል ቆጥረው ያስገቡ።' : 'Count active physical shelf items below to reconcile tracking.'}
        </p>
      </div>

      {/* QUICK LIVE TEXT SEARCH INPUT */}
      <div className="relative">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isAm ? "🔍 እቃ ለመፈለግ እዚህ ይጻፉ..." : "🔍 Search product name..."}
          className="w-full h-11 px-4 rounded-xl border border-cream-300 bg-white text-xs font-bold text-coffee-900 placeholder-coffee-400 focus:outline-none focus:ring-2 focus:ring-berbere-500 shadow-sm"
        />
      </div>

      {/* HORIZONTAL CATEGORY CHIP CAROUSEL FOR EASY INTERFACE INTERACTION */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-black text-coffee-400 tracking-wider px-1 block">
          {isAm ? 'በምድብ መምረጫ' : 'Filter by Category'}
        </span>
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`h-9 px-4 rounded-xl text-xs font-black transition-all shrink-0 border active:scale-95 ${
              selectedCategory === 'ALL'
                ? 'bg-berbere-600 border-berbere-500 text-white shadow-sm'
                : 'bg-white border-cream-200 text-coffee-700 hover:bg-cream-50'
            }`}
          >
            🌟 {isAm ? 'ሁሉም' : 'All Items'} ({products.length})
          </button>
          
          {categoriesList.map((cat) => {
            const countPerCat = products.filter(p => p.category_id === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-9 px-4 rounded-xl text-xs font-black transition-all shrink-0 border active:scale-95 ${
                  selectedCategory === cat.id
                    ? 'bg-berbere-600 border-berbere-500 text-white shadow-sm'
                    : 'bg-white border-cream-200 text-coffee-700 hover:bg-cream-50'
                }`}
              >
                🏷️ {cat.name} ({countPerCat})
              </button>
            )
          })}
        </div>
      </div>

      {/* RENDER DYNAMIC STOCK ENTRIES */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-cream-200 p-8 text-center text-xs text-coffee-400 font-bold">
            {isAm ? '📭 በዚህ ክፍል ውስጥ ምንም እቃ አልተገኘም::' : '📭 No tracking items found matching filters.'}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <StockRow
              key={product.id}
              productName={product.name}
              category={categoryMap[product.category_id] || (isAm ? 'አጠቃላይ' : 'General')}
              currentCount={counts[product.id] || 0}
              onCountChange={(newCount) => handleCountChange(product.id, newCount)}
              isAm={isAm}
            />
          ))
        )}
      </div>

      {/* COMMIT ACTION FOOTER BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-cream-100 max-w-xl mx-auto z-40">
        <button
          onClick={handleSaveInventoryCount}
          type="button"
          className="h-12 w-full bg-coffee-900 hover:bg-coffee-950 text-cream-50 rounded-xl font-black text-sm tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2" 
        >
          💾 {isAm ? 'ቆጠራውን በስልኩ ላይ መዝግብ' : 'Commit Stock Sheet to Device'}
        </button>
      </div>

    </div>
  )
}