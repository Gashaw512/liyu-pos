'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'

import RecordTodaysSales from '@/components/dashboard/RecordTodaysSales'
import { Route } from 'next'

interface RecordSalesPageProps {
  params: Promise<{
    locale: string
  }>
}

export default function RecordSalesPage({
  params,
}: RecordSalesPageProps) {
  const router = useRouter()
  const { locale } = use(params)

  const isAm = locale === 'am'

  const closeDayPath =
    `/${locale}/dashboard/close-day` as Route

  return (
    <RecordTodaysSales
      locale={locale}
      isAm={isAm}
      onBack={() => {
        router.push(closeDayPath)
      }}
      onSave={(items) => {
        console.log("Today's batch sales:", items)

        // Database integration will be added here.
        router.push(closeDayPath)
      }}
    />
  )
}