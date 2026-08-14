'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
}

interface LowStockWarningsTableProps {
  lowStockAlerts: LowStockItem[];
  locale: string;
}

export function LowStockWarningsTable({ lowStockAlerts, locale }: LowStockWarningsTableProps) {
  const isAm = locale === 'am';
  const t = (en: string, am: string) => (isAm ? am : en);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-cream-100 bg-red-50/30 flex items-center justify-between">
        <h3 className="text-xs font-black text-red-900 tracking-tight flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          {t('Low Stock Warnings (Needs Attention)', 'ያለቁ ወይም ሊያልቁ የቀረቡ ምርቶች (ትኩረት የሚሹ)')}
        </h3>
        <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
          {lowStockAlerts.length}
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left table-fixed min-w-full">
          <thead>
            <tr className="bg-cream-50/10 border-b border-cream-100 text-[9px] font-black uppercase tracking-wider text-coffee-500">
              <th className="px-3 py-2 w-[45%]">{t('Item', 'ምርት')}</th>
              <th className="px-3 py-2 w-[35%]">{t('Category', 'ምድብ')}</th>
              <th className="px-3 py-2 w-[20%] text-right">{t('Stock Left', 'ቀሪ')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-50 text-[11px]">
            {lowStockAlerts.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-5 text-center text-xs text-coffee-400 font-medium">
                  {t('All inventory items are safely stocked.', 'ሁሉም ምርቶች በበቂ ሁኔታ ይገኛሉ።')}
                </td>
              </tr>
            ) : (
              lowStockAlerts.map((item) => (
                <tr key={item.id} className="hover:bg-red-50/5 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-coffee-950 truncate">{item.name}</td>
                  <td className="px-3 py-2.5 text-coffee-500 truncate">
                    <span className="bg-cream-100 text-coffee-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-black text-red-600">
                    {item.stock}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}