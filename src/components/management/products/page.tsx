'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import createClient from '@/lib/supabase/client'
import { ProductList } from '@/components/management/products/ProductList'
import { ProductForm } from '@/components/management/products/ProductForm'
import {
  X,
  Loader2,
  RefreshCw,
  Boxes,
  ArrowLeft
} from 'lucide-react'

interface InventoryProduct {
  id?: string;
  nameEn: string;
  nameAm: string;
  categoryEn: string;
  categoryAm: string;
  cost: number;
  sell: number;
  opening_count: number;
  category_id: string | null;
  unit_type: string;
  barcode: string;
  sku: string;
  low_stock_alert: number;
  track_inventory: boolean;
}

interface DbCategory {
  id: string;
  name: string;
  name_am: string;
}

export default function ProductsManagementPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const locale = params?.locale || 'am'
  const isAm = locale === 'am'

  const [categories, setCategories] = useState<string[]>([])
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const [newCategoryName, setNewCategoryName] = useState<string>('')
  const [newProductName, setNewProductName] = useState<string>('')
  const [bonoPrices, setBonoPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchInventoryMatrix()
  }, [locale])

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

      let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id;
      if (!businessId || businessId === 'undefined') {
        const { data: profileRow } = await supabase.from('profiles').select('business_id').eq('id', user.id).maybeSingle()
        businessId = profileRow?.business_id
      }
      if (!businessId) return

      const { data: liveCategories, error: catErr } = await supabase
        .from('categories')
        .select('id, name, name_am')
        .eq('business_id', businessId)

      if (catErr) throw catErr
      setDbCategories(liveCategories || [])

      const { data: rawProducts, error: prodError } = await supabase
        .from('products')
        .select(`
          id, name, name_am, cost_price, retail_price, unit_type,
          barcode, sku, low_stock_alert, track_inventory, category_id,
          categories (id, name, name_am)
        `)
        .eq('business_id', businessId)

      if (prodError) throw prodError

      const { data: rawInventory } = await supabase
        .from('inventory')
        .select('product_id, quantity')
        .eq('business_id', businessId)

      const uniqueProductMap: Record<string, InventoryProduct> = {}

      rawProducts?.forEach((p) => {
        const pNameEn = p.name || ''
        const pNameAm = p.name_am || p.name || ''
        const normalizationKey = `${pNameEn.toLowerCase().trim()}_${pNameAm.toLowerCase().trim()}`

        // Calculate combined totals from all available branches
        const actualStockBalance = (rawInventory || [])
          .filter((inv) => inv.product_id === p.id)
          .reduce((sum, item) => sum + (item.quantity || 0), 0)

        const joinedCategory: any = Array.isArray(p.categories) 
          ? p.categories[0] 
          : p.categories

        const catEn = joinedCategory?.name || (isAm ? 'መደበኛ' : 'General')
        const catAm = joinedCategory?.name_am || joinedCategory?.name || (isAm ? 'መደበኛ' : 'General')

        if (!uniqueProductMap[normalizationKey]) {

          uniqueProductMap[normalizationKey] = {
            id: p.id,
            nameEn: pNameEn,
            nameAm: pNameAm,
            categoryEn: catEn,
            categoryAm: catAm,
            cost: Number(p.cost_price || 0),
            sell: Number(p.retail_price || 0),
            opening_count: actualStockBalance,
            category_id: p.category_id,
            unit_type: p.unit_type || 'piece',
            barcode: p.barcode || '',
            sku: p.sku || '',
            low_stock_alert: Number(p.low_stock_alert || 0),
            track_inventory: p.track_inventory ?? true
          }
        } else {
          uniqueProductMap[normalizationKey].opening_count += actualStockBalance
        }
      })

      const cleanedProductsList = Object.values(uniqueProductMap)
      const parsedCategoryLabels = Array.from(
        new Set((liveCategories || []).map(c => isAm ? c.name_am || c.name : c.name).filter(Boolean))
      )

      setProducts(cleanedProductsList)
      setCategories(parsedCategoryLabels.length > 0 ? parsedCategoryLabels : [isAm ? 'መደበኛ' : 'General'])
    } catch (err) {
      console.error('Snapshot configuration failure:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    if (!categories.includes(trimmed)) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let businessId = user?.user_metadata?.business_id || user?.app_metadata?.business_id
        if (!businessId) return

        const { data: newCat, error: insErr } = await supabase
          .from('categories')
          .insert({ business_id: businessId, name: trimmed, name_am: trimmed, is_active: true })
          .select()
          .single()

        if (insErr) throw insErr
        if (newCat) {
          setDbCategories(prev => [...prev, newCat])
          setCategories(prev => [...prev, trimmed])
          if (!selectedCategory) setSelectedCategory(trimmed)
        }
      } catch (err) {
        console.error('Failed syncing new dynamic category segment:', err)
      }
    }
    setNewCategoryName('')
  }

  const handleDropCategory = async (targetCat: string) => {
    const matchedRow = dbCategories.find(c => c.name === targetCat || c.name_am === targetCat)
    if (!matchedRow) return

    if (products.some(p => p.category_id === matchedRow.id)) {
      alert(isAm 
        ? 'በዚህ ምድብ ስር ያሉ ዕቃዎች ስላሉ መሰረዝ አይችሉም! አስቀድመው ዕቃዎቹን ያዛውሩ ወይም ያጥፉ።' 
        : 'Cannot remove category! Active product definitions are currently mapped to this relational layer.'
      )
      return
    }

    if (confirm(isAm ? 'ይህን የምርት ምድብ ማጥፋት እርግጠኛ ነዎት?' : 'Are you sure you want to drop this category segment?')) {
      await supabase.from('categories').delete().eq('id', matchedRow.id)
      setDbCategories(prev => prev.filter(c => c.id !== matchedRow.id))
      setCategories(prev => prev.filter(c => c !== targetCat))
      if (selectedCategory === targetCat) {
        setSelectedCategory(categories.find(c => c !== targetCat) || '')
      }
    }
  }

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newProductName.trim()
    if (!trimmedName || !selectedCategory) return

    const matchedCatRow = dbCategories.find(c => c.name === selectedCategory || c.name_am === selectedCategory)

    const freshItem: InventoryProduct = {
      nameEn: trimmedName,
      nameAm: trimmedName,
      categoryEn: selectedCategory,
      categoryAm: selectedCategory,
      cost: 0,
      sell: bonoPrices[selectedCategory] || 0,
      opening_count: 0,
      category_id: matchedCatRow ? matchedCatRow.id : null,
      unit_type: 'piece',
      barcode: '',
      sku: '',
      low_stock_alert: 5,
      track_inventory: true
    }

    setProducts(prev => [freshItem, ...prev])
    setNewProductName('')
  }

  const handleApplyBonoPricing = (categoryGroup: string, flatPrice: number) => {
    setBonoPrices(prev => ({ ...prev, [categoryGroup]: flatPrice }))
    setProducts(prev =>
      prev.map(item => {
        const match = isAm ? item.categoryAm === categoryGroup : item.categoryEn === categoryGroup
        return match ? { ...item, sell: flatPrice } : item
      })
    )
  }

  const handleSaveChangeset = async () => {
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session validation failed')

      let businessId = user.user_metadata?.business_id || user.app_metadata?.business_id;
      if (!businessId || businessId === 'undefined') {
        const { data: profileRow } = await supabase.from('profiles').select('business_id').eq('id', user.id).maybeSingle()
        businessId = profileRow?.business_id
      }

      const { data: branchRow } = await supabase.from('branches').select('id').eq('business_id', businessId).eq('is_main', true).maybeSingle()
      const branchId = branchRow?.id || null

      const upsertPayload = products.map(p => {
        const matchedCategory = dbCategories.find(c => c.name === p.categoryEn || c.name_am === p.categoryAm || c.id === p.category_id)
        return {
          ...(p.id ? { id: p.id } : {}),
          business_id: businessId,
          branch_id: branchId,
          category_id: matchedCategory ? matchedCategory.id : null,
          name: p.nameEn || p.nameAm,
          name_am: p.nameAm || p.nameEn,
          cost_price: Number(p.cost || 0),
          retail_price: Number(p.sell || 0),
          unit_type: p.unit_type || 'piece',
          barcode: p.barcode || null,
          sku: p.sku || null,
          low_stock_alert: Number(p.low_stock_alert || 0),
          track_inventory: p.track_inventory,
          is_active: true
        }
      })

      if (upsertPayload.length > 0) {
        const { error: saveError } = await supabase.from('products').upsert(upsertPayload, { onConflict: 'id' })
        if (saveError) throw saveError
      }

      alert(isAm ? 'ማስተካከያዎች በተሳካ ሁኔታ ተቀምጠዋል!' : 'Product parameters committed successfully!')
      await fetchInventoryMatrix()
    } catch (err) {
      console.error(err)
      alert(isAm ? 'ማስቀመጥ አልተሳካም።' : 'Failed to save configuration settings.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B2635]" />
        <p className="text-xs font-bold text-coffee-400 animate-pulse">
          {isAm ? 'የምርት ማውጫ መዝገቦችን በማምጣት ላይ...' : 'Synchronizing asset catalog definitions...'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-24 text-coffee-950">
      
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push(`/${locale}/management`)}
          className="flex items-center gap-2 text-xs font-black text-coffee-700 bg-white h-10 px-4 rounded-xl border border-cream-200 shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#8B2635] stroke-[3]" />
          {isAm ? 'ወደ ማስተዳደሪያ ተመለስ' : 'Back to Management'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-black tracking-tight flex items-center gap-2 text-coffee-900">
            <Boxes className="w-5 h-5 text-berbere-600" />
            {isAm ? 'የምርቶች ማስተዳደሪያ ማዕከል' : 'Products Management'}
          </h1>
          <p className="text-[11px] font-medium text-coffee-400">
            {isAm ? 'አዳዲስ እቃዎችን መፍጠር፣ መሸጫ/መግዣ ዋጋ እና ባርኮዶችን ማስተካከል ይችላሉ።' : 'Define catalog structures, configure barcode tags, and apply dynamic matrix retail values.'}
          </p>
        </div>

        <button
          onClick={handleSaveChangeset}
          disabled={isProcessing}
          className="bg-[#8B2635] text-white px-5 py-2.5 rounded-xl hover:bg-berbere-700 transition-all font-black text-xs shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {isAm ? 'ለውጦችን በምርቶች ላይ አስቀምጥ' : 'Commit Catalog Changes'}
        </button>
      </div>

      {/* Category Grid Section */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-coffee-400 pl-1">
          {isAm ? 'የምርት ምድብ ማጣሪያ' : 'Quick Category Selector'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat
            const itemCounts = products.filter(p => isAm ? p.categoryAm === cat : p.categoryEn === cat).length
            return (
              <div
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative flex flex-col justify-between min-h-[85px] active:scale-[0.97] ${
                  isSelected 
                    ? 'bg-[#8B2635] text-white border-berbere-600 shadow-md ring-2 ring-berbere-100' 
                    : 'bg-white text-coffee-900 border-cream-200 hover:border-berbere-500 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-black text-xs tracking-tight truncate max-w-[85%]">{cat}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDropCategory(cat)
                    }}
                    className={`p-1 rounded transition-colors ${isSelected ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-coffee-300 hover:text-red-600 hover:bg-red-50'}`}
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
                <span className={`text-[9px] font-bold ${isSelected ? 'text-white/80' : 'text-coffee-400'}`}>
                  {itemCounts} {isAm ? 'ዕቃዎች' : 'items'}
                </span>
              </div>
            )
          })}

          <form onSubmit={handleCreateCategory} className="bg-cream-50/50 rounded-xl border border-dashed border-cream-300 p-2 flex flex-col justify-center gap-2 min-h-[85px]">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={isAm ? '+ አዲስ ምድብ...' : '+ New Category...'}
              className="px-2 py-1 text-[11px] text-center bg-white rounded-lg border border-cream-200 outline-none font-bold text-coffee-950"
            />
            <button type="submit" className="bg-coffee-800 text-white text-[10px] py-1 rounded-lg font-black uppercase tracking-wider hover:bg-coffee-900">
              {isAm ? 'ፍጠር' : 'Create'}
            </button>
          </form>
        </div>
      </div>

      {/* Product Mutation Container */}
      <div className="bg-white rounded-2xl border border-cream-200 p-4 space-y-4 shadow-sm">
        <ProductForm 
          isAm={isAm} 
          selectedCategory={selectedCategory} 
          newProductName={newProductName}
          setNewProductName={setNewProductName}
          bonoPrices={bonoPrices}
          handleApplyBonoPricing={handleApplyBonoPricing}
          handleCreateProduct={handleCreateProduct}
        />

        <ProductList 
          products={products}
          setProducts={setProducts}
          selectedCategory={selectedCategory}
          isAm={isAm}
          supabase={supabase}
        />
      </div>

    </div>
  )
}