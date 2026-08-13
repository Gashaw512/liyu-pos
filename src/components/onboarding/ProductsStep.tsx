// 'use client'

// import { ShoppingBag } from 'lucide-react'
// import { TemplateProduct } from '../../lib/onboarding/categoryTemplates'

// interface ProductsStepProps {
//   isAm: boolean;
//   products: TemplateProduct[];
//   onNext: () => void;
//   onBack: () => void;
// }

// export default function ProductsStep({ isAm, products, onNext, onBack }: ProductsStepProps) {
//   return (
//     <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-5 animate-fadeIn">
//       <div className="text-center space-y-1">
//         <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto text-green-600">
//           <ShoppingBag className="w-6 h-6" />
//         </div>
//         <h2 className="text-xl font-bold text-[#2B1E1A]">
//           {isAm ? 'የመጀመሪያ ምርቶች' : 'Starter Products'}
//         </h2>
//         <p className="text-sm text-[#7A6A67]">
//           {isAm 
//             ? 'ወዲያውኑ መሸጥ እንዲችሉ የተዘጋጁ መነሻ እቃዎች' 
//             : 'Preloaded sample products to help you test and sell immediately'}
//         </p>
//       </div>

//       {/* Simplified, Clean List Layout */}
//       <div className="border border-[#2B1E1A]/10 rounded-2xl max-h-64 overflow-y-auto divide-y divide-[#2B1E1A]/5">
//         {products.map((prod, idx) => (
//           <div key={idx} className="p-3 flex justify-between items-center bg-white hover:bg-[#F7F4EB]/30 transition-colors">
//             <div>
//               <div className="font-bold text-sm text-[#2B1E1A]">
//                 {isAm ? prod.nameAm : prod.nameEn}
//               </div>
//               <div className="text-[11px] font-medium text-[#7A6A67] bg-[#F7F4EB] px-2 py-0.5 rounded-md inline-block mt-0.5">
//                 {isAm ? prod.categoryAm : prod.categoryEn}
//               </div>
//             </div>
            
//             {/* Visual Price Pill */}
//             <div className="text-right">
//               <span className="text-xs font-bold text-[#8B2635] bg-[#8B2635]/10 px-2.5 py-1 rounded-lg">
//                 {prod.sell} ETB
//               </span>
//               <div className="text-[10px] text-[#7A6A67] font-medium mt-1">
//                 {isAm ? `መግዣ: ${prod.cost}` : `Cost: ${prod.cost}`}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Navigation Buttons */}
//       <div className="flex gap-3 pt-1">
//         <button 
//           onClick={onBack}
//           className="w-1/3 py-3.5 font-bold text-sm rounded-xl text-[#7A6A67] hover:bg-gray-100 transition-colors"
//         >
//           {isAm ? 'ወደ ኋላ' : 'Back'}
//         </button>
//         <button 
//           onClick={onNext}
//           className="w-2/3 py-3.5 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99]"
//         >
//           {isAm ? 'ለመጨረሻ ክለሳ ➔' : 'Review Setup ➔'}
//         </button>
//       </div>
//     </div>
//   )
// }

// src/components/productStep
'use client'

import { useState } from 'react'
import { ShoppingBag, Plus, Trash2 } from 'lucide-react'
// 🌟 Pointing directly to your unified enterprise contracts file
import { TemplateProduct, TemplateCategory } from '../../lib/onboarding/templates'

interface ProductsStepProps {
  isAm: boolean;
  categories: TemplateCategory[]; // 🌟 Refactored to pass down full structured objects
  products: TemplateProduct[];
  setProducts: React.Dispatch<React.SetStateAction<TemplateProduct[]>>;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export default function ProductsStep({ 
  isAm, 
  categories = [], 
  products = [], 
  setProducts, 
  onNext, 
  onBack,
  onSkip
}: ProductsStepProps) {

  const [bonoPrices, setBonoPrices] = useState<Record<string, number>>({})
  
  // States for adding a brand new custom item
  const [newItemName, setNewItemName] = useState('')
  // Default selection tracking utilizes the English database master index 'name'
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name || '')

  const updateProductValue = (index: number, key: keyof TemplateProduct, value: string | number | boolean) => {
    const updated = [...products]
    updated[index] = { ...updated[index], [key]: value }
    setProducts(updated)
  }

  const handleBonoChange = (categoryIndexName: string, flatPrice: number) => {
    setBonoPrices(prev => ({ ...prev, [categoryIndexName]: flatPrice }))
    
    const updatedProducts = products.map((prod) => {
      // 🌟 Matches relationship using the master category relational anchor index
      if (prod.category_name === categoryIndexName) {
        return { ...prod, retail_price: flatPrice }
      }
      return prod
    })
    setProducts(updatedProducts)
  }

  // Handle adding a brand new custom product inline
  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !selectedCategory) return

    const fallbackCategory = categories[0]?.name || ''
    const activeCategory = selectedCategory || fallbackCategory

    // 🌟 Uses structural fields specified in your contracts schema
    const freshProduct: TemplateProduct = {
      name: newItemName.trim(),
      name_am: newItemName.trim(), 
      cost_price: 0,
      retail_price: bonoPrices[activeCategory] || 0,
      unit_type: 'piece', // Defaults safely to literal string domain limit
      low_stock_alert: 0,
      track_inventory: false,
      category_name: activeCategory
    }

    setProducts(prev => [freshProduct, ...prev])
    setNewItemName('')
  }

  // Handle removing a starter or custom product
  const handleRemoveProduct = (indexToRemove: number) => {
    setProducts(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

    return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-5 animate-fadeIn">
      
      {/* Header Info Banner */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600">
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

      {/* ── HIGHLY VISUAL QUICK-ADD PRODUCT INLINE CARD ── */}
      <form 
        onSubmit={handleAddCustomProduct} 
        className="bg-[#F7F4EB]/80 p-3 rounded-2xl border border-[#E2A03F]/20 flex flex-col gap-2 sm:flex-row shadow-sm"
      >
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={isAm ? 'የአዲስ ምርት ስም (ምሳ፣ መጠጥ፣ ቁርስ...)' : 'Type new product name...'}
          className="flex-1 px-3 py-2 text-sm bg-white rounded-xl border border-[#2B1E1A]/15 outline-none focus:border-[#8B2635] font-semibold text-[#2B1E1A]"
        />
        
        <div className="flex gap-2">
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-[#2B1E1A]/15 outline-none font-bold text-[#2B1E1A] max-w-[140px] truncate"
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
            className="flex-1 sm:flex-none bg-[#8B2635] hover:bg-[#7a1f2d] text-white px-4 py-2 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {isAm ? 'ጨምር' : 'Add Item'}
          </button>
        </div>
      </form>

      {/* Dynamic Products Category Lists */}
      <div className="space-y-6 max-h-[340px] overflow-y-auto pr-1 border border-[#2B1E1A]/10 p-3 rounded-2xl bg-slate-50/50">
        {(categories || []).map((cat) => {
          // Relates directly to product relational anchor schema
          const matchingProducts = (products || []).filter(p => p.category_name === cat.name)

          return (
            <div key={cat.name} className="space-y-2 bg-white p-3 rounded-xl border border-[#2B1E1A]/5 shadow-sm">
              
              {/* Category Bar Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#2B1E1A]/5 gap-2">
                <span className="font-extrabold text-sm text-[#8B2635] tracking-tight truncate uppercase">
                  {cat.icon || '📁'} {isAm ? cat.name_am : cat.name}
                </span>
                
                {/* Global Category Bono Pricing Container */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-[#7A6A67]">
                    {isAm ? 'የጋራ ዋጋ (የቦኖ ዋጋ):' : 'All Same Price (Bono):'}
                  </span>
                  <div className="relative flex items-center max-w-[95px]">
                    <input 
                      type="number"
                      placeholder="0"
                      value={bonoPrices[cat.name] || ''}
                      onChange={(e) => handleBonoChange(cat.name, Number(e.target.value))}
                      className="w-full text-right pr-8 pl-2 py-1 text-xs font-bold bg-[#E2A03F]/10 text-[#2B1E1A] rounded-md border border-[#E2A03F]/30 outline-none focus:bg-white"
                    />
                    <span className="absolute right-1.5 text-[9px] font-bold text-[#7A6A67]">ETB</span>
                  </div>
                </div>
              </div>

              {/* Rows Table List inside current category */}
              <div className="divide-y divide-gray-100">
                {matchingProducts.length === 0 ? (
                  <div className="text-[11px] text-gray-400 italic py-3 text-center">
                    {isAm ? 'በዚህ ምድብ ስር ምንም ምርት የለም' : 'No items under this category yet'}
                  </div>
                ) : (
                  matchingProducts.map((prod) => {
                    const originalIndex = products.findIndex(p => p === prod)
                    if (originalIndex === -1) return null

                    return (
                      <div key={originalIndex} className="py-2.5 flex items-center justify-between gap-3 group">
                        
                        {/* Name Input field + Trash Delete Button Wrapper */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(originalIndex)}
                            className="text-gray-300 hover:text-red-600 p-1 rounded transition-colors"
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
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                              Unit: {prod.unit_type}
                            </div>
                          </div>
                        </div>

                        {/* Buying and Selling Prices Configuration */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Cost Price */}
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-gray-400 font-bold">{isAm ? 'መግዣ' : 'Cost'}</span>
                            <div className="relative flex items-center max-w-[75px]">
                              <input 
                                type="number"
                                value={prod.cost_price || ''}
                                onChange={(e) => updateProductValue(originalIndex, 'cost_price', Number(e.target.value))}
                                className="w-full text-right pr-1 pl-1 py-0.5 text-xs font-semibold bg-gray-50 rounded border border-gray-200 outline-none"
                              />
                            </div>
                          </div>

                          {/* Retail Price */}
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-emerald-600 font-bold">{isAm ? 'መሸጫ' : 'Sell'}</span>
                            <div className="relative flex items-center max-w-[80px]">
                              <input 
                                type="number"
                                value={prod.retail_price || ''}
                                onChange={(e) => updateProductValue(originalIndex, 'retail_price', Number(e.target.value))}
                                className="w-full text-right pr-1 pl-1 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200 outline-none"
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

      {/* Navigation Footer Action Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2B1E1A]/5 text-xs">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 font-bold text-[#7A6A67] hover:text-[#2B1E1A] transition-colors"
        >
          {isAm ? 'ተመለስ' : 'Back'}
        </button>

        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isAm ? 'ዝለል' : 'Skip All'}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="bg-[#2B1E1A] hover:bg-[#1f1512] text-white px-5 py-2 rounded-xl font-bold transition-colors shadow-sm"
          >
            {isAm ? 'ቀጥል' : 'Continue'}
          </button>
        </div>
      </div>

    </div>
  )
}

