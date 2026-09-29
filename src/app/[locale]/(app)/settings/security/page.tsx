import { redirect } from 'next/navigation'

interface SettingsSecurityPageProps {
  params: Promise<{ locale: string }>
}

export default async function SettingsSecurityPage({ params }: SettingsSecurityPageProps) {
  const { locale } = await params
  redirect(`/${locale}/management/security`)
}