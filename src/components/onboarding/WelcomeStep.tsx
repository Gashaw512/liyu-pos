// 'use client'

// import { CheckCircle2, Clock, Layers, ShoppingBag } from 'lucide-react'

// interface WelcomeStepProps {
//   isAm: boolean;
//   businessName: string;
//   onNext: () => void;
//   categoriesCount: number;
//   productsCount: number;
// }

// export default function WelcomeStep({ isAm, businessName, onNext, categoriesCount, productsCount }: WelcomeStepProps) {
//   return (
//     <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 overflow-hidden animate-fadeIn">
//       {/* Visual Header Banner */}
//       <div className="bg-[#8B2635] px-6 py-8 text-center text-white">
//         <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
//           <CheckCircle2 className="w-9 h-9 text-[#E2A03F]" />
//         </div>
//         <h1 className="font-bold text-2xl tracking-tight">
//           {isAm ? 'አካውንትዎ ተፈጥሯል!' : 'Account Created!'}
//         </h1>
//         <p className="text-white/85 mt-1 text-sm font-medium">
//           {isAm ? `እንኳን ወደ ሊዩ POS በደህና መጡ` : `Welcome to Liyu POS`}
//         </p>
//       </div>

//       {/* Main Presentation Body */}
//       <div className="p-6 space-y-6">
//         <div className="text-center">
//           <h2 className="text-xl font-bold text-[#2B1E1A]">
//             {businessName || (isAm ? 'የእርስዎ የንግድ ድርጅት' : 'Your Business')}
//           </h2>
//           <p className="text-sm text-[#7A6A67] mt-1">
//             {isAm 
//               ? 'ስራ ከመጀመርዎ በፊት እነዚህን 3 ቀላል ነገሮች በጥቂት ሰከንዶች ውስጥ እናዘጋጅ።' 
//               : "Before selling, let's configure these 3 simple things in just a few seconds."}
//           </p>
//         </div>

//         {/* Visual Roadmap Cards */}
//         <div className="space-y-3">
//           <div className="flex items-center gap-4 bg-[#F7F4EB]/60 p-3.5 rounded-2xl border border-[#2B1E1A]/5">
//             <div className="w-10 h-10 rounded-xl bg-[#E2A03F]/15 flex items-center justify-center shrink-0">
//               <Clock className="w-5 h-5 text-[#E2A03F]" />
//             </div>
//             <div>
//               <h4 className="font-bold text-sm text-[#2B1E1A]">{isAm ? '1. የስራ ሰዓት' : '1. Working Hours'}</h4>
//               <p className="text-xs text-[#7A6A67]">{isAm ? 'መደብርዎ የሚከፈትበት እና የሚዘጋበት' : 'When your store opens and closes'}</p>
//             </div>
//           </div>

//           <div className="flex items-center gap-4 bg-[#F7F4EB]/60 p-3.5 rounded-2xl border border-[#2B1E1A]/5">
//             <div className="w-10 h-10 rounded-xl bg-[#8B2635]/10 flex items-center justify-center shrink-0">
//               <Layers className="w-5 h-5 text-[#8B2635]" />
//             </div>
//             <div>
//               <h4 className="font-bold text-sm text-[#2B1E1A]">
//                 {isAm ? `2. የመሸጫ ምድቦች (${categoriesCount} ዝግጁ)` : `2. Product Categories (${categoriesCount} ready)`}
//               </h4>
//               <p className="text-xs text-[#7A6A67]">{isAm ? 'ምርቶችዎን በቡድን የሚከፋፍሉበት' : 'Groups to organize your items'}</p>
//             </div>
//           </div>

//           <div className="flex items-center gap-4 bg-[#F7F4EB]/60 p-3.5 rounded-2xl border border-[#2B1E1A]/5">
//             <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
//               <ShoppingBag className="w-5 h-5 text-green-600" />
//             </div>
//             <div>
//               <h4 className="font-bold text-sm text-[#2B1E1A]">
//                 {isAm ? `3. መነሻ ምርቶች (${productsCount} እቃዎች)` : `3. Starter Products (${productsCount} items)`}
//               </h4>
//               <p className="text-xs text-[#7A6A67]">{isAm ? 'ለእርስዎ የተዘጋጁ የሽያጭ እቃዎች' : 'Pre-made items ready for immediate sales'}</p>
//             </div>
//           </div>
//         </div>

//         {/* Big Action Button */}
//         <button 
//           onClick={onNext}
//           className="w-full py-4 px-6 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-bold rounded-2xl shadow-md active:scale-[0.99] transition-all text-center text-base"
//         >
//           {isAm ? 'ማዋቀር ጀምር ➔' : 'Start Setup ➔'}
//         </button>

//         <p className="text-xs text-center text-[#7A6A67] font-medium">
//           ⏱️ {isAm ? 'የሚፈጀው ጊዜ፡ ከ2 ደቂቃ በታች' : 'Estimated time: Less than 2 minutes'}
//         </p>
//       </div>
//     </div>
//   )
// }
// ## 🛠️ Complete, Restructured Codebase

// Here is the clean, integrated component stack matching your strict color identity scheme (`#8B2635` Burgundy, `#E2A03F` Amber, and Emerald Green).

// ### 1. `WelcomeStep.tsx`
// ```tsx
'use client'

import { CheckCircle2, Clock, Layers, ShoppingBag } from 'lucide-react'

interface WelcomeStepProps {
  isAm: boolean;
  businessName: string;
  onNext: () => void;
  onSkip?: () => void;
  categoriesCount: number;
  productsCount: number;
}

export default function WelcomeStep({ 
  isAm, 
  businessName, 
  onNext, 
  onSkip,
  categoriesCount, 
  productsCount 
}: WelcomeStepProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 overflow-hidden animate-fadeIn">
      {/* Visual Header Banner */}
      <div className="bg-[#8B2635] px-6 py-8 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-[#E2A03F]" />
        </div>
        <h1 className="font-bold text-2xl tracking-tight">
          {isAm ? 'አካውንትዎ ተፈጥሯል!' : 'Account Created!'}
        </h1>
        <p className="text-white/85 mt-1 text-sm font-medium">
          {isAm ? 'እንኳን ወደ ሊዩ POS በደህና መጡ' : 'Welcome to Liyu POS'}
        </p>
      </div>

      {/* Main Presentation Body */}
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#2B1E1A]">
            {businessName || (isAm ? 'የእርስዎ የንግድ ድርጅት' : 'Your Business')}
          </h2>
          <p className="text-sm text-[#7A6A67] mt-1">
            {isAm 
              ? 'ሽያጭ ከመጀመርዎ በፊት እነዚህን 3 ቀላል ነገሮች በጥቂት ሰከንዶች ውስጥ እናዘጋጅ።' 
              : "Before selling, let's configure these 3 simple steps in just a few seconds."}
          </p>
        </div>

        {/* Visual Roadmap Cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 bg-[#F7F4EB]/60 p-3.5 rounded-2xl border border-[#2B1E1A]/5">
            <div className="w-10 h-10 rounded-xl bg-[#E2A03F]/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#E2A03F]" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#2B1E1A]">{isAm ? '1. የስራ ሰዓት' : '1. Working Hours'}</h4>
              <p className="text-xs text-[#7A6A67]">{isAm ? 'መደብርዎ የሚከፈትበት እና የሚዘጋበት' : 'When your store opens and closes'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#F7F4EB]/60 p-3.5 rounded-2xl border border-[#2B1E1A]/5">
            <div className="w-10 h-10 rounded-xl bg-[#8B2635]/10 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#8B2635]" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#2B1E1A]">
                {isAm ? `2. የምርት ምድቦች (${categoriesCount} ዝግጁ)` : `2. Product Categories (${categoriesCount} ready)`}
              </h4>
              <p className="text-xs text-[#7A6A67]">{isAm ? 'ምርቶችዎን በቡድን የሚከፋፍሉበት ዋና ማውጫ' : 'Primary groups to organize your inventory'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#F7F4EB]/60 p-3.5 rounded-2xl border border-[#2B1E1A]/5">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#2B1E1A]">
                {isAm ? `3. የመነሻ ምርቶች (${productsCount} እቃዎች)` : `3. Starter Products (${productsCount} items)`}
              </h4>
              <p className="text-xs text-[#7A6A67]">
                {isAm ? 'በየምድባቸው ስር በራስ-ሰር የተደራጁ የሽያጭ እቃዎች' : 'Starter items auto-sorted directly under their categories'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          <button 
            onClick={onNext}
            className="w-full py-4 px-6 bg-[#8B2635] hover:bg-[#7a1f2d] text-white font-bold rounded-2xl shadow-md active:scale-[0.99] transition-all text-center text-base"
          >
            {isAm ? 'ማዋቀር ጀምር ➔' : 'Start Setup ➔'}
          </button>

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-2 text-sm font-bold text-[#7A6A67] hover:text-[#2B1E1A] transition-colors text-center block underline underline-offset-4"
            >
              {isAm ? 'ይህንን ደረጃ እለፍ (በኋላ ዳሽቦርድ ላይ ማስተካከል ይቻላል)' : 'Skip & Configure Later inside Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}