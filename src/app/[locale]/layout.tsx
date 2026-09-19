
// // src/app/[locale]/layout.tsx
// import React from 'react'

// interface LayoutProps {
//   children: React.ReactNode
//   params: Promise<{ locale: string }>
// }

// // Nested layouts must NOT duplicate <html> or <body> tags
// export default async function LocaleLayout({ children, params }: LayoutProps) {
//   const { locale } = await params

//   return (
//     <div className="min-h-screen bg-[#F7F4EB]" data-locale={locale}>
//       {children}
//     </div>
//   )
// }




// src/app/[locale]/layout.tsx
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

// 1. Optimize Fonts to prevent Layout Shift (CLS)
const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// 2. High-Performance Static App Metadata & PWA Definition
export const metadata: Metadata = {
  title: 'Liyu POS',
  description: 'High-performance cloud Point of Sale system.',
  manifest: '/manifest.json', // 👈 Crucial for PWA installation detection
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Liyu POS',
  },
};

// 3. Viewport optimization for mobile devices
export const viewport: Viewport = {
  themeColor: '#8B2635', // Updated to your primary Berbere Color token
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents forced zoom behaviors on inputs in mobile POS systems
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <head>
        {/* Forces the browser to explicitly look at the root for the PWA handshake */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#F7F4EB]`}>
        <div data-locale={locale} className="min-h-screen">
          {/* 4. Global Core Content */}
          {children}
        </div>
        
        {/* 5. Custom Install Banner Trigger */}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
