'use client'

import { Plus } from 'lucide-react'

interface ProductFormProps {
  isAm: boolean;
  selectedCategory: string;
  newProductName: string;
  setNewProductName: (val: string) => void;
  bonoPrices: Record<string, number>;
  handleApplyBonoPricing: (cat: string, price: number) => void;
  handleCreateProduct: (e: React.FormEvent) => void;
}

export function ProductForm({
  isAm,
  selectedCategory,
  newProductName,
  setNewProductName,
  bonoPrices,
  handleApplyBonoPricing,
  handleCreateProduct
}: ProductFormProps) {
  return (
    <>
      <div className="flex items-center justify-between pb-2 border-b border-cream-100">
        <div className="flex items-center gap-2 text-coffee-850">
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

      <form onSubmit={handleCreateProduct} className="bg-cream-50/40 p-2.5 rounded-xl border border-cream-200 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newProductName}
          onChange={(e) => setNewProductName(e.target.value)}
          placeholder={isAm ? 'የአዲስ ዕቃ ስም ያስገቡ (ምሳሌ፡ ፔፕሲ)...' : 'Enter new item title (e.g. Pepsi)...'}
          className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-cream-200 outline-none focus:border-berbere-600 font-bold text-coffee-950"
        />
        <button type="submit" className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-lg transition-colors font-black text-xs flex items-center justify-center gap-1 shadow-sm whitespace-nowrap">
          <Plus className="w-4 h-4 stroke-[3]" />
          {isAm ? 'አዲስ ዕቃ ጨምር' : 'Add Item'}
        </button>
      </form>
    </>
  )
}