'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Search, SlidersHorizontal, Plus, RotateCcw } from 'lucide-react'
import { getDB } from '@/lib/offline/db'
import { getLocalInventoryProducts } from '@/hooks/useInventoryData'
import { computeLiveLocalStock } from '@/lib/calculations/stockCalculator'
import StockRow from '@/components/inventory/StockRow'
import InventoryValuation from '@/components/inventory/InventoryValuation'
import type { InventoryProduct, LocalPendingStockCount } from '@/types/inventory'

export const dynamic = 'force-dynamic';

interface LiveMetaData {
  systemCount: number;
  hasPendingTransactions: boolean;
}

export default function InventoryPage() {
  const params = useParams()
  const router = useRouter()
  const isAm = params.locale === 'am'
  const locale = params.locale || 'am'

  const [products, setProducts] = useState<InventoryProduct[] | null>(null)
  const [liveStockMap, setLiveStockMap] = useState<Record<string, LiveMetaData>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const t = (en: string, am: string) => (isAm ? am : en)

  useEffect(() => {
    async function loadStockSheet() {
      try {
        const db = await getDB();
        const baseProducts = await getLocalInventoryProducts();
        const computedMap = await computeLiveLocalStock(db, baseProducts);
        
        setProducts(baseProducts);
        setLiveStockMap(computedMap);

        const initialCounts: Record<string, number> = {};
        baseProducts.forEach((p) => {
          initialCounts[p.id] = computedMap[p.id]?.systemCount ?? p.opening_count;
        });
        setCounts(initialCounts);
      } catch (err) {
        console.error('Critical snapshot assembly loop failure:', err);
      }
    }
    loadStockSheet();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return products;

    return products.filter((p) => 
      p.name.toLowerCase().includes(query) ||
      (p.name_am && p.name_am.toLowerCase().includes(query)) ||
      p.category_name.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  const handleCountChange = (productId: string, value: number) => {
    setCounts((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  }

  // Clear or reset active unsaved entries to match local system recommendations
  const handleResetForm = () => {
    if (!products) return
    if (confirm(t('Reset all modifications back to current system baselines?', 'ሁሉንም ማስተካከያዎች ወደ ነበረበት የስርዓት መለኪያ ይመልሱ?'))) {
      const initialCounts: Record<string, number> = {}
      products.forEach((p) => {
        initialCounts[p.id] = liveStockMap[p.id]?.systemCount ?? p.opening_count
      })
      setCounts(initialCounts)
    }
  }

  const handleSave = async () => {
    if (!products || isSaving) return;
    setIsSaving(true);
    
    try {
      const db = await getDB();
      const activeShift = await db.get('active_shift', 'current');

      if (!activeShift) {
        alert(t('❌ Please open an active operational trade shift first!', '❌ እባክዎ መጀመሪያ ክፍት የፈረቃ ስራ ይጀምሩ!'));
        return;
      }

      const tx = db.transaction('pending_stock_reconciliations', 'readwrite');
      const store = tx.objectStore('pending_stock_reconciliations');
      const now = new Date().toISOString();
      let mutationsCommitted = 0;

      for (const product of products) {
        const currentInputValue = counts[product.id] ?? 0;
        const currentLiveBaseline = liveStockMap[product.id]?.systemCount ?? product.opening_count;

        if (currentInputValue === currentLiveBaseline) continue;

        const countRow: LocalPendingStockCount = {
          localId: crypto.randomUUID(),
          createdAt: now,
          retryCount: 0,
          syncStatus: 'pending',
          product_id: product.id,
          business_id: activeShift.business_id,
          branch_id: activeShift.branch_id,
          shift_id: activeShift.id,
          counted_quantity: currentInputValue,
          system_quantity: currentLiveBaseline,
          notes: 'Hand counted via Mobile POS App Form'
        };

        await store.put(countRow);
        mutationsCommitted++;
      }

      await tx.done;

      if (mutationsCommitted === 0) {
        alert(t('ℹ️ No quantity adjustments were modified.', 'ℹ️ ምንም የተቀየረ እቃ የለም።'));
        return;
      }

      const updatedMap = await computeLiveLocalStock(db, products);
      setLiveStockMap(updatedMap);

      alert(t('✅ Stock count logged to local pending outbox successfully!', '✅ ቆጠራው በስልክዎ ላይ ተቀምጧል!'));
    } catch (err) {
      alert(t('❌ Failed to record outbox transaction.', '❌ ማስቀመጥ አልተቻለም፣ እባክዎ እንደገና ይሞክሩ'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!products) {
    return (
      <div className="min-h-screen bg-[#F7F4EB] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-7 h-7 text-[#8B2635] animate-spin mb-2" />
        <span className="text-xs font-bold text-[#5a3e38] tracking-tight animate-pulse">
          {t('Computing local inventory ledger maps...', 'የክምችት ማህደር በመተንተን ላይ...')}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] p-4 font-['DM_Sans',sans-serif] pb-40 select-none">
      
      {/* Upper Management Navigation Row */}
      <div className="max-w-md mx-auto flex items-center justify-between mb-4">
        <button 
          onClick={() => router.push(`/${locale}/reports`)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5a3e38] bg-white px-3 py-2 rounded-xl border border-[#2B1E1A]/10 shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#8B2635]" />
          {t('Reports Hub', 'ማዕከል')}
        </button>

        <button
          type="button"
          onClick={handleResetForm}
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 active:bg-slate-100 transition-colors shadow-sm"
          title={t('Reset Worksheet', 'ቅፅ መመለሻ')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        
        {/* 📊 NEW INVENTORY VALUATION EXECUTIVE BREAKDOWN PANEL */}
        <InventoryValuation products={products} liveStockMap={liveStockMap} isAm={isAm} />

        {/* Dynamic Search Component Filter Input Wrapper */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search catalog name or barcode...', 'ምርት ወይም ባርኮድ ይፈልጉ...')}
            className="w-full h-12 rounded-xl border border-slate-200 pl-10 pr-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 shadow-sm font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full">✕</button>
          )}
        </div>

        {/* Product Items Map Stream Output Render Loop */}
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const liveMetadata = liveStockMap[product.id] || { systemCount: product.opening_count, hasPendingTransactions: false };
            const currentCountValue = counts[product.id] ?? 0;
            const hasChanged = currentCountValue !== liveMetadata.systemCount;
            const costPriceValue = product.cost_price || product.retail_price * 0.7;

            return (
              <div 
                key={product.id} 
                className={`bg-white p-4 rounded-2xl border transition-all ${
                  hasChanged 
                    ? 'border-amber-400 ring-2 ring-amber-50 shadow-md' 
                    : 'border-slate-200/70 shadow-sm'
                }`}
              >
                {/* Product Header Information Metadata Section */}
                <div className="flex justify-between items-start mb-3.5">
                  <div className="space-y-1 max-w-[65%]">
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-wrap items-center gap-1.5">
                      {isAm && product.name_am ? product.name_am : product.name}
                      {liveMetadata.hasPendingTransactions && (
                        <span className="text-[8px] bg-indigo-50 text-indigo-600 font-extrabold px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase shrink-0 tracking-tighter">
                          {t('Live Queue', 'ያልተላከ')}
                        </span>
                      )}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-400 block">
                      {product.category_icon || '🏷️'} {isAm && product.category_name_am ? product.category_name_am : product.category_name}
                    </span>
                  </div>

                  {/* Financial Double Cost/Retail Pricing Display Tags */}
                  <div className="text-right space-y-0.5">
                    <div className="text-xs font-black text-slate-900 font-mono">{product.retail_price} <span className="text-[9px] font-sans font-normal text-slate-500">sell</span></div>
                    <div className="text-[10px] font-bold text-slate-400 font-mono">{costPriceValue.toFixed(0)} <span className="text-[9px] font-sans font-normal text-slate-300">cost</span></div>
                  </div>
                </div>

                <StockRow
                  productName={isAm && product.name_am ? product.name_am : product.name}
                  category={isAm && product.category_name_am ? product.category_name_am : product.category_name}
                  unitType={product.unit_type}
                  systemCount={liveMetadata.systemCount}
                  currentCount={currentCountValue}
                  onCountChange={(val) => handleCountChange(product.id, val)}
                  isAm={isAm}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Persistent Sticky Action Control Footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-t from-[#F7F4EB] via-[#F7F4EB]/95 to-transparent pt-6 pb-4 px-4 z-30">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 rounded-xl bg-slate-950 text-white text-base font-bold active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl hover:bg-slate-900"
          >
            <span>{isSaving ? '⏳' : '💾'}</span>
            {isSaving ? t('Saving Content Matrix...', 'በማስቀመጥ ላይ...') : t('Commit Audit to Device Queue', 'ቆጠራውን በስልክ ላይ አስቀምጥ')}
          </button>
        </div>
      </div>

    </div>
  )
}