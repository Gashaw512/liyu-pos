'use client'

import React from 'react'
import {
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface DashboardHeaderProps {
  businessName: string
  isAm: boolean
  isVoicePlaying: boolean
  onToggleVoice: () => void

  todayRevenue?: number
  transactionCount?: number
  lowStockCount?: number
  pendingSyncCount?: number
  activeShift?: boolean
}

export function DashboardHeader({
  businessName,
  isAm,
  isVoicePlaying,
  onToggleVoice,
  todayRevenue = 0,
  transactionCount = 0,
  lowStockCount = 0,
  pendingSyncCount = 0,
  activeShift = true,
}: DashboardHeaderProps) {
  const t = (en: string, am: string) => (isAm ? am : en)

  const today = new Intl.DateTimeFormat(
    isAm ? 'am-ET' : 'en-US',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }
  ).format(new Date())

  /*
   * Business intelligence
   *
   * Priority:
   * 1. Pending sync
   * 2. Low stock
   * 3. Shift problem
   * 4. Normal
   */
  const hasAttention =
    pendingSyncCount > 0 ||
    lowStockCount > 0 ||
    !activeShift

  let statusText: string
  let statusTextAm: string

  if (pendingSyncCount > 0) {
    statusText = 'Some sales are waiting to sync'
    statusTextAm = 'አንዳንድ ሽያጮች ለማመሳሰል እየጠበቁ ነው'
  } else if (lowStockCount > 0) {
    statusText = `${lowStockCount} item${
      lowStockCount === 1 ? '' : 's'
    } need restocking`
    statusTextAm = `${lowStockCount} እቃ እንደገና መሟላት ያስፈልገዋል`
  } else if (!activeShift) {
    statusText = 'No active shift'
    statusTextAm = 'ንቁ ፈረቃ የለም'
  } else {
    statusText = 'Business is running normally'
    statusTextAm = 'ንግድዎ በመደበኛነት እየሰራ ነው'
  }

  const voiceLabel = isVoicePlaying
    ? t('Stop briefing', 'መረጃውን አቁም')
    : t("Today's briefing", 'የዛሬ አጭር መረጃ')

  return (
    <section
      aria-label={t(
        'Business overview',
        'የንግድ አጠቃላይ እይታ'
      )}
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-cream-200
        bg-cream-50
        px-4
        py-4
        shadow-sm
      "
    >
      {/* Subtle brand accent */}
      <div
        aria-hidden="true"
        className="
          absolute
          -right-10
          -top-10
          h-24
          w-24
          rounded-full
          bg-berbere-500/10
          blur-2xl
        "
      />

      <div className="relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">

          <div className="min-w-0">

            <h1
              className="
                text-lg
                font-black
                tracking-tight
                text-coffee-700
              "
            >
              {t('Well Come', 'እንኳን ደህና መጡ')}
            </h1>

            <p
              className="
                mt-0.5
                truncate
                text-xs
                font-medium
                text-coffee-400
              "
            >
              {businessName} • {today}
            </p>

          </div>

          {/* Voice */}
          <button
            onClick={onToggleVoice}
            type="button"
            aria-label={voiceLabel}
            title={voiceLabel}
            className={`
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              transition-all
              active:scale-95

              ${
                isVoicePlaying
                  ? `
                    border-berbere-500
                    bg-berbere-500
                    text-white
                  `
                  : `
                    border-cream-300
                    bg-white
                    text-coffee-600
                    hover:border-berbere-300
                    hover:text-berbere-600
                  `
              }
            `}
          >
            {isVoicePlaying ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

        </div>

        {/* Business status */}
        <div className="mt-3 flex items-center gap-2">

          {hasAttention ? (
            <AlertCircle className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}

          <span
            className={`
              text-xs
              font-bold
              ${
                hasAttention
                  ? 'text-warning'
                  : 'text-success'
              }
            `}
          >
            {t(statusText, statusTextAm)}
          </span>

        </div>

        {/* Today's quick summary */}
        <div
          className="
            mt-3
            flex
            items-center
            justify-between
            gap-3
            rounded-xl
            border
            border-cream-200
            bg-white
            px-3
            py-2.5
          "
        >

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-coffee-400">
              {t("Today's sales", 'የዛሬ ሽያጭ')}
            </p>

            <p className="mt-0.5 text-sm font-black text-coffee-700">
              {todayRevenue.toLocaleString()} ETB
            </p>
          </div>

          <div className="h-7 w-px bg-cream-200" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-coffee-400">
              {t('Transactions', 'ሽያጮች')}
            </p>

            <p className="mt-0.5 text-sm font-black text-coffee-700">
              {transactionCount.toLocaleString()}
            </p>
          </div>

          {/* {(lowStockCount > 0 || pendingSyncCount > 0) && (
            <>
              <div className="h-7 w-px bg-cream-200" />

              <div className="text-right">

                {lowStockCount > 0 && (
                  <p className="text-[10px] font-bold text-warning">
                    📦 {lowStockCount}{' '}
                    {t('low stock', 'ዝቅተኛ ክምችት')}
                  </p>
                )}

                {pendingSyncCount > 0 && (
                  <p className="mt-0.5 text-[10px] font-bold text-info">
                    🔄 {pendingSyncCount}{' '}
                    {t('sync pending', 'ማመሳሰል')}
                  </p>
                )}

              </div>
            </>
          )} */}

        </div>

      </div>
    </section>
  )
}