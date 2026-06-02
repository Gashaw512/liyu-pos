'use client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useTranslations } from 'next-intl'

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOnlineStatus()
  const t = useTranslations('common')

  if (isOnline && pendingCount === 0) return null

  return (
    <div className={`px-4 py-2 text-center text-sm font-medium
      ${isOnline ? 'bg-gold-100 text-gold-800' : 'bg-danger-bg text-danger'}`}>
      {isOnline
        ? t('sync_pending', { count: pendingCount })
        : t('offline')}
    </div>
  )
}