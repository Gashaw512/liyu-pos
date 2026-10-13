import { ReactNode } from 'react'
import AuthenticatedGroupClient from './AuthenticatedGroupClient'

interface AuthenticatedGroupLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthenticatedGroupLayout({
  children,
  params,
}: AuthenticatedGroupLayoutProps) {
  const { locale } = await params

  return (
    <AuthenticatedGroupClient locale={locale}>
      {children}
    </AuthenticatedGroupClient>
  )
}
