'use client'

import { useState } from 'react'
import { PartyPopper, Coins, ArrowRight, Loader2 } from 'lucide-react'

interface SuccessStepProps {
  isAm: boolean;
  onFinalize: (openingFloat: number) => void;
}

export default function SuccessStep({ isAm, onFinalize }: SuccessStepProps) {
  const [cashFloat, setCashFloat] = useState<string>('1000')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = () => {
    setSubmitting(true)
    const floatNum = parseFloat(cashFloat) || 0
    onFinalize(floatNum)
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-[#2B1E1A]/10 overflow-hidden animate-fadeIn">
      {/* Celebration Header */}
      <div className="bg-emerald-600 px-6 py-8 text-center text-white space-y-2">
        <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto animate-bounce">
          <PartyPopper className="w-8 h-8 text-[#E2A03F]" />
        </div>
        <h1 className="font-bold text-2xl">{isAm ? 'እንኳን ደስ አለዎት!' : 'Setup Complete!'}</h1>
        <p className="text-white/90 text-sm font-medium">
          {isAm ? 'የሽያጭ ቦታዎ እና ኢንቬንቶሪዎ አሁን ዝግጁ ነው' : 'Your workspace and inventory are fully loaded'}
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Open Shift Context Frame */}
        <div className="bg-[#F7F4EB] p-4 rounded-2xl border border-emerald-500/20 text-center space-y-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
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
              value={cashFloat}
              onChange={(e) => setCashFloat(e.target.value)}
              placeholder="0.00"
              className="w-full text-center font-bold text-xl text-[#2B1E1A] py-2 px-3 bg-white border border-[#2B1E1A]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
            />
            <span className="absolute right-3 top-2.5 font-bold text-xs text-[#7A6A67]">ETB</span>
          </div>
        </div>

        {/* Master Trigger Triggering Redirect Sequences */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-base"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {isAm ? 'ፈረቃ ክፈትና ሽያጭ ጀምር' : 'Open Shift & Start Selling'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}