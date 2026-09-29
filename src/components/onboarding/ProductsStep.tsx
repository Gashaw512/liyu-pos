'use client'

import React, { useState } from 'react'
import { ShoppingBag, Plus, Sparkles, Trash2 } from 'lucide-react'
import { TemplateProduct, TemplateCategory } from '../../lib/onboarding/templates'

interface ProductsStepProps {
  isAm: boolean;
  categories?: TemplateCategory[];
  products?: TemplateProduct[];
  starterProducts: TemplateProduct[];
  setProducts: React.Dispatch<React.SetStateAction<TemplateProduct[]>>;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  isSaving: boolean;
}

export default function ProductsStep({ 
  isAm, 
  categories = [], 
  products = [], 
  starterProducts,
  setProducts, 
  onNext, 
  onBack,
  onSkip,
  isSaving,
}: ProductsStepProps) {

  const [bonoPrices, setBonoPrices] = useState<Record<string, string>>({})
  
  // Custom Product Creation Form State
  const [newItemName, setNewItemName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.name || '')
  const availableStarterProducts = starterProducts.filter(
    starterProduct => categories.some(
      category => category.name.trim().toLowerCase() === starterProduct.category_name.trim().toLowerCase(),
    ),
  )
  const remainingStarterProducts = availableStarterProducts.filter(
    starterProduct => !products.some(
      product => product.name.trim().toLowerCase() === starterProduct.name.trim().toLowerCase(),
    ),
  ).length

  // Safely update product properties without corrupting numeric fields into NaN
  const updateProductValue = (
    index: number, 
    key: keyof TemplateProduct, 
    rawVal: string | number | boolean
  ) => {
    setProducts((prev) => {
      const updated = [...prev]
      if (!updated[index]) return prev

      let processedValue = rawVal
      if (key === 'cost_price' || key === 'retail_price') {
        const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal as string)
        processedValue = isNaN(parsed) ? 0 : Math.max(0, parsed)
      }

      updated[index] = { ...updated[index], [key]: processedValue }
      return updated
    })
  }

  // Handle bulk category price override ("Bono")
  const handleBonoChange = (categoryName: string, rawVal: string) => {
    setBonoPrices(prev => ({ ...prev, [categoryName]: rawVal }))
    
    const parsedPrice = Math.max(0, parseFloat(rawVal) || 0)
    
    setProducts(prev => prev.map((prod) => {
      if (prod.category_name === categoryName) {
        return { ...prod, retail_price: parsedPrice }
      }
      return prod
    }))
  }

  // Safely insert brand-new custom item adhering strictly to Supabase schema contracts
  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newItemName.trim()
    if (!trimmedName) return

    const fallbackCategory = categories[0]?.name || 'General'
    const activeCategory = selectedCategory || fallbackCategory
    
    const bonoVal = bonoPrices[activeCategory] 
      ? Math.max(0, parseFloat(bonoPrices[activeCategory]) || 0) 
      : 0

    const freshProduct: TemplateProduct = {
      name: trimmedName,
      name_am: trimmedName, 
      cost_price: 0,
      retail_price: bonoVal,
      unit_type: 'piece',
      low_stock_alert: 5,
      track_inventory: true,
      category_name: activeCategory
    }

    setProducts(prev => [freshProduct, ...prev])
    setNewItemName('')
  }

  const handleRemoveProduct = (indexToRemove: number) => {
    setProducts(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const addStarterProducts = () => {
    setProducts((currentProducts) => {
      const existingNames = new Set(
        currentProducts.map(product => product.name.trim().toLowerCase()),
      )
      const newProducts = availableStarterProducts.filter(
        product => !existingNames.has(product.name.trim().toLowerCase()),
      )

      return [...currentProducts, ...newProducts]
    })
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-5 animate-fadeIn w-full max-w-2xl mx-auto">
      
      {/* Header Banner */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-[#8B2635]/10 flex items-center justify-center mx-auto text-[#8B2635]">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#2B1E1A]">
          {isAm ? 'የምርት እና የዋጋ ማስተካከያ' : 'Products & Price Setup'}
        </h2>
        <p className="text-sm text-[#7A6A67]">
          {isAm 
            ? 'አዳዲስ ምርቶችን ይጨምሩ፣ ወይም የእያንዳንዱን መሸጫ እና መግዣ ዋጋ ያስተካክሉ' 
            : 'Add custom items, or easily update your buying and selling prices below'}
        </p>
      </div>

      <div className="flex flex-col gap-3 border-y border-[#2B1E1A]/10 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
          <div>
            <p className="text-xs font-bold text-[#2B1E1A]">
              {isAm ? 'ምሳሌ ምርቶች አማራጭ ናቸው' : 'Example products are optional'}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-[#7A6A67]">
              {isAm
                ? 'የምሳሌ ስሞችና ዋጋዎች ከተጨመሩ በኋላ እባክዎ ያርትዑ።'
                : 'Examples are added only when you choose; review names and prices before saving.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addStarterProducts}
          disabled={isSaving || remainingStarterProducts === 0}
          className="min-h-10 shrink-0 rounded-lg border border-cream-300 px-3 text-xs font-bold text-coffee-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {remainingStarterProducts === 0
            ? availableStarterProducts.length === 0
              ? isAm ? 'ለተመረጡት ምድቦች ምሳሌ የለም' : 'No examples match selected categories'
              : isAm ? 'ምሳሌዎች ታክለዋል' : 'Examples added'
            : isAm ? 'ምሳሌዎችን ጨምር' : 'Add examples'}
        </button>
      </div>

      {/* Quick Add Custom Item Inline Bar */}
      <form 
        onSubmit={handleAddCustomProduct} 
        className="bg-[#F7F4EB]/80 p-3 rounded-2xl border border-[#2B1E1A]/10 flex flex-col gap-2 sm:flex-row shadow-sm"
      >
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={isAm ? 'የአዲስ ምርት ስም (ምሳ፣ መጠጥ፣ ቁርስ...)' : 'Type new product name...'}
          className="flex-1 px-3 py-2 text-sm bg-white rounded-xl border border-[#2B1E1A]/15 outline-none focus:border-[#8B2635] focus:ring-1 focus:ring-[#8B2635] font-semibold text-[#2B1E1A]"
        />
        
        <div className="flex gap-2">
          {categories.length > 0 && (
            <select
              value={selectedCategory || categories[0]?.name || ''}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-[#2B1E1A]/15 outline-none font-bold text-[#2B1E1A] max-w-[140px] truncate cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {isAm ? cat.name_am : cat.name}
                </option>
              ))}
            </select>
          )}
          
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="flex-1 sm:flex-none bg-[#8B2635] hover:bg-[#7a1f2d] disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {isAm ? 'ጨምር' : 'Add Item'}
          </button>
        </div>
      </form>

      {/* Dynamic Products Category Lists */}
      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 border border-[#2B1E1A]/10 p-3 rounded-2xl bg-[#F7F4EB]/20">
        {(categories || []).map((cat) => {
          const matchingProducts = products.filter(p => p.category_name === cat.name)

          return (
            <div key={cat.name} className="space-y-2 bg-white p-3.5 rounded-xl border border-[#2B1E1A]/10 shadow-sm">
              
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#2B1E1A]/5 gap-2">
                <span className="font-extrabold text-sm text-[#8B2635] tracking-tight truncate uppercase flex items-center gap-1.5">
                  <span>{cat.icon || '📁'}</span> 
                  <span>{isAm ? cat.name_am : cat.name}</span>
                </span>
                
                {/* Global Category "Bono" Pricing Control */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-[#7A6A67]">
                    {isAm ? 'የጋራ ዋጋ (የቦኖ ዋጋ):' : 'All Same Price (Bono):'}
                  </span>
                  <div className="relative flex items-center max-w-[95px]">
                    <input 
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={bonoPrices[cat.name] ?? ''}
                      onChange={(e) => handleBonoChange(cat.name, e.target.value)}
                      className="w-full text-right pr-8 pl-2 py-1 text-xs font-bold bg-[#F7F4EB] text-[#2B1E1A] rounded-md border border-[#2B1E1A]/15 outline-none focus:bg-white focus:border-[#8B2635]"
                    />
                    <span className="absolute right-1.5 text-[9px] font-bold text-[#7A6A67] pointer-events-none">ETB</span>
                  </div>
                </div>
              </div>

              {/* Rows List */}
              <div className="divide-y divide-[#2B1E1A]/5">
                {matchingProducts.length === 0 ? (
                  <div className="text-[11px] text-gray-400 italic py-3 text-center">
                    {isAm ? 'በዚህ ምድብ ስር ምንም ምርት የለም' : 'No items under this category yet'}
                  </div>
                ) : (
                  matchingProducts.map((prod) => {
                    const originalIndex = products.indexOf(prod)
                    if (originalIndex === -1) return null

                    return (
                      <div key={originalIndex} className="py-2.5 flex items-center justify-between gap-3 group">
                        
                        {/* Title & Delete Wrapper */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(originalIndex)}
                            className="text-gray-300 hover:text-[#8B2635] p-1 rounded transition-colors cursor-pointer"
                            title={isAm ? 'ምርቱን ሰርዝ' : 'Delete item'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <input 
                              type="text"
                              value={isAm ? prod.name_am : prod.name}
                              onChange={(e) => updateProductValue(originalIndex, isAm ? 'name_am' : 'name', e.target.value)}
                              className="w-full bg-transparent text-xs font-bold text-[#2B1E1A] border-b border-transparent hover:border-gray-200 focus:border-[#8B2635] outline-none py-0.5"
                            />
                            <div className="text-[10px] text-[#7A6A67] uppercase tracking-wider font-semibold">
                              Unit: {prod.unit_type || 'piece'}
                            </div>
                          </div>
                        </div>

                        {/* Cost and Retail Pricing Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Cost Price */}
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-[#7A6A67] font-bold">{isAm ? 'መግዣ' : 'Cost'}</span>
                            <div className="relative flex items-center max-w-[75px]">
                              <input 
                                type="number"
                                min="0"
                                step="any"
                                value={prod.cost_price === 0 ? '' : prod.cost_price}
                                onChange={(e) => updateProductValue(originalIndex, 'cost_price', e.target.value)}
                                placeholder="0"
                                className="w-full text-right pr-1 pl-1 py-0.5 text-xs font-semibold bg-gray-50 text-[#2B1E1A] rounded border border-gray-200 outline-none focus:bg-white focus:border-[#8B2635]"
                              />
                            </div>
                          </div>

                          {/* Retail Price */}
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-[#8B2635] font-bold">{isAm ? 'መሸጫ' : 'Sell'}</span>
                            <div className="relative flex items-center max-w-[80px]">
                              <input 
                                type="number"
                                min="0"
                                step="any"
                                value={prod.retail_price === 0 ? '' : prod.retail_price}
                                onChange={(e) => updateProductValue(originalIndex, 'retail_price', e.target.value)}
                                placeholder="0"
                                className="w-full text-right pr-1 pl-1 py-0.5 text-xs font-bold bg-[#8B2635]/5 text-[#8B2635] rounded border border-[#8B2635]/20 outline-none focus:bg-white focus:border-[#8B2635]"
                              />
                            </div>
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

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2B1E1A]/10 text-xs">
        <button
          type="button"
          disabled={isSaving}
          onClick={onBack}
          className="px-4 py-2 font-bold text-[#7A6A67] hover:text-[#2B1E1A] transition-colors cursor-pointer"
        >
          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onSkip}
              className="px-4 py-2 font-semibold text-gray-400 hover:text-[#2B1E1A] transition-colors cursor-pointer"
            >
              {isAm ? 'ዝለል' : 'Skip All'}
            </button>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={onNext}
            className="bg-[#2B1E1A] hover:bg-[#1f1512] text-white px-5 py-2.5 rounded-xl font-bold transition-all active:scale-[0.99] shadow-sm cursor-pointer"
          >
            {isAm ? 'ቀጥል' : 'Continue'}
          </button>
        </div>
      </div>

    </div>
  )
}