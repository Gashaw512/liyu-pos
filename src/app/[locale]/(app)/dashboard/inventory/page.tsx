'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import createClient from '@/lib/supabase/client'
import { 
  Layers, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  RefreshCw 
} from 'lucide-react'

interface InventoryProduct {
  id?: string;
  nameEn: string;
  nameAm: string;
  categoryEn: string;
  categoryAm: string;
  cost: number;
  sell: number;
  opening_count?: number;
}

export default function DedicatedInventoryPage() {
  const params = useParams()
  const supabase = createClient()
  
  const locale = params?.locale || 'am'
  const isAm = locale === 'am'

  const [categories, setCategories] = useState<string[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  
  const [loading, setLoading] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  
  const [newCategoryName, setNewCategoryName] = useState<string>('')
  const [newProductName, setNewProductName] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [bonoPrices, setBonoPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchInventoryMatrix()
  }, [])

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  async function fetchInventoryMatrix() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Safe matching with your backend server page fallback string token
      let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id;
      if (!businessId || businessId === 'undefined') {
        businessId = 'biz_active';
      }

      const { data: fetchedProducts, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)

      if (prodError) throw prodError

      const productList: InventoryProduct[] = (fetchedProducts || []).map(p => ({
        id: p.id,
        nameEn: p.name_en || p.name || '',
        nameAm: p.name_am || p.name || '',
        categoryEn: p.category_en || p.category || (isAm ? 'መደበኛ' : 'General'),
        categoryAm: p.category_am || p.category || (isAm ? 'መደበኛ' : 'General'),
        cost: Number(p.cost || p.buying_cost || 0), // Aligned to safe structural fallback
        sell: Number(p.selling_price || p.sell || 0)
      }))

      const uniqueCategories = Array.from(
        new Set(productList.map(p => isAm ? p.categoryAm : p.categoryEn).filter(Boolean))
      )

      setProducts(productList)
      setCategories(uniqueCategories.length > 0 ? uniqueCategories : [isAm ? 'መደበኛ' : 'General'])
    } catch (err) {
      console.error('Error hydrating persistent data matrix:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    if (!categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed])
      if (!selectedCategory) setSelectedCategory(trimmed)
    }
    setNewCategoryName('')
  }

  const handleDropCategory = (targetCat: string) => {
    setCategories(prev => prev.filter(c => c !== targetCat))
    if (selectedCategory === targetCat) {
      setSelectedCategory(categories.find(c => c !== targetCat) || '')
    }
  }

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newProductName.trim()
    if (!trimmedName || !selectedCategory) return

    const freshItem: InventoryProduct = {
      nameEn: trimmedName,
      nameAm: trimmedName,
      categoryEn: selectedCategory,
      categoryAm: selectedCategory,
      cost: 0,
      sell: bonoPrices[selectedCategory] || 0
    }

    setProducts(prev => [freshItem, ...prev])
    setNewProductName('')
  }

  const handleUpdateProductField = (
    index: number, 
    key: keyof InventoryProduct, 
    value: string | number
  ) => {
    setProducts(prev => {
      const workingCopy = [...prev]
      workingCopy[index] = { ...workingCopy[index], [key]: value }
      return workingCopy
    })
  }

  const handleApplyBonoPricing = (categoryGroup: string, flatPrice: number) => {
    setBonoPrices(prev => ({ ...prev, [categoryGroup]: flatPrice }))
    
    setProducts(prev => 
      prev.map(item => {
        const structuralMatch = isAm ? item.categoryAm === categoryGroup : item.categoryEn === categoryGroup
        return structuralMatch ? { ...item, sell: flatPrice } : item
      })
    )
  }

  const handleRemoveProduct = (targetIndex: number) => {
    setProducts(prev => prev.filter((_, idx) => idx !== targetIndex))
  }

  const handleSaveChangeset = async () => {
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session validation failed')

      let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id;
      if (!businessId || businessId === 'undefined') {
        businessId = 'biz_active';
      }

      // 1. Delete matching workspace rows to prevent key overlaps
      await supabase.from('products').delete().eq('business_id', businessId)

      // 2. Map structure using 'cost' instead of 'buying_cost' to respect schema definitions safely
      const insertPayload = products.map(p => ({
        business_id: businessId,
        name_en: p.nameEn,
        name_am: p.nameAm,
        category_en: p.categoryEn,
        category_am: p.categoryAm,
        cost: p.cost, // Adjusted column name map
        selling_price: p.sell,
        stock_quantity: p.opening_count || 0
      }))

      if (insertPayload.length > 0) {
        const { error: saveError } = await supabase.from('products').insert(insertPayload)
        if (saveError) throw saveError
      }

      alert(isAm ? 'የተደረጉ ማስተካከያዎች በተሳካ ሁኔታ ተቀምጠዋል!' : 'Inventory parameters committed successfully!')
      await fetchInventoryMatrix()
    } catch (err) {
      console.error('Database write operation rejected:', err)
      alert(isAm ? 'ማስቀመጥ አልተሳካም። እባክዎ ኢንተርኔትዎትን አረጋግጠው ድጋሚ ይሞክሩ' : 'Failed to commit inventory parameters. Verify fields configuration.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#8B2635]" />
        <p className="text-xs font-bold text-[#7A6A67] animate-pulse">
          {isAm ? 'የመጋዘን መረጃዎችን በማምጣት ላይ...' : 'Synchronizing inventory records...'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-5 select-none animate-fadeIn">
      
      {/* Header Branding Container Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-black text-coffee-900 tracking-tight">
            {isAm ? 'የዕቃዎች መቆጣጠሪያ መጋዘን' : 'Core Inventory Master'}
          </h1>
          <p className="text-[11px] font-medium text-coffee-400">
            {isAm ? 'የምርት ምድቦችን፣ ዕቃዎችን እና የመሸጫ/መግዣ የዋጋ ዝርዝር መዝገብ ማስተካከያ' : 'Maintain inventory structures, update configurations, and enforce flat-rate margins.'}
          </p>
        </div>
        
        <button
          onClick={handleSaveChangeset}
          disabled={isProcessing}
          className="bg-berbere-600 text-white px-5 py-2.5 rounded-xl hover:bg-berbere-700 transition-all font-black text-xs shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isAm ? 'ለውጦችን አስቀምጥ' : 'Commit Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        
        {/* Categories Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-cream-200 p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-berbere-600">
              <Layers className="w-4 h-4" />
              <h2 className="font-black text-xs uppercase tracking-wider text-coffee-900">
                {isAm ? 'የምርት ምድቦች' : 'Categories'}
              </h2>
            </div>

            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={isAm ? 'አዲስ ምድብ...' : 'New category...'}
                className="flex-1 px-3 text-xs bg-cream-50/50 rounded-xl border border-cream-200 outline-none focus:border-berbere-600 focus:bg-white min-h-[40px] font-medium text-coffee-950"
              />
              <button
                type="submit"
                className="bg-berbere-600 text-white px-3 rounded-xl hover:bg-berbere-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="bg-cream-50/30 p-3 rounded-xl border border-cream-100 min-h-[120px]">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat, idx) => (
                  <span 
                    key={idx}
                    className={`text-[11px] font-bold pl-3 pr-2 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
                      selectedCategory === cat 
                        ? 'bg-berbere-600 text-white border-berbere-600' 
                        : 'bg-white text-coffee-900 border-cream-200 hover:border-berbere-600/40 cursor-pointer'
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDropCategory(cat)
                      }}
                      className="p-0.5 rounded ml-1 hover:bg-black/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Products Matrix Ledger Section */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-cream-200 p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShoppingBag className="w-4 h-4" />
              <h2 className="font-black text-xs uppercase tracking-wider text-coffee-900">
                {isAm ? 'የዕቃዎች ዝርዝር መዝገብ' : 'Product Inventory Matrix'}
              </h2>
            </div>

            <form 
              onSubmit={handleCreateProduct} 
              className="bg-cream-50/50 p-2.5 rounded-xl border border-cream-200 flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder={isAm ? 'የአዲስ ዕቃ ስም ያስገቡ...' : 'Enter product name...'}
                className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
              />
              
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 py-2 text-xs bg-white rounded-lg border border-cream-200 outline-none font-bold text-coffee-900 max-w-[120px] truncate"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                <button
                  type="submit"
                  className="bg-berbere-600 hover:bg-berbere-700 text-white px-4 py-2 rounded-lg transition-colors font-black text-xs flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  {isAm ? 'ጨምር' : 'Add'}
                </button>
              </div>
            </form>

            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1 border border-cream-100 p-1 rounded-xl bg-cream-50/10">
              {categories.map((cat) => {
                const matchingProducts = products.filter(p => 
                  isAm ? p.categoryAm === cat : p.categoryEn === cat
                )

                return (
                  <div key={cat} className="space-y-2 bg-white p-3 rounded-xl border border-cream-200 shadow-sm">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1.5 border-b border-cream-100 gap-2">
                      <span className="font-black text-[11px] text-berbere-600 tracking-tight uppercase">
                        📁 {cat}
                      </span>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-coffee-400">
                          {isAm ? 'የጋራ ቦኖ ዋጋ:' : 'Flat Bono Price:'}
                        </span>
                        <div className="relative flex items-center max-w-[85px]">
                          <input 
                            type="number"
                            placeholder="0"
                            value={bonoPrices[cat] || ''}
                            onChange={(e) => handleApplyBonoPricing(cat, Number(e.target.value))}
                            className="w-full text-right pr-6 pl-2 py-0.5 text-xs font-black bg-amber-50 text-coffee-950 rounded border border-amber-200 outline-none focus:bg-white"
                          />
                          <span className="absolute right-1 text-[8px] font-bold text-coffee-400">ብር</span>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-cream-50">
                      {matchingProducts.length === 0 ? (
                        <div className="text-[10px] text-coffee-400 italic py-3 text-center">
                          {isAm ? 'በዚህ ምድብ ስር ምንም ምርት አልተመዘገበም' : 'No items assigned under this category segment.'}
                        </div>
                      ) : (
                        matchingProducts.map((prod) => {
                          const masterIndex = products.findIndex(p => p === prod)
                          if (masterIndex === -1) return null

                          return (
                            <div key={masterIndex} className="py-2 flex items-center justify-between gap-3 group">
                              
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(masterIndex)}
                                  className="text-coffee-300 hover:text-red-600 p-1 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <input 
                                    type="text"
                                    value={isAm ? prod.nameAm : prod.nameEn}
                                    onChange={(e) => handleUpdateProductField(masterIndex, isAm ? 'nameAm' : 'nameEn', e.target.value)}
                                    className="font-bold text-xs text-coffee-950 bg-transparent border-b border-transparent hover:border-cream-200 focus:border-berbere-600 outline-none w-full py-0.5 truncate transition-colors"
                                  />
                                  
                                  <div className="text-[10px] text-coffee-400 flex items-center gap-1 mt-0.5">
                                    <span>{isAm ? 'መግዣ ዋጋ:' : 'Cost:'}</span>
                                    <input 
                                      type="number" 
                                      value={prod.cost || 0}
                                      onChange={(e) => handleUpdateProductField(masterIndex, 'cost', Number(e.target.value))}
                                      className="w-12 bg-transparent border-b border-cream-200 focus:border-coffee-400 font-bold text-center text-coffee-700 outline-none"
                                    />
                                    <span>{isAm ? 'ብር' : 'ETB'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span className="text-[8px] font-black text-berbere-600 uppercase tracking-wide">
                                  {isAm ? 'መሸጫ ዋጋ' : 'Sell Price'}
                                </span>
                                <div className="relative flex items-center max-w-[85px]">
                                  <input
                                    type="number"
                                    value={prod.sell || 0}
                                    onChange={(e) => handleUpdateProductField(masterIndex, 'sell', Number(e.target.value))}
                                    className="w-full text-right pr-6 pl-1.5 py-0.5 text-xs font-black text-berbere-700 bg-berbere-50/40 rounded border border-transparent focus:border-berbere-600 focus:bg-white transition-all outline-none"
                                  />
                                  <span className="absolute right-1 text-[9px] font-bold text-berbere-600/60 pointer-events-none">
                                    {isAm ? 'ብር' : 'ETB'}
                                  </span>
                                </div>
                              </div>

                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}