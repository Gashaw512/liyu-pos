// src/[locale]/(app)/dashboard/inventory/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import createClient from '@/lib/supabase/client'
import {
  ShoppingBag,
  Plus,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Barcode,
  AlertTriangle,
  PackageCheck,
  ArrowDownToLine,
  Boxes
} from 'lucide-react'

// DTOs for the raw Supabase query results
interface RawProductRow {
  id: string;
  name: string | null;
  name_am: string | null;
  cost_price: number | null;
  retail_price: number | null;
  unit_type: string | null;
  barcode: string | null;
  sku: string | null;
  low_stock_alert: number | null;
  track_inventory: boolean | null;
  category_id: string | null;
  categories: { id: string; name: string; name_am: string | null } | { id: string; name: string; name_am: string | null }[] | null;
}

interface RawInventoryRow {
  product_id: string;
  quantity: number | null;
}

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

export default function DedicatedInventoryPage() {
  const params = useParams()
  const supabase = createClient()

  const locale = params?.locale || 'am'
  const isAm = locale === 'am'

  // Component Core Matrices State
  const [categories, setCategories] = useState<string[]>([])
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Control Flow Flags
  const [loading, setLoading] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false)

  // Creation/Modification Buffers
  const [newCategoryName, setNewCategoryName] = useState<string>('')
  const [newProductName, setNewProductName] = useState<string>('')
  const [bonoPrices, setBonoPrices] = useState<Record<string, number>>({})

  // "Receive Stock" Transactional Form State
  const [receiveProductId, setReceiveProductId] = useState<string>('')
  const [receiveQty, setReceiveQty] = useState<number>(0)
  const [receiveUnitCost, setReceiveUnitCost] = useState<number>(0)
  const [supplierName, setSupplierName] = useState<string>('')

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
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .maybeSingle()
        businessId = profileRow?.business_id
      }
      if (!businessId) return

      // 1. Pull core database Categories setup
      const { data: liveCategories, error: catErr } = await supabase
        .from('categories')
        .select('id, name, name_am')
        .eq('business_id', businessId)

      if (catErr) throw catErr
      setDbCategories(liveCategories || [])

      // 2. Query master product definitions with relational inner joins
      const { data: rawProductsData, error: prodError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          name_am,
          cost_price,
          retail_price,
          unit_type,
          barcode,
          sku,
          low_stock_alert,
          track_inventory,
          category_id,
          categories (id, name, name_am)
        `)
        .eq('business_id', businessId)

      if (prodError) throw prodError

      // Type cast the raw product dataset to prevent 'implicit any' errors
      const rawProducts = (rawProductsData as unknown as RawProductRow[]) || []

      // 3. Extract dynamic balances directly from the inventory ledger tables
      const { data: rawInventoryData } = await supabase
        .from('inventory')
        .select('product_id, quantity')
        .eq('business_id', businessId)

      // Type cast the raw inventory dataset
      const rawInventory = (rawInventoryData as unknown as RawInventoryRow[]) || []

      const uniqueProductMap: Record<string, InventoryProduct> = {}

      rawProducts.forEach((p: RawProductRow) => {
        const pNameEn = p.name || ''
        const pNameAm = p.name_am || p.name || ''
        const normalizationKey = `${pNameEn.toLowerCase().trim()}_${pNameAm.toLowerCase().trim()}`

        // Calculate combined totals from all available branches
        const actualStockBalance = rawInventory
          .filter((inv: RawInventoryRow) => inv.product_id === p.id)
          .reduce((sum, item) => sum + (item.quantity || 0), 0)

        // Handle the Supabase category relationship array or object safely
        const joinedCategory = Array.isArray(p.categories)
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

      // Guarantee a string[] output from .map() so .filter() receives strict string items
      const parsedCategoryLabels: string[] = Array.from(
        new Set(
          liveCategories
            .map((c: DbCategory): string => (isAm ? c.name_am || c.name : c.name) || '')
            .filter((name: string) => name.trim().length > 0)
        )
      )

      setProducts(cleanedProductsList)
      setCategories(parsedCategoryLabels.length > 0 ? parsedCategoryLabels : [isAm ? 'መደበኛ' : 'General'])
    } catch (err) {
      console.error('Snapshot matrix synchronization failure:', err)
    } finally {
      setLoading(false)
    }
  }

  // Component JSX continues below...

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
        console.error('Failed pushing category to remote cache:', err)
      }
    }
    setNewCategoryName('')
  }

  const handleDropCategory = async (targetCat: string) => {
    const matchedRow = dbCategories.find(c => c.name === targetCat || c.name_am === targetCat)
    if (!matchedRow) return

    const categoryHasProducts = products.some(p => p.category_id === matchedRow.id)
    if (categoryHasProducts) {
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

  const handleUpdateProductField = (globalIndex: number, key: keyof InventoryProduct, value: any) => {
    setProducts(prev => {
      const copy = [...prev]
      copy[globalIndex] = { ...copy[globalIndex], [key]: value }
      return copy
    })
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

  const handleRemoveProduct = async (globalIndex: number) => {
    const targetProduct = products[globalIndex]
    if (targetProduct.id) {
      if (!confirm(isAm ? 'ይህን ዕቃ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ነዎት?' : 'Confirm permanent removal of this product template?')) return
      await supabase.from('inventory').delete().eq('product_id', targetProduct.id)
      await supabase.from('products').delete().eq('id', targetProduct.id)
    }
    setProducts(prev => prev.filter((_, idx) => idx !== globalIndex))
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

  const handleExecuteStockReceive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiveProductId || receiveQty <= 0) return
    setIsProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      let businessId = user?.user_metadata?.business_id || user?.app_metadata?.business_id
      if (!businessId) return

      const { data: branchRow } = await supabase.from('branches').select('id').eq('business_id', businessId).eq('is_main', true).maybeSingle()
      const branchId = branchRow?.id || null

      // 1. Log the Purchase event transaction
      const { data: purchaseRow, error: pErr } = await supabase
        .from('purchases')
        .insert({
          business_id: businessId,
          branch_id: branchId,
          supplier_name: supplierName || 'Direct Delivery Local',
          total_amount: receiveQty * receiveUnitCost,
          status: 'completed'
        }).select().single()

      if (pErr) throw pErr

      // 2. Insert the Purchase Item reference line
      await supabase.from('purchase_items').insert({
        purchase_id: purchaseRow.id,
        product_id: receiveProductId,
        quantity: receiveQty,
        unit_cost: receiveUnitCost
      })

      // 3. Post a historical trace entry into the Inventory Movements table
      await supabase.from('inventory_movements').insert({
        business_id: businessId,
        branch_id: branchId,
        product_id: receiveProductId,
        quantity: receiveQty,
        movement_type: 'purchase',
        reference_id: purchaseRow.id,
        description: `Restock entry via Master Dashboard Inventory Receive System.`
      })

      // 4. Update the running snapshot total safely
      const { data: existingInv } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('branch_id', branchId)
        .eq('product_id', receiveProductId)
        .maybeSingle()

      if (existingInv) {
        await supabase
          .from('inventory')
          .update({ quantity: Number(existingInv.quantity || 0) + Number(receiveQty) })
          .eq('id', existingInv.id)
      } else {
        await supabase
          .from('inventory')
          .insert({
            business_id: businessId,
            branch_id: branchId,
            product_id: receiveProductId,
            quantity: receiveQty
          })
      }

      alert(isAm ? 'አዲስ ክምችት በተሳካ ሁኔታ ገብቷል!' : 'Inbound stock quantities received cleanly!')
      setShowReceiveModal(false)
      setReceiveQty(0)
      setReceiveUnitCost(0)
      setSupplierName('')
      setReceiveProductId('')
      await fetchInventoryMatrix()
    } catch (err) {
      console.error(err)
      alert('Inbound operation rejected by relational constraint controls.')
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
    <div className="w-full max-w-5xl mx-auto p-4 space-y-5 select-none animate-fadeIn text-coffee-950">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-black tracking-tight flex items-center gap-2 text-coffee-900">
            <Boxes className="w-5 h-5 text-berbere-600" />
            {isAm ? 'የዕቃዎች መቆጣጠሪያ መጋዘን' : 'Core Inventory Master'}
          </h1>
          <p className="text-[11px] font-medium text-coffee-400">
            {isAm ? 'የምርት ምድቦችን፣ ዕቃዎችን እና የመሸጫ/መግዣ የዋጋ ዝርዝር መዝገብ ማስተካከያ' : 'Maintain product configurations, monitor quantities, and enforce flat-rate margins.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowReceiveModal(true)}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 stroke-[3]" />
            {isAm ? 'ዕቃ ተቀበል (Stock In)' : 'Receive Stock'}
          </button>

          <button
            onClick={handleSaveChangeset}
            disabled={isProcessing}
            className="bg-berbere-600 text-white px-5 py-2.5 rounded-xl hover:bg-berbere-700 transition-all font-black text-xs shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {isAm ? 'ለውጦችን አስቀምጥ' : 'Commit Changes'}
          </button>
        </div>
      </div>

      {/* Big Touch-Screen Category Cards Grid */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-coffee-400 pl-1">
          {isAm ? 'ፈጣን የምድብ መምረጫ (Touch Friendly)' : 'Quick Category Selector'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat
            const counts = products.filter(p => isAm ? p.categoryAm === cat : p.categoryEn === cat).length
            return (
              <div
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative flex flex-col justify-between min-h-[85px] active:scale-[0.97] ${isSelected
                  ? 'bg-berbere-600 text-white border-berbere-600 shadow-md ring-2 ring-berbere-200'
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
                  {counts} {isAm ? 'ዕቃዎች' : 'items'}
                </span>
              </div>
            )
          })}

          {/* Inline Touch-friendly Category Inserter */}
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

      {/* Main Ledger Layout Container */}
      <div className="bg-white rounded-2xl border border-cream-200 p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-cream-100">
          <div className="flex items-center gap-2 text-emerald-600">
            <ShoppingBag className="w-4 h-4" />
            <h2 className="font-black text-xs uppercase tracking-wider text-coffee-900">
              {isAm ? `የምርቶች ዝርዝር፡ ${selectedCategory}` : `Products under: ${selectedCategory}`}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-coffee-400">{isAm ? 'የጋራ ቦኖ መሸጫ ዋጋ:' : 'Flat Bono Price:'}</span>
            <div className="relative flex items-center max-w-[90px]">
              <input
                type="number"
                placeholder="0"
                value={bonoPrices[selectedCategory] || ''}
                onChange={(e) => handleApplyBonoPricing(selectedCategory, Number(e.target.value))}
                className="w-full text-right pr-6 pl-2 py-1 text-xs font-black bg-amber-50 text-coffee-950 rounded border border-amber-200 outline-none"
              />
              <span className="absolute right-1 text-[8px] font-bold text-coffee-400">{isAm ? 'ብር' : 'ETB'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Product Injector Toolbar */}
        <form onSubmit={handleCreateProduct} className="bg-cream-50/40 p-2.5 rounded-xl border border-cream-200 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            placeholder={isAm ? 'የአዲስ ዕቃ ስም ያስገቡ (ምሳሌ፡ ሐበሻ ቢራ)...' : 'Enter new item title...'}
            className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
          />
          <button type="submit" className="bg-berbere-600 hover:bg-berbere-700 text-white px-5 py-2 rounded-lg transition-colors font-black text-xs flex items-center justify-center gap-1 shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4 stroke-[3]" />
            {isAm ? 'አዲስ ዕቃ ጨምር' : 'Add Item'}
          </button>
        </form>

        {/* Matrix Listing Interface */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {products.filter(p => isAm ? p.categoryAm === selectedCategory : p.categoryEn === selectedCategory).length === 0 ? (
            <div className="text-xs text-coffee-400 italic py-8 text-center bg-cream-50/30 rounded-xl border border-dashed border-cream-200">
              {isAm ? 'በዚህ ምድብ ስር ምንም ምርት አልተመዘገበም' : 'No items assigned under this category segment.'}
            </div>
          ) : (
            products.map((prod, index) => {
              // Ensure correct relative matching using overall context identifiers
              const currentCategoryMatch = isAm ? prod.categoryAm === selectedCategory : prod.categoryEn === selectedCategory;
              if (!currentCategoryMatch) return null;

              const isLowStock = prod.track_inventory && prod.opening_count <= prod.low_stock_alert

              return (
                <div key={index} className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:shadow-sm ${isLowStock ? 'border-red-200 bg-red-50/10' : 'border-cream-100'}`}>

                  {/* Left Column: Actions and Text Metadata Fields */}
                  <div className="flex-1 min-w-0 flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(index)}
                      className="text-coffee-300 hover:text-red-600 p-1.5 rounded transition-colors mt-0.5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-coffee-400 block uppercase">English Name</label>
                          <input
                            type="text"
                            value={prod.nameEn}
                            onChange={(e) => handleUpdateProductField(index, 'nameEn', e.target.value)}
                            className="font-bold text-xs text-coffee-950 bg-transparent border-b border-cream-100 focus:border-berbere-600 outline-none w-full py-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-coffee-400 block uppercase">የአማርኛ ስም</label>
                          <input
                            type="text"
                            value={prod.nameAm}
                            onChange={(e) => handleUpdateProductField(index, 'nameAm', e.target.value)}
                            className="font-bold text-xs text-coffee-950 bg-transparent border-b border-cream-100 focus:border-berbere-600 outline-none w-full py-0.5"
                          />
                        </div>
                      </div>

                      {/* Technical Line Rows */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px]">
                        <div className="flex items-center gap-1 text-coffee-600">
                          <Barcode className="w-3 h-3 text-coffee-400" />
                          <input
                            type="text"
                            placeholder="Barcode"
                            value={prod.barcode}
                            onChange={(e) => handleUpdateProductField(index, 'barcode', e.target.value)}
                            className="w-20 bg-transparent border-b border-cream-200 font-medium outline-none text-left"
                          />
                        </div>

                        <div className="flex items-center gap-1 text-coffee-600">
                          <span className="text-[9px] font-black text-coffee-400">SKU:</span>
                          <input
                            type="text"
                            placeholder="SKU Code"
                            value={prod.sku}
                            onChange={(e) => handleUpdateProductField(index, 'sku', e.target.value)}
                            className="w-16 bg-transparent border-b border-cream-200 font-medium outline-none text-left"
                          />
                        </div>

                        <div className="flex items-center gap-1 text-coffee-600">
                          <span className="text-[9px] font-black text-coffee-400">{isAm ? 'መለኪያ:' : 'Unit:'}</span>
                          <select
                            value={prod.unit_type}
                            onChange={(e) => handleUpdateProductField(index, 'unit_type', e.target.value)}
                            className="bg-transparent border-b border-cream-200 outline-none font-bold"
                          >
                            <option value="piece">{isAm ? 'ፍሬ (Pcs)' : 'Piece'}</option>
                            <option value="bottle">{isAm ? 'ጠርሙስ' : 'Bottle'}</option>
                            <option value="kg">{isAm ? 'ኪሎ' : 'KG'}</option>
                            <option value="liters">{isAm ? 'ሊትር' : 'Liters'}</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-1 cursor-pointer font-bold text-coffee-500">
                          <input
                            type="checkbox"
                            checked={prod.track_inventory}
                            onChange={(e) => handleUpdateProductField(index, 'track_inventory', e.target.checked)}
                            className="rounded border-cream-300 text-berbere-600 focus:ring-berbere-500 w-3 h-3"
                          />
                          <span>{isAm ? 'ክምችት ይቆጠር' : 'Track Stock'}</span>
                        </label>
                      </div>

                      {/* Financial Info & Metrics */}
                      <div className="text-[10px] text-coffee-400 flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span>{isAm ? 'መነሻ መግዣ ዋጋ:' : 'Base Cost:'}</span>
                          <input
                            type="number"
                            value={prod.cost || 0}
                            onChange={(e) => handleUpdateProductField(index, 'cost', Number(e.target.value))}
                            className="w-14 bg-transparent border-b border-cream-200 font-black text-center text-coffee-700 outline-none"
                          />
                          <span>{isAm ? 'ብር' : 'ETB'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="px-2 py-0.5 rounded bg-coffee-100 text-coffee-700 font-black text-[10px] flex items-center gap-1">
                            <PackageCheck className="w-3 h-3 text-coffee-500" />
                            {isAm ? `አሁን ያለው ክምችት: ${prod.opening_count} ${prod.unit_type === 'piece' ? 'ፍሬ' : prod.unit_type}` : `Live Stock: ${prod.opening_count} ${prod.unit_type}`}
                          </span>
                          {isLowStock && (
                            <span className="text-red-600 animate-pulse flex items-center gap-0.5 text-[9px] font-black">
                              <AlertTriangle className="w-3 h-3" />
                              {isAm ? 'አልቋል!' : 'LOW!'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Fields (Completed) */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-dashed border-cream-100">
                    <div>
                      <label className="text-[8px] font-black text-coffee-400 uppercase tracking-wide block md:text-right">Alert Threshold</label>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-coffee-500">
                        <span>{isAm ? 'ከ' : 'Min:'}</span>
                        <input
                          type="number"
                          value={prod.low_stock_alert}
                          onChange={(e) => handleUpdateProductField(index, 'low_stock_alert', Number(e.target.value))}
                          className="w-8 bg-transparent border-b border-cream-200 text-center font-bold text-coffee-800 outline-none"
                        />
                        <span>{isAm ? 'በታች' : 'units'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-black text-berbere-600 uppercase tracking-wide block">
                        {isAm ? 'መሸጫ ዋጋ' : 'Sell Price'}
                      </span>
                      <div className="relative flex items-center max-w-[95px] mt-0.5">
                        <input
                          type="number"
                          value={prod.sell || 0}
                          onChange={(e) => handleUpdateProductField(index, 'sell', Number(e.target.value))}
                          className="w-full text-right pr-6 pl-1.5 py-1 text-xs font-black bg-cream-50 text-coffee-950 rounded border border-cream-200 outline-none focus:border-berbere-600"
                        />
                        <span className="absolute right-1 text-[8px] font-bold text-coffee-400">{isAm ? 'ብር' : 'ETB'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Complete Receive Stock Transaction Overlay Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl border border-cream-200 p-5 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-cream-100">
              <h3 className="font-black text-sm text-coffee-900 flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                {isAm ? 'አዲስ ገቢ ዕቃ መመዝገቢያ (Stock In)' : 'Receive Inbound Stock'}
              </h3>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 rounded-lg hover:bg-cream-100 text-coffee-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteStockReceive} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black text-coffee-500 uppercase tracking-wide block mb-1">
                  {isAm ? 'ዕቃ ይምረጡ' : 'Select Product'}
                </label>
                <select
                  required
                  value={receiveProductId}
                  onChange={(e) => {
                    setReceiveProductId(e.target.value)
                    const selected = products.find(p => p.id === e.target.value)
                    if (selected) setReceiveUnitCost(selected.cost)
                  }}
                  className="w-full px-3 py-2 text-xs bg-cream-50 rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
                >
                  <option value="">{isAm ? '-- ዕቃ ይምረጡ --' : '-- Choose Product --'}</option>
                  {products.filter(p => p.id).map((p, idx) => (
                    <option key={idx} value={p.id}>{isAm ? p.nameAm : p.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-coffee-500 uppercase tracking-wide block mb-1">
                    {isAm ? 'ብዛት (Quantity)' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiveQty || ''}
                    onChange={(e) => setReceiveQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-cream-50 rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-coffee-500 uppercase tracking-wide block mb-1">
                    {isAm ? 'የአንዱ ዋጋ (Unit Cost)' : 'Unit Cost'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={receiveUnitCost || ''}
                    onChange={(e) => setReceiveUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-cream-50 rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-coffee-500 uppercase tracking-wide block mb-1">
                  {isAm ? 'አቅራቢ (Supplier Name)' : 'Supplier Name'}
                </label>
                <input
                  type="text"
                  placeholder={isAm ? 'የአቅራቢ ድርጅት ስም...' : 'Enter supplier details...'}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-cream-50 rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-cream-200 text-coffee-600 rounded-xl hover:bg-cream-50 text-xs font-bold transition-all"
                >
                  {isAm ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !receiveProductId || receiveQty <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl transition-all font-black text-xs shadow-sm flex items-center gap-1 disabled:opacity-40"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isAm ? 'ክምችት አስገባ' : 'Receive Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}