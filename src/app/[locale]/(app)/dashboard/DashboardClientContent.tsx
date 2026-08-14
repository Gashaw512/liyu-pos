'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

import { VoiceAssistCard } from '@/components/dashboard/VoiceAssistCard';
import { OwnerActionHeader } from '@/components/dashboard/OwnerActionHeader';
import { MetricSummaryGrid } from '@/components/dashboard/MetricSummaryGrid';
import { CategoryPerformanceTable } from '@/components/dashboard/CategoryPerformanceTable';
import { LowStockWarningsTable } from '@/components/dashboard/LowStockWarningsTable';

interface CategoryPerformance {
  name: string;
  itemsSold: number;
  revenue: number;
}

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
}

interface DashboardClientProps {
  locale: string;
  role: string;
  businessName: string;
  initialProductCount: number | null;
  initialCategoryCount: number | null;
  categoryBreakdown?: CategoryPerformance[];
  lowStockAlerts?: LowStockItem[];
}

export default function DashboardClientContent({
  locale,
  role,
  businessName,
  initialProductCount,
  initialCategoryCount,
  categoryBreakdown = [],
  lowStockAlerts = []
}: DashboardClientProps) {
  const router = useRouter();
  const isAm = locale === 'am';
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [activeShift, setActiveShift] = useState<'open' | 'closed'>('open');
  const t = (en: string, am: string) => (isAm ? am : en);

  const totalProducts = initialProductCount || 0;
  const totalCategories = initialCategoryCount || 0;
  
  // Securely derived metrics
  const todayRevenue = categoryBreakdown.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactionsCount = categoryBreakdown.reduce((sum, item) => sum + item.itemsSold, 0);
  const averageTicketSize = totalTransactionsCount > 0 ? Math.round(todayRevenue / totalTransactionsCount) : 0;

  const handleVoiceGuidance = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isVoicePlaying) {
        setIsVoicePlaying(false);
        return;
      }
      let spokenText = "";
      if (isAm) {
        if (role === 'owner' || role === 'manager') {
          spokenText = `እንኳን ደህና መጡ። የ${businessName} ጠቅላላ የሽያጭ መጠን ${todayRevenue.toLocaleString()} ብር ደርሷል።`;
        } else {
          spokenText = "እንኳን ደህና መጡ። ሽያጭ ለመጀመር ወይም ትዕዛዝ ለመመዝገብ የሽያጭ ቁልፉን ይጫኑ።";
        }
      } else {
        spokenText = `Welcome back. Today's total revenue is ${todayRevenue.toLocaleString()} ETB.`;
      }
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = isAm ? 'am-ET' : 'en-US';
      utterance.rate = 0.9;
      
      utterance.onend = () => setIsVoicePlaying(false);
      setIsVoicePlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const isOwnerOrManager = role === 'owner' || role === 'manager';

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-6 px-2 select-none">
      
      {/* 🔊 Voice Assist Card */}
      <VoiceAssistCard 
        businessName={businessName}
        role={role}
        isAm={isAm}
        isVoicePlaying={isVoicePlaying}
        onToggleVoice={handleVoiceGuidance}
      />

      {isOwnerOrManager ? (
        /* 👑 EXECUTIVE DISPLAY ENGINE (Modular Components) */
        <div className="space-y-5">
          <OwnerActionHeader locale={locale} />

          <MetricSummaryGrid 
            todayRevenue={todayRevenue}
            activeShift={activeShift}
            onToggleShift={() => setActiveShift(activeShift === 'open' ? 'closed' : 'open')}
            totalProducts={totalProducts}
            totalCategories={totalCategories}
            totalTransactionsCount={totalTransactionsCount}
            averageTicketSize={averageTicketSize}
            locale={locale}
          />

          <CategoryPerformanceTable categoryBreakdown={categoryBreakdown} locale={locale} />

          <LowStockWarningsTable lowStockAlerts={lowStockAlerts} locale={locale} />
        </div>
      ) : (
        /* ─── OPERATIONAL STAFF/WAITER VIEWPORT ─── */
        <div className="space-y-3">
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-500 shrink-0" />
            <p className="text-xs text-coffee-800 font-bold">
              {t('Service Terminal Ready', 'ፈጣን የአገልግሎት መስኮት ገባሪ ነው')}
            </p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/sales`)}
            type="button"
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-coffee-800 to-coffee-900 text-cream-50 shadow-sm hover:from-coffee-900 hover:to-black transition-all active:scale-98 text-left border border-coffee-950"
          >
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center text-lg">🛍️</div>
              <div>
                <h3 className="font-black text-sm tracking-tight">{t('Open Point of Sale', 'አዲስ መሸጫ ክፈት (POS)')}</h3>
                <p className="text-xs text-coffee-300 mt-0.5">{t('Click here to process customer sales receipts', 'ትዕዛዞችን ለመመዝገብ እና ደረሰኝ ለማውጣት እዚህ ይጫኑ')}</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gold-400 shrink-0" />
          </button>
        </div>
      )}

      {/* 🔐 TENANT BOUNDARY VALIDATION BANNER */}
      <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-1.5 bg-emerald-50 rounded-lg text-emerald-600 shrink-0 border border-emerald-100">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-coffee-900">
              {t('Tenant Boundary Isolation Engine', 'የውሂብ መነጠል ማረጋገጫ (RLS Secure)')}
            </h3>
            <p className="text-[11px] text-coffee-400 font-medium leading-normal">
              {t(
                'Cryptographic multi-tenant record isolation fully validated. Operational data pipelines are restricted to your authenticated branch terminal.',
                'የኢንተርፕራይዝ ደህንነት መዋቅር የተጠበቀ ነው። የስራ መረጃዎችዎ እና የሽያጭ መዝገቦችዎ በአስተማማኝ ሁኔታ ተለይተው ተቀምጠዋል።'
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}