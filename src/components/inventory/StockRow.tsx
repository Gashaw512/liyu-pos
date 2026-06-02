'use client'

interface StockRowProps {
  productName: string;
  category: string;
  currentCount: number;
  onCountChange: (newCount: number) => void;
  isAm: boolean;
}

export default function StockRow({ productName, category, currentCount, onCountChange, isAm }: StockRowProps) {
  return (
    <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between shadow-sm active:bg-slate-50/50 transition-colors">
      <div className="flex flex-col max-w-[50%]">
        <span className="font-bold text-base tracking-tight text-slate-900 truncate">{productName}</span>
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{category}</span>
      </div>

      {/* Large Physical Thumb Stepper Counters */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => onCountChange(Math.max(0, currentCount - 1))}
          className="h-11 w-11 bg-rose-50 text-rose-600 font-black border border-rose-200 rounded-xl text-xl flex items-center justify-center active:scale-90 select-none shadow-sm"
        >
          ー
        </button>
        
        <span className="w-12 text-center font-mono font-black text-xl text-slate-800">
          {currentCount}
        </span>

        <button
          type="button"
          onClick={() => onCountChange(currentCount + 1)}
          className="h-11 w-11 bg-emerald-50 text-emerald-600 font-black border border-emerald-200 rounded-xl text-xl flex items-center justify-center active:scale-90 select-none shadow-sm"
        >
          ＋
        </button>
      </div>
    </div>
  );
}