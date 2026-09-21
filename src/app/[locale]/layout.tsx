import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export const metadata: Metadata = {
  title: "Liyu POS",
  description: "High-performance cloud Point of Sale system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Liyu POS",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B2635",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps) {
  const { locale } = await params;

  return (
    <div
      data-locale={locale}
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        min-h-screen
        antialiased
      `}
    >
      {children}

      <PWAInstallPrompt />
    </div>
  );
}