'use client'

interface StockRowProps {
  productName: string;
  category?: string | null;
  currentCount: number;
  onCountChange: (newCount: number) => void;
  isAm: boolean;
}

export default function StockRow({ productName, category, currentCount, onCountChange, isAm }: StockRowProps) {
  const displayCategory = category ?? (isAm ? 'አጠቃላይ' : 'General')

  return (
    <div className="bg-white border border-cream-200/80 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-cream-300 transition-colors">
      
      {/* Clear Label Info Block */}
      <div className="flex flex-col max-w-[45%] space-y-0.5">
        <span className="font-black text-sm tracking-tight text-coffee-950 truncate">
          {productName}
        </span>
        <span className="inline-block text-[9px] w-fit text-berbere-700 font-extrabold bg-berbere-50 px-1.5 py-0.5 rounded uppercase tracking-wider truncate">
          {displayCategory}
        </span>
      </div>

      {/* Accessibility Steppers with Numeric Keyboard Safe Fallback */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCountChange(Math.max(0, currentCount - 1))}
          className="h-10 w-11 bg-red-50 hover:bg-red-100 text-red-600 font-black border border-red-200/60 rounded-xl text-lg flex items-center justify-center active:scale-90 transition-transform select-none shadow-xs"
        >
          ➖
        </button>
        
        {/* Input box allowing typing for large stocks */}
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
          className="w-14 h-10 text-center font-mono font-black text-base text-coffee-900 bg-cream-50/50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-berbere-500"
        />

        <button
          type="button"
          onClick={() => onCountChange(currentCount + 1)}
          className="h-10 w-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-black border border-emerald-200/60 rounded-xl text-lg flex items-center justify-center active:scale-90 transition-transform select-none shadow-xs"
        >
          ➕
        </button>
      </div>

    </div>
  );
}