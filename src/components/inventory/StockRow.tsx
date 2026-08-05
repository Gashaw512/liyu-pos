'use client';

interface StockRowProps {
  productName: string;
  category?: string | null;
  unitType?: string;      // 📦 Added to know IF counting in Kg, Bottle, Pcs etc.
  systemCount?: number;   // 📊 Added to show current system stock baseline
  currentCount: number;
  onCountChange: (newCount: number) => void;
  isAm: boolean;
}

export default function StockRow({ 
  productName, 
  category, 
  unitType = 'pcs', 
  systemCount = 0, 
  currentCount, 
  onCountChange, 
  isAm 
}: StockRowProps) {
  
  const displayCategory = category ?? (isAm ? 'አጠቃላይ' : 'General');
  const variance = currentCount - systemCount;

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm transition-all hover:border-slate-300">
      
      {/* 1. Left Data Panel: Product Information & Baseline Metrics */}
      <div className="flex flex-col space-y-1 max-w-[55%]">
        {/* Product Identity Title */}
        <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
          {productName}
        </h3>
        
        {/* Badges and System Stock Metadata Context */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium">
            {displayCategory}
          </span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{isAm ? 'የነበረው' : 'Expected'}:</span>
            <span className="font-mono font-bold text-slate-700">{systemCount}</span>
            <span className="lowercase text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
              {unitType}
            </span>
          </div>
        </div>

        {/* Real-time Simple Offline Variance Tracker */}
        {currentCount !== systemCount && (
          <div className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${
            variance > 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            <span>{variance > 0 ? '➕' : '➖'}</span>
            <span>
              {Math.abs(variance)} {isAm ? 'ልዩነት' : 'difference'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Right Data Panel: Large Actionable Touch Stepper Steppers */}
      <div className="flex items-center gap-2">
        {/* Minus Stepper Button */}
        <button
          type="button"
          onClick={() => onCountChange(Math.max(0, currentCount - 1))}
          className="h-11 w-12 bg-rose-50 active:bg-rose-100 text-rose-600 font-black border border-rose-200 rounded-xl text-lg flex items-center justify-center active:scale-95 transition-transform select-none"
        >
          ➖
        </button>
        
        {/* Quick Keyboard Value Input Field */}
        <input 
          type="number"
          pattern="[0-9]*"
          inputMode="numeric"
          value={currentCount === 0 ? '' : currentCount}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onCountChange(isNaN(val) ? 0 : val);
          }}
          placeholder="0"
          className="w-16 h-11 text-center font-mono font-black text-lg text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950"
        />

        {/* Plus Stepper Button */}
        <button
          type="button"
          onClick={() => onCountChange(currentCount + 1)}
          className="h-11 w-12 bg-emerald-50 active:bg-emerald-100 text-emerald-600 font-black border border-emerald-200 rounded-xl text-lg flex items-center justify-center active:scale-95 transition-transform select-none"
        >
          ➕
        </button>
      </div>

    </div>
  );
}