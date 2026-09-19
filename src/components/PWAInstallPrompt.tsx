// src/components/PWAInstallPrompt.tsx
'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Stop native mobile layout mini-infobars
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('📦 PWA installed successfully by user.');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#ffffff',
      color: '#1e293b',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      border: '1px solid #e2e8f0',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '400px',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Install Liyu POS</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Add to home screen for fast, offline access.</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <button 
          onClick={handleInstallClick} 
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
        >
          Install
        </button>
        <button 
          onClick={() => setShowPrompt(false)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '4px 8px'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
