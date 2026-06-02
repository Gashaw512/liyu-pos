'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDB } from '../../../../../lib/offline/db';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isAm = params.locale === 'am';
  const productId = params.productId as string;

  const [product, setProduct] = useState<any>(null);
  const [stockLevel, setStockLevel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItemData() {
      const db = await getDB();
      // Read target reference items out of your explicit db.ts stores
      const item = await db.get('products', productId);
      const inventoryRecords = await db.getAll('inventory');
      const specLevel = inventoryRecords.find((inv) => inv.product_id === productId);

      setProduct(item);
      setStockLevel(specLevel);
      setLoading(false);
    }
    loadItemData();
  }, [productId]);

  if (loading) return <div className="p-4 text-center font-bold">...</div>;
  if (!product) return <div className="p-4 text-center text-rose-500 font-bold">⚠️ Product not found</div>;

  return (
    <div className="space-y-4 pb-20">
      <button onClick={() => router.back()} className="text-sm font-bold text-slate-500">
        ⬅️ {isAm ? 'ወደ ኋላ ተመለስ' : 'Back to Inventory'}
      </button>

      {/* Product Specification Information Profile Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
            {product.sku || 'NO SKU'}
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-1">{product.name}</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">{product.description || 'No description available'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 font-black uppercase block">{isAm ? 'መሸጫ ዋጋ' : 'Retail Price'}</span>
            <span className="font-mono text-lg font-black text-emerald-600">{product.retail_price} ETB</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 font-black uppercase block">{isAm ? 'በክምችት ያለው' : 'System Stock'}</span>
            <span className="font-mono text-lg font-black text-slate-800">{stockLevel?.quantity ?? 0} pcs</span>
          </div>
        </div>
      </div>
    </div>
  );
}