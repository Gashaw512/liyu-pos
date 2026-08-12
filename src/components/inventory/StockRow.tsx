'use client';

interface StockRowProps {
  productName: string;
  category: string;
  unitType?: string;
  systemCount: number;
  currentCount: number;
  costPrice: number;
  retailPrice: number;
  onCountChange: (newCount: number) => void;
  isAm: boolean;
}

export default function StockRow({
  productName,
  category,
  unitType = 'pcs',
  systemCount = 0,
  currentCount,
  costPrice,
  retailPrice,
  onCountChange,
  isAm
}: StockRowProps) {
  
  const variance = currentCount - systemCount;
  const t = (en: string, am: string) => (isAm ? am : en);

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all space-y-3">
      
      {/* 1. Header Metadata Section */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <span className="text-[10px] font-black tracking-wide text-slate-400 uppercase block">
            🏷️ {category}
          </span>
          <h3 className="font-black text-slate-900 text-base leading-tight mt-0.5">
            {productName}
          </h3>
        </div>

        {/* Dynamic Financial Cost / Retail Badges */}
        <div className="flex flex-col items-end gap-1 text-[11px] font-bold shrink-0">
          <span className="text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-md font-mono">
            {costPrice.toFixed(0)} ETB <span className="text-[9px] font-sans text-slate-400 font-normal">{t('Cost', 'መግዣ')}</span>
          </span>
          <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md font-mono">
            {retailPrice.toFixed(0)} ETB <span className="text-[9px] font-sans text-emerald-500 font-normal">{t('Sell', 'መሸጫ')}</span>
          </span>
        </div>
      </div>

      {/* 2. Structured Operational Stock Summary Metrics Row */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 text-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {t('System Expected', 'የነበረው ክምችት')}
          </span>
          <span className="text-sm font-mono font-black text-slate-700">
            {systemCount} <span className="text-[10px] text-slate-400 font-normal uppercase">{unitType}</span>
          </span>
        </div>
        
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {t('Live Difference', 'የቆጠራ ልዩነት')}
          </span>
          <span className={`text-sm font-mono font-black ${
            variance === 0 ? 'text-slate-400' : variance > 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {variance > 0 ? `+${variance}` : variance}
          </span>
        </div>
      </div>

      {/* 3. Dedicated Minimal Adjustment Control Strip */}
      <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-between shadow-inner">
        <span className="text-xs font-black text-slate-500 pl-2">
          ⚙️ {t('Adjust Count', 'ቆጠራ ማስተካከያ')}
        </span>

        {/* Clean, high-contrast editable keyless-ready numerical field input */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCountChange(Math.max(0, currentCount - 1))}
            className="h-9 w-9 bg-white border border-slate-300 active:bg-slate-100 text-slate-700 font-black rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-all select-none"
          >
            📉
          </button>

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
            className="w-16 h-9 text-center font-mono font-black text-sm text-slate-950 bg-white border-2 border-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-sm"
          />

          <button
            type="button"
            onClick={() => onCountChange(currentCount + 1)}
            className="h-9 w-9 bg-white border border-slate-300 active:bg-slate-100 text-slate-700 font-black rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-all select-none"
          >
            📈
          </button>
        </div>
      </div>

    </div>
  );
}