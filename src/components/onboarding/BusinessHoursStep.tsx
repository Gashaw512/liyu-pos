'use client'

import { Clock, Sun, Moon } from 'lucide-react'

interface HoursStepProps {
  isAm: boolean;
  openTime: string;
  setOpenTime: (t: string) => void;
  closeTime: string;
  setCloseTime: (t: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function BusinessHoursStep({ isAm, openTime, setOpenTime, closeTime, setCloseTime, onNext, onBack }: HoursStepProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 p-6 space-y-6 animate-fadeIn">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-[#E2A03F]/10 flex items-center justify-center mx-auto text-[#E2A03F]">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#2B1E1A]">
          {isAm ? 'የስራ ሰዓት ማስተካከያ' : 'Business Hours'}
        </h2>
        <p className="text-sm text-[#7A6A67]">
          {isAm ? 'ፎርም እና ሪፖርቶች እንዲስተካከሉ የእለት ተእለት መክፈቻና መዝጊያ ሰዓት ይምረጡ' : 'Select standard times when your business opens and closes'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Opening Box */}
        <div className="bg-[#F7F4EB] p-4 rounded-2xl border border-[#E2A03F]/20 space-y-2">
          <label className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#7A6A67]">
            <Sun className="w-4 h-4 text-[#E2A03F]" />
            {isAm ? 'የመክፈቻ ሰዓት' : 'Opening Time'}
          </label>
          <input 
            type="time" 
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="w-full bg-white font-bold text-lg text-[#2B1E1A] p-2.5 rounded-xl border border-[#2B1E1A]/10 focus:outline-none focus:ring-2 focus:ring-[#8B2635]"
          />
        </div>

        {/* Closing Box */}
        <div className="bg-[#F7F4EB] p-4 rounded-2xl border border-[#E2A03F]/20 space-y-2">
          <label className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#7A6A67]">
            <Moon className="w-4 h-4 text-indigo-600" />
            {isAm ? 'የመዝጊያ ሰዓት' : 'Closing Time'}
          </label>
          <input 
            type="time" 
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="w-full bg-white font-bold text-lg text-[#2B1E1A] p-2.5 rounded-xl border border-[#2B1E1A]/10 focus:outline-none focus:ring-2 focus:ring-[#8B2635]"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
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
          {isAm ? 'ቀጥል ➔' : 'Continue ➔'}
        </button>
      </div>
    </div>
  )
}