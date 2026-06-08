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

'use client'

import { useState } from 'react'
import { ShoppingBag, Plus, Trash2 } from 'lucide-react'
import { TemplateProduct } from '../../lib/onboarding/categoryTemplates'

interface ProductsStepProps {
  isAm: boolean;
  categories: string[];
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
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || '')

  const updateProductValue = (index: number, key: keyof TemplateProduct, value: string | number) => {
    const updated = [...products]
    updated[index] = { ...updated[index], [key]: value }
    setProducts(updated)
  }

  const handleBonoChange = (categoryName: string, flatPrice: number) => {
    setBonoPrices(prev => ({ ...prev, [categoryName]: flatPrice }))
    
    const updatedProducts = products.map((prod) => {
      const isMatch = isAm 
        ? prod.categoryAm === categoryName 
        : prod.categoryEn === categoryName

      if (isMatch) {
        return { ...prod, sell: flatPrice }
      }
      return prod
    })
    setProducts(updatedProducts)
  }

  // Handle adding a brand new custom product inline
  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !selectedCategory) return

    const fallbackCategory = categories[0] || ''
    const activeCategory = selectedCategory || fallbackCategory

    const freshProduct: TemplateProduct = {
      nameEn: newItemName.trim(),
      nameAm: newItemName.trim(), // Keep uniform translation safe during setup
      categoryEn: activeCategory,
      categoryAm: activeCategory,
      cost: 0,
      sell: bonoPrices[activeCategory] || 0
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
                <option key={cat} value={cat}>{cat}</option>
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
          const matchingProducts = (products || []).filter(p => 
            isAm ? p.categoryAm === cat : p.categoryEn === cat
          )

          return (
            <div key={cat} className="space-y-2 bg-white p-3 rounded-xl border border-[#2B1E1A]/5 shadow-sm">
              
              {/* Category Bar Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#2B1E1A]/5 gap-2">
                <span className="font-extrabold text-sm text-[#8B2635] tracking-tight truncate uppercase">
                  📁 {cat}
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
                      value={bonoPrices[cat] || ''}
                      onChange={(e) => handleBonoChange(cat, Number(e.target.value))}
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
                    // Match unique record using fallback indicators securely
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
                              value={isAm ? prod.nameAm : prod.nameEn}
                              onChange={(e) => updateProductValue(originalIndex, isAm ? 'nameAm' : 'nameEn', e.target.value)}
                              className="font-bold text-xs text-[#2B1E1A] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#8B2635] outline-none w-full py-0.5 truncate transition-colors"
                            />
                            
                            {/* Buying Cost Parameter Field */}
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <span>{isAm ? 'የመግዣ ዋጋ (ከርክብ):' : 'Buying Cost:'}</span>
                              <input 
                                type="number" 
                                value={prod.cost || 0}
                                onChange={(e) => updateProductValue(originalIndex, 'cost', Number(e.target.value))}
                                className="w-14 bg-transparent border-b border-gray-200 focus:border-gray-400 font-bold text-left text-gray-600 outline-none px-0.5"
                              />
                              <span>ETB</span>
                            </div>
                          </div>
                        </div>

                        {/* Public Selling Price Box Context */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-[9px] font-bold text-[#8B2635] uppercase tracking-wide">
                            {isAm ? 'መሸጫ ዋጋ' : 'Selling Price'}
                          </span>
                          <div className="relative flex items-center max-w-[100px]">
                            <input
                              type="number"
                              value={prod.sell || 0}
                              onChange={(e) => updateProductValue(originalIndex, 'sell', Number(e.target.value))}
                              className="w-full text-right pr-8 pl-2 py-1.5 text-xs font-extrabold text-[#8B2635] bg-[#8B2635]/5 rounded-lg border border-transparent focus:border-[#8B2635] focus:bg-white transition-all outline-none"
                            />
                            <span className="absolute right-2 text-[10px] font-extrabold text-[#8B2635]/70 pointer-events-none">
                              ETB
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

      {/* Lower Wizard Actions Panel Controls */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="w-1/3 py-3.5 font-bold text-sm rounded-xl text-[#7A6A67] hover:bg-gray-100 transition-colors"
          >
            {isAm ? 'ወደ ኋላ' : 'Back'}
          </button>
          <button 
            type="button"
            onClick={onNext}
            className="w-2/3 py-3.5 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            {isAm ? 'ለመጨረሻ ክለሳ ➔' : 'Review Setup ➔'}
          </button>
        </div>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-center text-[#7A6A67] hover:text-[#2B1E1A] font-bold underline underline-offset-2 mt-1"
          >
            {isAm ? 'ይህንን ደረጃ እለፍና በቀጥታ ወደ ዳሽቦርድ ሂድ' : 'Skip setup and go directly to dashboard'}
          </button>
        )}
      </div>

    </div>
  )
}