import type { Metadata } from "next";

import "../design/globals.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liyu POS",
  description:
    "Professional offline-capable Point of Sale system for Ethiopian businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen bg-cream-100 text-coffee-700">
        {children}
      </body>
    </html>
  );
}