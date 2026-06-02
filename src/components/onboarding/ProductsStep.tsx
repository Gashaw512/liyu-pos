'use client'

import { ShoppingBag } from 'lucide-react'
import { TemplateProduct } from '../../lib/onboarding/categoryTemplates'

interface ProductsStepProps {
  isAm: boolean;
  products: TemplateProduct[];
  onNext: () => void;
  onBack: () => void;
}

export default function ProductsStep({ isAm, products, onNext, onBack }: ProductsStepProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-5 animate-fadeIn">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto text-green-600">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#2B1E1A]">
          {isAm ? 'የመጀመሪያ ምርቶች' : 'Starter Products'}
        </h2>
        <p className="text-sm text-[#7A6A67]">
          {isAm 
            ? 'ወዲያውኑ መሸጥ እንዲችሉ የተዘጋጁ መነሻ እቃዎች' 
            : 'Preloaded sample products to help you test and sell immediately'}
        </p>
      </div>

      {/* Simplified, Clean List Layout */}
      <div className="border border-[#2B1E1A]/10 rounded-2xl max-h-64 overflow-y-auto divide-y divide-[#2B1E1A]/5">
        {products.map((prod, idx) => (
          <div key={idx} className="p-3 flex justify-between items-center bg-white hover:bg-[#F7F4EB]/30 transition-colors">
            <div>
              <div className="font-bold text-sm text-[#2B1E1A]">
                {isAm ? prod.nameAm : prod.nameEn}
              </div>
              <div className="text-[11px] font-medium text-[#7A6A67] bg-[#F7F4EB] px-2 py-0.5 rounded-md inline-block mt-0.5">
                {isAm ? prod.categoryAm : prod.categoryEn}
              </div>
            </div>
            
            {/* Visual Price Pill */}
            <div className="text-right">
              <span className="text-xs font-bold text-[#8B2635] bg-[#8B2635]/10 px-2.5 py-1 rounded-lg">
                {prod.sell} ETB
              </span>
              <div className="text-[10px] text-[#7A6A67] font-medium mt-1">
                {isAm ? `መግዣ: ${prod.cost}` : `Cost: ${prod.cost}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-1">
        <button 
          onClick={onBack}
          className="w-1/3 py-3.5 font-bold text-sm rounded-xl text-[#7A6A67] hover:bg-gray-100 transition-colors"
        >
          {isAm ? 'ወደ ኋላ' : 'Back'}
        </button>
        <button 
          onClick={onNext}
          className="w-2/3 py-3.5 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99]"
        >
          {isAm ? 'ለመጨረሻ ክለሳ ➔' : 'Review Setup ➔'}
        </button>
      </div>
    </div>
  )
}