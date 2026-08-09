
// src/app/[locale]/layout.tsx
import React from 'react'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

// Nested layouts must NOT duplicate <html> or <body> tags
export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-[#F7F4EB]" data-locale={locale}>
      {children}
    </div>
  )
}