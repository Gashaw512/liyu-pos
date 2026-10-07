'use client'

import { useParams } from 'next/navigation'

import AccountSettings from '@/components/settings/AccountSettings'

export default function SettingsPage() {
  const params = useParams()
  const locale = String(params?.locale || 'en')

  return <AccountSettings locale={locale} />
}
