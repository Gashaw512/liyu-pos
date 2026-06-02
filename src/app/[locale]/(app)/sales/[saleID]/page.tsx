// # Receipt

'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDB } from '../../../../../lib/offline/db';

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const isAm = params.locale === 'am';
  const saleId = params.saleId as string;

  // 🛠️ FIX: Use 'any' type here to safely house both PendingSale and Sale shapes without type clashing
  const [sale, setSale] = useState<any>(null);
  const [productCatalog, setProductCatalog] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

 // Replace your existing useEffect hook with this implementation:
useEffect(() => {
  async function locateReceiptAndCatalog() {
    try {
      const db = await getDB();
      
      const products = await db.getAll('products');
      const catalogMap: Record<string, string> = {};
      products.forEach((p) => {
        catalogMap[p.id] = p.name;
      });
      setProductCatalog(catalogMap);
      
      // 🛠️ FIX: Query them using isolated, distinct local scope names
      const historicalReceipt = await db.get('completed_sales_history', saleId);
      
      if (historicalReceipt) {
        setSale(historicalReceipt);
      } else {
        const pendingSales = await db.getAll('pending_sales');
        const pendingReceipt = pendingSales.find((s) => s.localId === saleId);
        setSale(pendingReceipt || null);
      }

    } catch (err) {
      console.error("Error reading receipt data:", err);
    } finally {
      setLoading(false);
    }
  }
  locateReceiptAndCatalog();
}, [saleId]);

  if (loading) return <div className="p-4 text-center font-bold">...</div>;
  if (!sale) return <div className="p-4 text-center text-rose-500 font-bold">⚠️ {isAm ? 'ማረጋገጫው አልተገኘም' : 'Receipt not found'}</div>;

  // Normalize totals between schema differences
  const finalTotal = sale.total_amount ?? sale.amount ?? 0;
  const itemRows = sale.items ?? [];

  return (
    <div className="space-y-4 pb-20 max-w-sm mx-auto">
      <button onClick={() => router.push(`/${params.locale}/sales`)} className="text-sm font-bold text-slate-500">
        🔄 {isAm ? 'አዲስ ሽያጭ ጀምር' : 'New Transaction'}
      </button>

      {/* High-Contrast Thermal Invoice Wrapper */}
      <div className="bg-white border-2 border-dashed border-slate-300 p-5 rounded-lg space-y-4 shadow-sm font-mono text-sm text-slate-800">
        <div className="text-center space-y-1">
          <h2 className="font-black text-lg uppercase tracking-tight text-slate-900">LIYU POS RECEIPT</h2>
          <div className="text-xs font-bold text-slate-400">
            {sale.createdAt || sale.created_at ? new Date(sale.createdAt || sale.created_at).toLocaleString() : ''}
          </div>
          <div className="text-[10px] text-slate-500 truncate">ID: {sale.localId || sale.id}</div>
        </div>

        {/* Dynamic Itemized Rows */}
        <div className="border-y-2 border-dashed border-slate-200 py-3 space-y-2">
          {itemRows.map((item: any, idx: number) => {
            // Resolve product names from either embedded properties or our local catalog map lookup
            const resolvedName = item.product_name || productCatalog[item.product_id] || (isAm ? 'ዕቃ' : 'Item');
            const price = item.unit_price || item.price || 0;
            const qty = item.quantity || 0;

            return (
              <div key={idx} className="flex justify-between font-medium">
                <div className="truncate max-w-[65%]">
                  {resolvedName} <span className="text-xs text-slate-400">x{qty}</span>
                </div>
                <div className="font-bold">{price * qty} ETB</div>
              </div>
            );
          })}
        </div>

        {/* Totals Summary */}
        <div className="space-y-1 text-right">
          <div className="flex justify-between font-black text-base text-slate-900 pt-1">
            <span>TOTAL BILL:</span>
            <span>{finalTotal} ETB</span>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="text-center pt-4 border-t border-slate-100">
          <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${
            sale.syncStatus === 'pending' || !sale.id ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {sale.syncStatus === 'pending' || !sale.id ? (isAm ? 'በስልክ ላይ የተቀመጠ' : 'OFFLINE RECORD') : (isAm ? 'የተረጋገጠ ሽያጭ' : 'SYNCED TRACE')}
          </span>
          <p className="text-[10px] text-slate-400 font-bold mt-3">✨ አመሰግናለሁ! / Thank You! ✨</p>
        </div>
      </div>
    </div>
  );
}