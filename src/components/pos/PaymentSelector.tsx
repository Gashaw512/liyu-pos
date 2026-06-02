'use client'

import { useState } from 'react';

interface PaymentSelectorProps {
  totalBill: number;
  onConfirmPayment: (split: { cash: number; telebirr: number; cbeBirr: number }) => void;
  isAm: boolean;
}

export default function PaymentSelector({ totalBill, onConfirmPayment, isAm }: PaymentSelectorProps) {
  const [cashAmount, setCashAmount] = useState<number>(totalBill);
  const [telebirrAmount, setTelebirrAmount] = useState<number>(0);

  const handleQuickSplit5050 = () => {
    const half = totalBill / 2;
    setCashAmount(half);
    setTelebirrAmount(half);
  };

  const submitPayment = () => {
    if (cashAmount + telebirrAmount !== totalBill) {
      alert(isAm ? "እባክዎ የክፍያ ድምር እኩል መሆኑን ያረጋግጡ!" : "Total payment split does not match the bill amount!");
      return;
    }
    onConfirmPayment({ cash: cashAmount, telebirr: telebirrAmount, cbeBirr: 0 });
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100 flex flex-col space-y-4 animate-slideUp">
      <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider">
        {isAm ? "የክፍያ ዘዴ ይምረጡ" : "Choose Payment Method"}
      </h3>

      {/* Quick Layout Presets for Uneducated Cashiers */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => { setCashAmount(totalBill); setTelebirrAmount(0); }}
          className={`h-14 rounded-xl border-2 font-black flex flex-col items-center justify-center transition-all ${cashAmount === totalBill ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
        >
          <span>💵 {isAm ? "ሙሉ ጥሬ ገንዘብ" : "All Cash"}</span>
        </button>
        <button 
          onClick={() => { setCashAmount(0); setTelebirrAmount(totalBill); }}
          className={`h-14 rounded-xl border-2 font-black flex flex-col items-center justify-center transition-all ${telebirrAmount === totalBill ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
        >
          <span>📱 {isAm ? "ሙሉ ቴሌቢር" : "All Telebirr"}</span>
        </button>
      </div>

      <button 
        type="button" 
        onClick={handleQuickSplit5050}
        className="text-xs font-bold text-slate-500 bg-slate-100 py-2 rounded-lg hover:bg-slate-200 active:scale-98"
      >
        🌓 {isAm ? "ግማሽ በግማሽ ክፈል (50/50 Split)" : "Quick 50/50 Split"}
      </button>

      {/* Manual Input Overrides */}
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-xs font-black text-slate-400 block mb-1">💵 {isAm ? "ጥሬ ገንዘብ (ETB)" : "Cash Amount"}</label>
          <input 
            type="number" 
            value={cashAmount || ''} 
            onChange={(e) => {
              const val = Number(e.target.value);
              setCashAmount(val);
              setTelebirrAmount(totalBill - val);
            }}
            className="w-full h-12 border-2 border-slate-200 rounded-xl px-3 font-mono font-bold text-lg focus:border-slate-900 focus:outline-none" 
          />
        </div>
        <div>
          <label className="text-xs font-black text-slate-400 block mb-1">📱 Telebirr (ETB)</label>
          <input 
            type="number" 
            value={telebirrAmount || ''} 
            onChange={(e) => {
              const val = Number(e.target.value);
              setTelebirrAmount(val);
              setCashAmount(totalBill - val);
            }}
            className="w-full h-12 border-2 border-slate-200 rounded-xl px-3 font-mono font-bold text-lg focus:border-slate-900 focus:outline-none" 
          />
        </div>
      </div>

      {/* Massive CTA Execution Tap Button */}
      <button
        onClick={submitPayment}
        className="w-full h-14 bg-emerald-600 text-white rounded-xl font-black text-lg active:scale-95 shadow-md shadow-emerald-700/20 mt-2"
      >
        ✅ {isAm ? "ክፍያውን ጨርስ" : "Complete Transaction"} ({totalBill} ETB)
      </button>
    </div>
  );
}