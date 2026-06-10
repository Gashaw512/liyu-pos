// src/components/dashboard/InviteStaffWizard.tsx
'use client'

import React, { useState } from 'react';
import { Share2, Plus, Users, CheckCircle2, Copy } from 'lucide-react';
import { createStaffInvitation } from '../../app/[locale]/(app)/actions/invitationActions';

interface InviteWizardProps {
  locale: string;
}

export default function InviteStaffWizard({ locale }: InviteWizardProps) {
  const isAm = locale === 'am';
  const [staffName, setStaffName] = useState('');
  const [roleAssigned, setRoleAssigned] = useState('cashier');
  const [isLoading, setIsLoading] = useState(false);
  
  // Track newly registered workers to display active share targets instantly
  const [generatedInvite, setGeneratedInvite] = useState<{ name: string; code: string } | null>(null);

  const t = (en: string, am: string) => isAm ? am : en;

  const handleRegisterAndAutomatedShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    setIsLoading(true);
    setGeneratedInvite(null);

    try {
      // 1. Fire database record allocation over the wire network
      const result = await createStaffInvitation({
        staffName: staffName.trim(),
        roleAssigned,
        locale
      });

      if (result?.success) {
        setGeneratedInvite({ name: staffName, code: result.code });
        
        // 2. Formulate multilingual messaging string
        const inviteUrl = `https://liyupos.com/${locale}/auth/invite`;
        
        const messageText = isAm
          ? `👋 ሰላም ${staffName}፣ ወደ ሊዩ POS የሽያጭ መቆጣጠሪያ መተግበሪያ ለመቀላቀል ተጋብዘዋል።\n\n` +
            `1️⃣ አካውንትዎን ለማግበር ይህንን ሊንክ ይክፈቱ፡ ${inviteUrl}\n` +
            `2️⃣ የእርስዎ ልዩ መግቢያ ማግበሪያ ኮድ፡ ${result.code}\n\n` +
            `ስራችንን ቀልጣፋ እናድርግ! 🚀`
          : `👋 Hi ${staffName}, you have been officially invited to join our store crew on LIYU POS!\n\n` +
            `1️⃣ Open this terminal validation link to set up your profile: ${inviteUrl}\n` +
            `2️⃣ Use your unique activation code: ${result.code}\n\n` +
            `Let's get operational! 🚀`;

        // Clear entry variables instantly to reset operational UI forms
        setStaffName('');

        // 3. Trigger Free Native Hardware Mobile Share Sheets instantly
        if (navigator.share) {
          await navigator.share({
            title: t('LIYU POS ሠራተኛ ግብዣ', 'LIYU POS Crew Invitation'),
            text: messageText,
          });
        } else {
          // Fallback mechanism: Copy straight to hardware clipboard buffer if using desktop viewports
          await navigator.clipboard.writeText(messageText);
          alert(t('የግብዣው መልዕክት ተገልብጧል! እባክዎ በቴሌግራም ወይም በኤስኤምኤስ ለሰራተኛው ይላኩት።', 'Invitation payload copied to clipboard! Share manually via Telegram or SMS.'));
        }
      }
    } catch (err: any) {
      alert(`Initialization Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-cream-200/80 p-5 shadow-[0_2px_8px_rgba(43,30,26,0.02)] space-y-4">
      
      {/* Title Segment Block */}
      <div className="flex items-center space-x-2.5">
        <div className="h-8 w-8 rounded-xl bg-berbere-50 flex items-center justify-center text-berbere-600">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-black text-coffee-900 tracking-tight">
            {t('አዲስ ሰራተኛ መጋበዣ', 'Invite Operational Crew')}
          </h3>
          <p className="text-[10px] text-coffee-400">
            {t('ሰራተኞችን በፍጥነት በመመዝገብ በቴሌግራም ወይም በኤስኤምኤስ በነፃ ኮድ ይላኩላቸው።', 'Provision permissions and dispatch access tokens instantly via free communication targets.')}
          </p>
        </div>
      </div>

      {/* Main Dynamic Request Action Form Input Elements */}
      <form onSubmit={handleRegisterAndAutomatedShare} className="space-y-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-wider text-coffee-500">
            {t('የሰራተኛው ሙሉ ስም', 'Staff Full Name')}
          </label>
          <input 
            type="text"
            required
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder={t('ምሳሌ፡ ዮናስ ካሳሁን', 'e.g. Yonas Kasahun')}
            className="w-full px-3 py-2 text-xs bg-cream-50/50 border border-cream-200/80 rounded-xl outline-none focus:border-berbere-500 text-coffee-800 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-wider text-coffee-500">
            {t('የስራ ድርሻ / ሚና', 'Operational Privilege Role')}
          </label>
          <select
            value={roleAssigned}
            onChange={(e) => setRoleAssigned(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-cream-50/50 border border-cream-200/80 rounded-xl outline-none text-coffee-700 font-bold"
          >
            <option value="cashier">{t('ካሺየር (Cashier)', 'Cashier (ካሺየር)')}</option>
            <option value="manager">{t('ስራ አስኪያጅ (Manager)', 'Manager (ስራ አስኪያጅ)')}</option>
            <option value="waiter">{t('አስተናጋጅ (Waiter)', 'Waiter (አስተናጋጅ)')}</option>
            <option value="kitchen">{t('ወጥ ቤት (Kitchen)', 'Kitchen (ወጥ ቤት)')}</option>
            <option value="inventory_clerk">{t('ክምችት ተቆጣጣሪ (Stock Clerk)', 'Stock Clerk (ክምችት ተቆጣጣሪ)')}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !staffName.trim()}
          className="w-full h-10 bg-coffee-900 hover:bg-coffee-950 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              <span>{t('መዝግብና የግብዣ ሊንክ ላክ', 'Register & Open Share Link')}</span>
            </>
          )}
        </button>
      </form>

      {/* SUCCESS STATUS POP CONTAINER CARD AND RETRY TARGETS OVERLAY */}
      {generatedInvite && (
        <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center space-x-1.5 text-emerald-800 text-[11px] font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{t(`${generatedInvite.name} በተሳካ ሁኔታ ተመዝግቧል!`, `${generatedInvite.name} successfully pre-registered!`)}</span>
          </div>
          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100 text-[10px]">
            <span className="text-coffee-500 font-medium">{t('የማግበሪያ ኮድ፡', 'Activation Code:')}</span>
            <span className="font-mono font-black tracking-wider text-coffee-900 text-xs">{generatedInvite.code}</span>
          </div>
        </div>
      )}

    </div>
  );
}