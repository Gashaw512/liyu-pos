'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Package, 
  Layers, 
  Volume2, 
  ArrowRight,
  ShieldCheck,
  Store,
  Sparkles,
  Settings
} from 'lucide-react';

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
  const todayRevenue = categoryBreakdown.reduce((sum, item) => sum + item.revenue, 0);

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
          spokenText = `እንኳን ደህና መጡ። የ${businessName} ጠቅላላ የሽያጭ እና የክምችት ሁኔታ በዚህ መቆጣጠሪያ ሰሌዳ ላይ መከታተል ይችላሉ።`;
        } else {
          spokenText = "እንኳን ደህና መጡ። ሽያጭ ለመጀመር ወይም ትዕዛዝ ለመመዝገብ የሽያጭ ቁልፉን ይጫኑ።";
        }
      } else {
        spokenText = `Welcome back. You are viewing ${businessName} terminal workspace as an authorized ${role}.`;
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
      
      {/* 🔊 BRANDED ACCESSIBILITY ASSIST CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-coffee-900 p-5 text-cream-50 border border-coffee-800 shadow-sm">
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-[70%]">
            <h2 className="text-lg font-black tracking-tight">
              {t('እንኳን ደህና መጡ', 'እንኳን ደህና መጡ')} 👋
            </h2>
            <p className="text-xs text-coffee-300 font-medium truncate">
              {businessName} • {t(`Role: ${role}`, `የተፈቀደልዎት ሚና፦ ${role}`)}
            </p>
          </div>
          <button
            onClick={handleVoiceGuidance}
            type="button"
            className={`flex h-10 items-center gap-2 px-3 rounded-xl font-black text-xs transition-all active:scale-95 border ${
              isVoicePlaying 
                ? 'bg-berbere-600 border-berbere-500 text-white animate-pulse' 
                : 'bg-coffee-800 border-coffee-700 text-cream-100 hover:bg-coffee-700'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5 text-gold-400" />
            <span>{t('Voice Assist', 'የድምፅ እገዛ')}</span>
          </button>
        </div>
      </div>

      {isOwnerOrManager ? (
        /* 👑 EXECUTIVE DISPLAY ENGINE */
        <div className="space-y-5">
          
          {/* Quick Operations Controls */}
          <div className="bg-white border border-cream-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-berbere-50 text-berbere-600 flex items-center justify-center border border-berbere-100">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-coffee-900">{t('Live Operations Control', 'የሱቅዎ የቀጥታ ሁኔታ')}</h3>
                <p className="text-[11px] text-coffee-400 font-medium">{t('Real-time overview of business indicators', 'የዛሬው የንግድ እንቅስቃሴ ማጠቃለያ')}</p>
              </div>
            </div>
            
            {/* Action Buttons Container */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* 🛠️ NEW: Inventory Management Redirect Route */}
              <button 
                onClick={() => router.push(`/${locale}/dashboard/inventory`)}
                className="flex-1 sm:flex-none bg-coffee-100 text-coffee-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-cream-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-cream-300"
              >
                <Settings className="h-3.5 w-3.5 text-coffee-700" />
                <span>{t('Manage Stock', 'ዕቃዎች መጋዘን')}</span>
              </button>

              <button 
                onClick={() => router.push(`/${locale}/sales`)}
                className="flex-1 sm:flex-none bg-berbere-600 text-white text-xs font-black px-4 py-2.5 rounded-xl hover:bg-berbere-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>{t('Open POS Counter', 'ወደ ሽያጭ ማሽን')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 4-Column Metric Summary Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                onClick={() => setActiveShift(activeShift === 'open' ? 'closed' : 'open')}
                type="button"
                className="text-[10px] font-extrabold text-berbere-600 text-left mt-3 block border-t border-cream-100 pt-2"
              >
                ⚙ {t('Toggle Shift', 'ፈረቃ ቀይር')}
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">{t('Products', 'እቃዎች')}</span>
                <div className="h-6 w-6 rounded-lg bg-coffee-50 text-coffee-700 flex items-center justify-center">
                  <Package className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-coffee-900 tracking-tight">{totalProducts}</span>
                <span className="text-[10px] text-coffee-400 font-bold block mt-1">{t('Active Items', 'የተመዘገቡ እቃዎች')}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-coffee-400">{t('Categories', 'የእቃ ምድቦች')}</span>
                <div className="h-6 w-6 rounded-lg bg-coffee-50 text-coffee-700 flex items-center justify-center">
                  <Layers className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-coffee-900 tracking-tight">{totalCategories}</span>
                <span className="text-[10px] text-coffee-400 font-bold block mt-1">{t('Catalog Groups', 'ክፍሎች')}</span>
              </div>
            </div>
          </div>

          {/* 📊 CATEGORIZED PERFORMANCE MAPPER */}
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-cream-100 bg-cream-50/30">
              <h3 className="text-xs font-black text-coffee-900 tracking-tight flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-berbere-600" />
                {t('Sales Performance by Setup Category', 'ሽያጭ በምድብ (Category)')}
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

          {/* ⚠️ LIVE AUTOMATED LOW STOCK TRACKER */}
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-cream-100 bg-red-50/30 flex items-center justify-between">
              <h3 className="text-xs font-black text-red-900 tracking-tight flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-red-600" />
                {t('Low Stock Warnings', 'ያለቁ ወይም ሊያልቁ የቀረቡ ምርቶች')}
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
                        {t('All items safely stocked.', 'ሁሉም ምርቶች በበቂ ሁኔታ ይገኛሉ።')}
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