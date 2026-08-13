'use client'

import { useMemo } from 'react'
import { Clock, Sun, Moon, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'

interface HoursStepProps {
  isAm: boolean;
  openTime: string;
  setOpenTime: (t: string) => void;
  closeTime: string;
  setCloseTime: (t: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export default function BusinessHoursStep({ 
  isAm, 
  openTime, 
  setOpenTime, 
  closeTime, 
  setCloseTime, 
  onNext, 
  onBack,
  onSkip 
}: HoursStepProps) {
  
  const applyPreset = (open: string, close: string) => {
    setOpenTime(open);
    setCloseTime(close);
  };

  const timeError = useMemo(() => {
    if (!openTime || !closeTime) return null;
    if (openTime === closeTime) {
      return isAm 
        ? 'የመክፈቻ እና የመዝጊያ ሰዓት ተመሳሳይ መሆን አይችሉም' 
        : 'Opening and closing times cannot be identical';
    }
    return null;
  }, [openTime, closeTime, isAm]);

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto bg-white rounded-2xl md:rounded-3xl shadow-xl border border-cream-200 overflow-hidden transition-all">
      
      {/* Header Banner */}
      <div className="bg-[#8B2635] px-6 py-6 text-center text-white relative">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Clock className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </div>
        
        <h2 className="font-black text-xl sm:text-2xl tracking-tight">
          {isAm ? 'የሥራ ሰዓት ማስተካከያ' : 'Business Hours'}
        </h2>
        <p className="text-white/85 mt-1 text-xs sm:text-sm font-bold tracking-wide">
          {isAm ? 'የፈረቃ ስራዎችን እና ሪፖርቶችን ለማስተካከል የመክፈቻና መዝጊያ ሰዓት ይምረጡ' : 'Select standard operating hours for shift and sales reporting'}
        </p>
      </div>

      <div className="p-5 sm:p-7 md:p-9 space-y-6">
        
        {/* Presets */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-coffee-500 block text-center sm:text-left">
            {isAm ? 'ፈጣን ምርጫዎች' : 'Quick Presets'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('08:00', '20:00')}
              className="px-2.5 py-2 rounded-xl text-xs font-bold border border-cream-200 hover:border-[#222222] hover:bg-cream-50 text-coffee-900 transition-all text-center cursor-pointer"
            >
              8:00 - 20:00
              <span className="block text-[10px] text-coffee-400 font-normal">{isAm ? 'መደበኛ' : 'Standard'}</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('06:00', '23:00')}
              className="px-2.5 py-2 rounded-xl text-xs font-bold border border-cream-200 hover:border-[#222222] hover:bg-cream-50 text-coffee-900 transition-all text-center cursor-pointer"
            >
              06:00 - 23:00
              <span className="block text-[10px] text-coffee-400 font-normal">{isAm ? 'ሙሉ ቀን' : 'Extended'}</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('00:00', '23:59')}
              className="px-2.5 py-2 rounded-xl text-xs font-bold border border-cream-200 hover:border-[#222222] hover:bg-cream-50 text-coffee-900 transition-all text-center cursor-pointer"
            >
              24 {isAm ? 'ሰዓት' : 'Hours'}
              <span className="block text-[10px] text-coffee-400 font-normal">{isAm ? 'የማይዘጋ' : 'Continuous'}</span>
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-cream-50/80 p-4 rounded-2xl border border-cream-200 focus-within:border-[#222222] focus-within:ring-2 focus-within:ring-[#222222]/20 transition-all">
            <label className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-coffee-600 mb-2">
              <Sun className="w-4 h-4 text-[#222222]" />
              {isAm ? 'የመክፈቻ ሰዓት' : 'Opening Time'}
            </label>
            <input 
              type="time" 
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="w-full bg-white font-black text-base sm:text-lg text-[#222222] px-3 py-2.5 rounded-xl border border-cream-200 focus:outline-none focus:border-[#222222]"
            />
          </div>

          <div className="bg-cream-50/80 p-4 rounded-2xl border border-cream-200 focus-within:border-[#222222] focus-within:ring-2 focus-within:ring-[#222222]/20 transition-all">
            <label className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-coffee-600 mb-2">
              <Moon className="w-4 h-4 text-[#8B2635]" />
              {isAm ? 'የመዝጊያ ሰዓት' : 'Closing Time'}
            </label>
            <input 
              type="time" 
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full bg-white font-black text-base sm:text-lg text-[#222222] px-3 py-2.5 rounded-xl border border-cream-200 focus:outline-none focus:border-[#222222]"
            />
          </div>
        </div>

        {/* Validation Error */}
        {timeError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{timeError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onBack}
              className="w-1/3 py-3.5 px-4 bg-cream-100 hover:bg-cream-200 text-coffee-700 font-bold rounded-xl transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isAm ? 'ወደ ኋላ' : 'Back'}</span>
            </button>

            <button 
              type="button"
              onClick={onNext}
              disabled={!!timeError}
              className="w-2/3 py-3.5 px-6 bg-[#8B2635] hover:bg-[#7a1f2d] disabled:bg-cream-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-md active:scale-[0.99] transition-all text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isAm ? 'ቀጥል' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2 text-xs font-bold text-coffee-500 hover:text-coffee-900 transition-colors text-center block underline underline-offset-4 cursor-pointer"
            >
              {isAm ? 'ይህንን ደረጃ እለፍና በቀጥታ ወደ ዳሽቦርድ ሂድ' : 'Skip setup and go directly to dashboard'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}