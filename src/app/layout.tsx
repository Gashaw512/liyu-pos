import type { Metadata } from "next";
import "../design/globals.css"; 
import "./globals.css";

export const metadata: Metadata = {
  title: "Liyu POS",
  description: "Custom platform inspired by Ethiopian digital design standards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* 
        The body automatically inherits background-color, color, and font-family 
        from the rules you declared inside your src/design/globals.css 
      */}
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}