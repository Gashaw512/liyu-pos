'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Layers, ShoppingBag, ArrowRight } from 'lucide-react'

interface WelcomeStepProps {
  isAm: boolean;
  businessName: string;
  onNext: () => void;
  onSkip?: () => void;
  categoriesCount: number;
  productsCount: number;
  isOnboarding?: boolean;
}

export default function WelcomeStep({ 
  isAm, 
  businessName, 
  onNext, 
  onSkip,
  categoriesCount, 
  productsCount,
  isOnboarding = true
}: WelcomeStepProps) {
  const router = useRouter();

  const handleSkipAction = () => {
    if (onSkip) {
      onSkip();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto bg-white rounded-2xl md:rounded-3xl shadow-xl border border-cream-200 overflow-hidden transition-all">
      {/* Header Banner - Responsive Padding */}
      <div className="bg-[#8B2635] px-6 py-6 md:py-8 text-center text-white relative">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-inner">
          <CheckCircle2 className="w-8 h-8 md:w-9 md:h-9 text-white" />
        </div>
        
        <h1 className="font-black text-xl sm:text-2xl md:text-3xl tracking-tight">
          {isOnboarding 
            ? (isAm ? 'አካውንትዎ በተሳካ ሁኔታ ተፈጥሯል!' : 'Account Created Successfully!')
            : (isAm ? 'የንግድ ማዋቀሪያ መደብ' : 'Business Settings & Setup')}
        </h1>
        
        <p className="text-white/85 mt-1 text-xs md:text-sm font-bold tracking-wide uppercase">
          {isAm ? 'እንኳን ወደ ሊዩ POS በደህና መጡ' : 'Welcome to Liyu POS Workspace'}
        </p>
      </div>

      {/* Main Content Body */}
      <div className="p-5 sm:p-7 md:p-9 space-y-5 md:space-y-6">
        {/* Title / Description */}
        <div className="text-center space-y-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-coffee-950 truncate px-2">
            {businessName || (isAm ? 'የእርስዎ የንግድ ድርጅት' : 'Your Business Enterprise')}
          </h2>
          <p className="text-xs sm:text-sm text-coffee-600 max-w-md mx-auto font-medium leading-relaxed">
            {isOnboarding
              ? (isAm 
                  ? 'ሽያጭ ከመጀመርዎ በፊት እነዚህን 3 ቀላል ነገሮች በጥቂት ሰከንዶች ውስጥ እናዘጋጅ።' 
                  : "Before making your first sale, let's complete 3 quick setup steps.")
              : (isAm
                  ? 'የስራ ሰዓት፣ የምርት ምድቦችን እና እቃዎችን እዚህ ማስተካከል ይችላሉ።'
                  : 'Review or adjust your operational hours, inventory categories, and products.')}
          </p>
        </div>

        {/* Roadmap Cards - Fluid Grid for Larger Screens */}
        <div className="space-y-3">
          
          {/* Step 1: Hours */}
          <div className="flex items-center gap-4 bg-cream-50/80 p-3.5 sm:p-4 rounded-xl md:rounded-2xl border border-cream-200 hover:border-cream-300 transition-colors">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#222222]/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#222222]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-coffee-900 truncate">
                  {isAm ? '1. የሥራ ሰዓት' : '1. Operating Hours'}
                </h3>
                <span className="text-[10px] sm:text-xs font-black uppercase text-coffee-500 bg-white px-2 py-0.5 rounded-full border border-cream-200 shrink-0">
                  {isAm ? 'ሰዓት' : 'Schedule'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-coffee-500 font-medium mt-0.5 truncate">
                {isAm ? 'መደብርዎ የሚከፈትበት እና የሚዘጋበት ሰዓት' : 'Define standard opening and closing times'}
              </p>
            </div>
          </div>

          {/* Step 2: Categories */}
          <div className="flex items-center gap-4 bg-cream-50/80 p-3.5 sm:p-4 rounded-xl md:rounded-2xl border border-cream-200 hover:border-cream-300 transition-colors">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#8B2635]/10 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 md:w-6 md:h-6 text-[#8B2635]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-coffee-900 truncate">
                  {isAm ? '2. የምርት ምድቦች' : '2. Product Categories'}
                </h3>
                <span className="text-[10px] sm:text-xs font-black text-[#8B2635] bg-[#8B2635]/10 px-2 py-0.5 rounded-full shrink-0">
                  {categoriesCount} {isAm ? 'ዝግጁ' : 'ready'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-coffee-500 font-medium mt-0.5 truncate">
                {isAm ? 'ምርቶችዎን በቡድን የሚከፋፍሉበት ማውጫ' : 'Primary categories tailored for your sector'}
              </p>
            </div>
          </div>

          {/* Step 3: Products */}
          <div className="flex items-center gap-4 bg-cream-50/80 p-3.5 sm:p-4 rounded-xl md:rounded-2xl border border-cream-200 hover:border-cream-300 transition-colors">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-coffee-900 truncate">
                  {isAm ? '3. የመነሻ እቃዎች' : '3. Starter Inventory'}
                </h3>
                <span className="text-[10px] sm:text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  {productsCount} {isAm ? 'እቃዎች' : 'items'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-coffee-500 font-medium mt-0.5 truncate">
                {isAm ? 'በየምድባቸው ስር የተደራጁ የሽያጭ እቃዎች' : 'Pre-loaded starter catalog ready to customize'}
              </p>
            </div>
          </div>

        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          <button 
            type="button"
            onClick={onNext}
            className="w-full py-3.5 md:py-4 px-6 bg-[#8B2635] hover:bg-berbere-700 text-white font-black rounded-xl md:rounded-2xl shadow-md active:scale-[0.99] transition-all text-xs sm:text-sm md:text-base tracking-wide flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>
              {isOnboarding
                ? (isAm ? 'ማዋቀር ጀምር' : 'Start Setup Wizard')
                : (isAm ? 'መረጃዎችን አስተካክል' : 'Update Configuration')}
            </span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleSkipAction}
            className="w-full py-2 text-xs sm:text-sm font-bold text-coffee-500 hover:text-coffee-900 transition-colors text-center block underline underline-offset-4 cursor-pointer"
          >
            {isOnboarding 
              ? (isAm ? 'ይህንን ደረጃ እለፍ (በኋላ ዳሽቦርድ ላይ ማስተካከል ይቻላል)' : 'Skip & Configure Later inside Dashboard')
              : (isAm ? 'ወደ ዳሽቦርድ ተመለስ' : 'Return to Dashboard')}
          </button>
        </div>
      </div>
    </div>
  )
}