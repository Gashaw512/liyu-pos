// 'use client'

// import { ClipboardCheck, Loader2 } from 'lucide-react'

// interface ReviewStepProps {
//   isAm: boolean;
//   businessName: string;
//   businessType: string;
//   openTime: string;
//   closeTime: string;
//   categoriesCount: number;
//   productsCount: number;
//   isSaving: boolean;
//   onSave: () => void;
//   onBack: () => void;
// }

// export default function ReviewStep({
//   isAm,
//   businessName,
//   businessType,
//   openTime,
//   closeTime,
//   categoriesCount,
//   productsCount,
//   isSaving,
//   onSave,
//   onBack
// }: ReviewStepProps) {
//   return (
//     <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-6 animate-fadeIn">
//       <div className="text-center space-y-1">
//         <div className="w-12 h-12 rounded-full bg-[#E2A03F]/10 flex items-center justify-center mx-auto text-[#E2A03F]">
//           <ClipboardCheck className="w-6 h-6" />
//         </div>
//         <h2 className="text-xl font-bold text-[#2B1E1A]">
//           {isAm ? 'መረጃዎን ያረጋግጡ' : 'Confirm Your Setup'}
//         </h2>
//         <p className="text-sm text-[#7A6A67]">
//           {isAm ? 'ሁሉም ነገር ትክክል መሆኑን ካረጋገጡ በኋላ "ጨርስ" የሚለውን ይጫኑ' : 'Verify everything looks correct before launching your workspace'}
//         </p>
//       </div>

//       {/* Plain Summary Table Box */}
//       <div className="bg-[#F7F4EB] rounded-2xl border border-[#2B1E1A]/5 p-4 space-y-3">
//         <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
//           <span className="text-[#7A6A67] font-medium">{isAm ? 'የንግድ ስም' : 'Business Name'}</span>
//           <span className="font-bold text-[#2B1E1A]">{businessName}</span>
//         </div>
//         <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
//           <span className="text-[#7A6A67] font-medium">{isAm ? 'የስራ ዘርፍ' : 'Sector'}</span>
//           <span className="font-bold text-[#2B1E1A] capitalize">{businessType.replace('_', ' ')}</span>
//         </div>
//         <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
//           <span className="text-[#7A6A67] font-medium">{isAm ? 'የስራ ሰዓት' : 'Hours'}</span>
//           <span className="font-bold text-[#2B1E1A]">{openTime} - {closeTime}</span>
//         </div>
//         <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
//           <span className="text-[#7A6A67] font-medium">{isAm ? 'የምድቦች ብዛት' : 'Total Categories'}</span>
//           <span className="font-bold text-[#8B2635]">{categoriesCount}</span>
//         </div>
//         <div className="flex justify-between items-center text-sm">
//           <span className="text-[#7A6A67] font-medium">{isAm ? 'የምርቶች ብዛት' : 'Total Products'}</span>
//           <span className="font-bold text-[#8B2635]">{productsCount}</span>
//         </div>
//       </div>

//       {/* Interaction Row */}
//       <div className="flex gap-3 pt-2">
//         {!isSaving && (
//           <button 
//             onClick={onBack}
//             className="w-1/3 py-3.5 font-bold text-sm rounded-xl text-[#7A6A67] hover:bg-gray-100 transition-colors"
//           >
//             {isAm ? 'ማስተካከያ' : 'Fix Setup'}
//           </button>
//         )}
//         <button 
//           onClick={onSave}
//           disabled={isSaving}
//           className={`${
//             isSaving ? 'w-full bg-[#8B2635]/80' : 'w-2/3 bg-[#8B2635] hover:bg-[#7a1f2d]'
//           } py-3.5 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2`}
//         >
//           {isSaving ? (
//             <>
//               <Loader2 className="w-5 h-5 animate-spin text-[#E2A03F]" />
//               {isAm ? 'ስርዓቱን እያዘጋጀን ነው...' : 'Building System Layout...'}
//             </>
//           ) : (
//             isAm ? 'አዋቅርና ጨርስ 🚀' : 'Finish & Open 🚀'
//           )}
//         </button>
//       </div>
//     </div>
//   )
// }

'use client'

import { ClipboardCheck, Loader2 } from 'lucide-react'

interface ReviewStepProps {
  isAm: boolean;
  businessName: string;
  businessType: string;
  openTime: string;
  closeTime: string;
  categoriesCount: number;
  productsCount: number;
  isSaving: boolean;
  onSave: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export default function ReviewStep({
  isAm,
  businessName,
  businessType,
  openTime,
  closeTime,
  categoriesCount,
  productsCount,
  isSaving,
  onSave,
  onBack,
  onSkip
}: ReviewStepProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-6 animate-fadeIn">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-[#E2A03F]/10 flex items-center justify-center mx-auto text-[#E2A03F]">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#2B1E1A]">
          {isAm ? 'መረጃዎን ያረጋግጡ' : 'Confirm Your Setup'}
        </h2>
        <p className="text-sm text-[#7A6A67]">
          {isAm ? 'ሁሉም ነገር ትክክል መሆኑን ካረጋገጡ በኋላ "ጨርስ" የሚለውን ይጫኑ' : 'Verify everything looks correct before launching your workspace'}
        </p>
      </div>

      <div className="bg-[#F7F4EB] rounded-2xl border border-[#2B1E1A]/5 p-4 space-y-3">
        <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
          <span className="text-[#7A6A67] font-medium">{isAm ? 'የንግድ ስም' : 'Business Name'}</span>
          <span className="font-bold text-[#2B1E1A]">{businessName}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
          <span className="text-[#7A6A67] font-medium">{isAm ? 'የስራ ዘርፍ' : 'Sector'}</span>
          <span className="font-bold text-[#2B1E1A] capitalize">{businessType.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
          <span className="text-[#7A6A67] font-medium">{isAm ? 'የስራ ሰዓት' : 'Hours'}</span>
          <span className="font-bold text-[#2B1E1A]">{openTime} - {closeTime}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-[#2B1E1A]/5 pb-2">
          <span className="text-[#7A6A67] font-medium">{isAm ? 'የምርት ምድቦች' : 'Product Categories'}</span>
          <span className="font-bold text-[#8B2635]">{categoriesCount}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex flex-col items-start">
            <span className="text-[#7A6A67] font-medium">{isAm ? 'የምርቶች ብዛት' : 'Total Products'}</span>
            <span className="text-[10px] text-emerald-600 font-medium">
              {isAm ? '*በምድብ የተከፋፈሉ' : '*Auto-categorized'}
            </span>
          </div>
          <span className="font-bold text-[#8B2635]">{productsCount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex gap-3">
          {!isSaving && (
            <button 
              onClick={onBack}
              className="w-1/3 py-3.5 font-bold text-sm rounded-xl text-[#7A6A67] hover:bg-gray-100 transition-colors"
            >
              {isAm ? 'ማስተካከያ' : 'Fix Setup'}
            </button>
          )}
          <button 
            onClick={onSave}
            disabled={isSaving}
            className={`${
              isSaving ? 'w-full bg-[#8B2635]/80' : 'w-2/3 bg-[#8B2635] hover:bg-[#7a1f2d]'
            } py-3.5 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#E2A03F]" />
                {isAm ? 'ኢንቬንቶሪውን እያዘጋጀን ነው...' : 'Structuring Inventory Items...'}
              </>
            ) : (
              isAm ? 'አዋቅርና ጨርስ 🚀' : 'Finish & Open 🚀'
            )}
          </button>
        </div>

        {onSkip && !isSaving && (
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