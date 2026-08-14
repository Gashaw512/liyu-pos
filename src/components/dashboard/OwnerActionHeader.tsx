'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Store, Settings, ArrowRight } from 'lucide-react';

interface OwnerActionHeaderProps {
  locale: string;
}

export function OwnerActionHeader({ locale }: OwnerActionHeaderProps) {
  const router = useRouter();
  const isAm = locale === 'am';
  const t = (en: string, am: string) => (isAm ? am : en);

  return (
    <div className="bg-white border border-cream-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-berbere-50 text-berbere-600 flex items-center justify-center border border-berbere-100">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-coffee-900">{t('Live Operations Control', 'የሱቅዎ የቀጥታ ሁኔታ')}</h3>
          <p className="text-[11px] text-coffee-400 font-medium">{t('Real-time overview of business indicators', 'የዛሬው የንግድ እንቅስቃሴ ማጠቃለያ')}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
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
  );
}