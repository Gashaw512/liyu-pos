'use client'

import { useState } from 'react'
import { PartyPopper, Coins, ArrowRight, Loader2 } from 'lucide-react'

interface SuccessStepProps {
  isAm: boolean;
  onFinalize: (openingFloat: number) => Promise<void>;
}

export default function SuccessStep({ isAm, onFinalize }: SuccessStepProps) {
  const [cashFloat, setCashFloat] = useState<string>('1000')
  const [submitting, setSubmitting] = useState<boolean>(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    const floatNum = Math.max(0, parseFloat(cashFloat) || 0)
    try {
      await onFinalize(floatNum)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 overflow-hidden animate-fadeIn w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
      {/* Celebration Header - Swapped to Maroon Brand Palette */}
      <div className="bg-[#8B2635] px-6 py-8 text-center text-white space-y-2">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto animate-bounce shadow-inner">
          <PartyPopper className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-bold text-2xl">{isAm ? 'እንኳን ደስ አለዎት!' : 'Setup Complete!'}</h1>
        <p className="text-white/90 text-sm font-medium">
          {isAm ? 'የስራ ቦታዎ ዝግጁ ነው። ምርቶችን በዳሽቦርድ ላይ ማከል ይችላሉ።' : 'Your workspace is ready. You can add products from the dashboard.'}
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Open Shift Context Frame */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[#F7F4EB] p-5 rounded-2xl border border-[#2B1E1A]/10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#8B2635]/10 text-[#8B2635] flex items-center justify-center mx-auto">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2B1E1A] text-sm">
                {isAm ? 'የመጀመሪያ ስራ ፈረቃዎን ይክፈቱ' : 'Open Your First Shift'}
              </h3>
              <p className="text-xs text-[#7A6A67] mt-0.5">
                {isAm 
                  ? 'ሽያጭ ለመጀመር መሳቢያዎ ውስጥ ያለውን የመነሻ መለወጫ ገንዘብ (ካሽ) ያስገቡ' 
                  : 'To start accepting sales, enter the starting cash float in your register'}
              </p>
            </div>

            {/* Cash Input Control Box */}
            <div className="max-w-xs mx-auto relative mt-2">
              <input 
                type="number"
                min="0"
                step="any"
                value={cashFloat}
                onChange={(e) => setCashFloat(e.target.value)}
                placeholder="0.00"
                className="w-full text-center font-bold text-xl text-[#2B1E1A] py-2.5 px-3 bg-white border border-[#2B1E1A]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B2635] focus:border-transparent transition-all pr-12"
              />
              <span className="absolute right-3.5 top-3.5 font-bold text-xs text-[#7A6A67] pointer-events-none">
                ETB
              </span>
            </div>
          </div>

          {/* Action Button - Brand Maroon */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#8B2635] hover:bg-[#7a1f2d] disabled:opacity-75 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isAm ? 'ፈረቃ ክፈትና ሽያጭ ጀምር' : 'Open Shift & Start Selling'}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}