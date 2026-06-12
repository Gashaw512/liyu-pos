// 'use client'

// import { Layers, FolderCheck } from 'lucide-react'

// interface CategoriesStepProps {
//   isAm: boolean;
//   businessType: string;
//   categories: string[];
//   onNext: () => void;
//   onBack: () => void;
// }

// export default function CategoriesStep({ isAm, businessType, categories, onNext, onBack }: CategoriesStepProps) {
//   return (
//     <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-6 animate-fadeIn">
//       <div className="text-center space-y-1">
//         <div className="w-12 h-12 rounded-full bg-[#8B2635]/10 flex items-center justify-center mx-auto text-[#8B2635]">
//           <Layers className="w-6 h-6" />
//         </div>
//         <h2 className="text-xl font-bold text-[#2B1E1A]">
//           {isAm ? 'የሽያጭ መድቦች' : 'Product Categories'}
//         </h2>
//         <p className="text-sm text-[#7A6A67]">
//           {isAm 
//             ? 'በምዝገባ ወቅት በመረጡት የስራ ዘርፍ መሰረት እነዚህን የመሸጫ ምድቦች አዘጋጅተናል' 
//             : 'Based on your business type, we automatically built these groups for you'}
//         </p>
//       </div>

//       {/* Visual Badge Grid Display */}
//       <div className="bg-[#F7F4EB] p-4 rounded-2xl border border-[#2B1E1A]/5">
//         <div className="flex items-center gap-2 text-xs font-bold text-[#7A6A67] mb-3 uppercase tracking-wide">
//           <FolderCheck className="w-4 h-4 text-[#E2A03F]" />
//           {isAm ? 'የተዘጋጁ ዋና ክፍሎች' : 'Automated Groups Layout'}
//         </div>
        
//         <div className="flex flex-wrap gap-2">
//           {categories.map((cat, idx) => (
//             <span 
//               key={idx}
//               className="bg-white text-sm font-bold text-[#2B1E1A] px-3.5 py-2 rounded-xl border border-[#2B1E1A]/10 shadow-sm flex items-center gap-1.5"
//             >
//               <span className="w-1.5 h-1.5 rounded-full bg-[#8B2635]" />
//               {cat}
//             </span>
//           ))}
//         </div>
//       </div>

//       <p className="text-xs text-center text-[#7A6A67] italic">
//         💡 {isAm ? 'ማሳሰቢያ፦ የራስዎን አዳዲስ ምድቦች በፈለጉት ጊዜ በዳሽቦርድዎ ላይ ማከል ይችላሉ።' : 'Note: You can add or modify your categories anytime directly inside your dashboard.'}
//       </p>

//       {/* Navigation Buttons */}
//       <div className="flex gap-3 pt-2">
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
//           {isAm ? 'ምርቶችን አሳይ ➔' : 'View Products ➔'}
//         </button>
//       </div>
//     </div>
//   )
// }

// src/components/categories,tsx

'use client'

import { useState } from 'react'
import { Layers, Plus, X } from 'lucide-react'

interface CategoriesStepProps {
  isAm: boolean;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export default function CategoriesStep({ 
  isAm, 
  categories, 
  setCategories, 
  onNext, 
  onBack,
  onSkip
}: CategoriesStepProps) {
  const [newCat, setNewCat] = useState('')

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCat.trim()
    if (!trimmed) return
    
    if (!categories.includes(trimmed)) {
      setCategories([...categories, trimmed])
    }
    setNewCat('')
  }

  const handleRemoveCategory = (target: string) => {
    setCategories(categories.filter(cat => cat !== target))
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-6 animate-fadeIn">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-[#8B2635]/10 flex items-center justify-center mx-auto text-[#8B2635]">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#2B1E1A]">
          {isAm ? 'የምርት ምድቦች ማስተካከያ' : 'Customize Product Categories'}
        </h2>
        <p className="text-sm text-[#7A6A67]">
          {isAm 
            ? 'ምርቶችዎን በቡድን የሚከፋፍሉባቸውን ምድቦች እዚህ ይጨምሩ ወይም ይቀንሱ' 
            : 'Add or remove categories to organize your store inventory items'}
        </p>
      </div>

      <form onSubmit={handleAddCategory} className="flex gap-2">
        <input
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder={isAm ? 'ምሳሌ፡ ረቂቅ ቢራ፣ መክሰስ፣ ለስላሳ...' : 'e.g., Draught Beer, Snacks, Soft Drinks...'}
          className="flex-1 px-4 text-sm bg-[#F7F4EB]/60 rounded-xl border border-[#2B1E1A]/15 outline-none focus:border-[#8B2635] focus:bg-white min-h-[48px] font-medium"
        />
        <button
          type="submit"
          className="bg-[#8B2635] text-white p-3 rounded-xl hover:bg-[#7a1f2d] transition-colors flex items-center justify-center min-w-[48px]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="bg-[#F7F4EB]/50 p-4 rounded-2xl border border-[#2B1E1A]/5 min-h-[120px]">
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <p className="text-xs text-[#7A6A67]/70 font-medium italic m-auto pt-6 text-center w-full">
              {isAm ? 'ምንም የምርት ምድብ አልተመረጠም። እባክዎ ከላይ ይጨምሩ።' : 'No categories created yet. Add one above!'}
            </p>
          ) : (
            categories.map((cat, idx) => (
              <span 
                key={idx}
                className="bg-white text-sm font-bold text-[#2B1E1A] pl-3.5 pr-2 py-1.5 rounded-xl border border-[#2B1E1A]/10 shadow-sm flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B2635]" />
                {cat}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="p-0.5 rounded-md text-[#7A6A67] hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
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
            disabled={categories.length === 0}
            onClick={onNext}
            className="w-2/3 py-3.5 bg-[#8B2635] hover:bg-[#7a1f2d] disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            {isAm ? 'ምርቶችን አሳይ ➔' : 'View Products ➔'}
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