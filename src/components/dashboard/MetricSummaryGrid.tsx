'use client';

import React from 'react';
import { TrendingUp, Receipt, Package } from 'lucide-react';

interface MetricSummaryGridProps {
  todayRevenue: number;
  activeShift: 'open' | 'closed';
  onToggleShift: () => void;
  totalProducts: number;
  totalCategories: number;
  totalTransactionsCount: number;
  averageTicketSize: number;
  locale: string;
}

export function MetricSummaryGrid({ 
  todayRevenue, 
  activeShift, 
  onToggleShift, 
  totalProducts, 
  totalCategories, 
  totalTransactionsCount,
  averageTicketSize,
  locale
}: MetricSummaryGridProps) {
  const isAm = locale === 'am';
  const t = (en: string, am: string) => (isAm ? am : en);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Today Revenue */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">{t('Today Revenue', 'የዛሬ ሽያጭ')}</span>
            <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1 truncate">
            <span className="text-xl font-black text-coffee-900 tracking-tight">
              {todayRevenue.toLocaleString()}
            </span>
            <span className="text-[9px] font-black text-coffee-400 uppercase">{t('ETB', 'ብር')}</span>
          </div>
        </div>
        <span className="text-[10px] text-emerald-600 font-bold block mt-3 border-t border-cream-100 pt-2">
          ✓ {t('Fully Audited', 'ሂሳብ ተመሳስሏል')}
        </span>
      </div>

      {/* 2. Transactions Count & Avg Ticket */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">{t('Transactions', 'ደረሰኞች')}</span>
            <div className="h-6 w-6 rounded-lg bg-coffee-50 text-coffee-700 flex items-center justify-center">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-black text-coffee-900 tracking-tight">{totalTransactionsCount}</span>
            <span className="text-[10px] text-coffee-500 font-bold">Avg: {averageTicketSize.toLocaleString()}</span>
          </div>
        </div>
        <span className="text-[10px] text-coffee-400 font-bold block mt-3 border-t border-cream-100 pt-2">
          🛍️ {t('Total Checkouts', 'ጠቅላላ ክፍያዎች')}
        </span>
      </div>

      {/* 3. Active Shift Status */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">{t('Active Shift', 'የስራ ፈረቃ')}</span>
            <div className={`h-2 w-2 rounded-full ${activeShift === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          <div className="mt-3">
            <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded ${
              activeShift === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {activeShift === 'open' ? t('Shift Active', 'ክፍት ነው') : t('No Open Shift', 'አልተከፈተም')}
            </span>
          </div>
        </div>
        <button
          onClick={onToggleShift}
          type="button"
          className="text-[10px] font-extrabold text-berbere-600 text-left mt-3 block border-t border-cream-100 pt-2"
        >
          ⚙ {t('Toggle Shift', 'ፈረቃ ቀይር')}
        </button>
      </div>

      {/* 4. Catalog Products & Categories */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">{t('Catalog Health', 'የምርት ዝርዝር')}</span>
            <div className="h-6 w-6 rounded-lg bg-coffee-50 text-coffee-700 flex items-center justify-center">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-black text-coffee-900 tracking-tight">{totalProducts}</span>
            <span className="text-[10px] text-coffee-400 font-bold">{totalCategories} {t('categories', 'ምድቦች')}</span>
          </div>
        </div>
        <span className="text-[10px] text-coffee-400 font-bold block mt-3 border-t border-cream-100 pt-2">
          📦 {t('Active Catalog', 'በስራ ላይ ያሉ')}
        </span>
      </div>
    </div>
  );
}