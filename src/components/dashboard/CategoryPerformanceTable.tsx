'use client';

import React from 'react';
import { Layers } from 'lucide-react';

interface CategoryPerformance {
  name: string;
  itemsSold: number;
  revenue: number;
}

interface CategoryPerformanceTableProps {
  categoryBreakdown: CategoryPerformance[];
  locale: string;
}

export function CategoryPerformanceTable({ categoryBreakdown, locale }: CategoryPerformanceTableProps) {
  const isAm = locale === 'am';
  const t = (en: string, am: string) => (isAm ? am : en);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-cream-100 bg-cream-50/30">
        <h3 className="text-xs font-black text-coffee-900 tracking-tight flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-berbere-600" />
          {t('Sales Performance by Setup Category', 'ሽያጭ በምድብ (Category Breakdown)')}
        </h3>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left table-fixed min-w-full">
          <thead>
            <tr className="bg-cream-50/10 border-b border-cream-100 text-[9px] font-black uppercase tracking-wider text-coffee-500">
              <th className="px-3 py-2 w-[50%]">{t('Category', 'የምድብ ስም')}</th>
              <th className="px-3 py-2 w-[25%] text-center">{t('Qty Sold', 'ብዛት')}</th>
              <th className="px-3 py-2 w-[25%] text-right">{t('Revenue', 'ጠቅላላ ብር')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-50 text-[11px]">
            {categoryBreakdown.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-5 text-center text-xs text-coffee-400 font-medium">
                  {t('No sales items processed under setup categories yet.', 'እስካሁን ምንም ዓይነት ሽያጭ አልተመዘገበም።')}
                </td>
              </tr>
            ) : (
              categoryBreakdown.map((row, index) => (
                <tr key={index} className="hover:bg-cream-50/10 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-coffee-950 truncate">{row.name}</td>
                  <td className="px-3 py-2.5 text-coffee-600 font-medium text-center font-mono">{row.itemsSold}</td>
                  <td className="px-3 py-2.5 font-black text-coffee-900 text-right font-mono">{row.revenue.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}