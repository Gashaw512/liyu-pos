'use client';

import React from 'react';
import { Volume2 } from 'lucide-react';

interface VoiceAssistCardProps {
  businessName: string;
  role: string;
  isAm: boolean;
  isVoicePlaying: boolean;
  onToggleVoice: () => void;
}

export function VoiceAssistCard({ 
  businessName, 
  role, 
  isAm, 
  isVoicePlaying, 
  onToggleVoice 
}: VoiceAssistCardProps) {
  const t = (en: string, am: string) => (isAm ? am : en);
  
  return (
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
          onClick={onToggleVoice}
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
  );
}