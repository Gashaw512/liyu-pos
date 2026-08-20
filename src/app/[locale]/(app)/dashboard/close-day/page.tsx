'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {CloseDayPage} from '@/components/dashboard/CloseDayPage'
import { Route } from 'next'

interface CloseDayRouteProps {
  params: Promise<{
    locale: string
  }>
}

export default function CloseDayRoute({
  params,
}: CloseDayRouteProps) {
  const router = useRouter()

  const [locale, setLocale] = React.useState('en')

  React.useEffect(() => {
    params.then(({ locale }) => {
      setLocale(locale)
    })
  }, [params])

  const isAm = locale === 'am'

  return (
    <CloseDayPage
      businessName="Liyu POS"
      isAm={isAm}
      sales={0}
      transactionCount={0}
      grossProfit={0}
      expenses={0}
      netProfit={0}
      onBack={() => {
        router.push(`/${locale}/dashboard`)
      }}
      onContinue={() => {
        router.push(
          `/${locale}/dashboard/close-day/record-sales` as Route,
        )
      }}
    />
  )
}