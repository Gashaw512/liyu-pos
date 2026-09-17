// src/components/dashboard/DashboardHeader.tsx

'use client'

import React, {
  useEffect,
  useState,
} from 'react'

import {
  CalendarDays,
  ChevronDown,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface DashboardHeaderProps {
  businessName: string
  isAm: boolean

  isVoicePlaying: boolean
  onToggleVoice: () => void

  activeShift?: boolean

  onDayStatusClick?: () => void
  onCloseDay?: () => void
  onOpenDay?: () => void

  // Kept for compatibility with DashboardClientContent.
  onSalesClick?: () => void
  onReceiveStockClick?: () => void
  onExpenseClick?: () => void

  lowStockCount?: number

  // DashboardPeriodFilter or another control.
  rightSlot?: React.ReactNode
}

/**
 * Format the current date using the Ethiopian calendar.
 *
 * Display only.
 * Database filtering continues to use Gregorian
 * YYYY-MM-DD values.
 */
function getBusinessDate(
  date: Date,
  isAm: boolean,
): string {
  try {
    return new Intl.DateTimeFormat(
      isAm
        ? 'am-ET-u-ca-ethiopic'
        : 'en-ET-u-ca-ethiopic',
      {
        calendar: 'ethiopic',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    ).format(date)
  } catch {
    try {
      return new Intl.DateTimeFormat(
        isAm
          ? 'am-ET-u-ca-ethiopic'
          : 'en-ET-u-ca-ethiopic',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      ).format(date)
    } catch {
      return new Intl.DateTimeFormat(
        isAm ? 'am-ET' : 'en-US',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      ).format(date)
    }
  }
}

export function DashboardHeader({
  // Kept because the parent component still provides it.
  businessName: _businessName,

  isAm,

  isVoicePlaying,
  onToggleVoice,

  activeShift = false,

  onDayStatusClick,
  onCloseDay,
  onOpenDay,

  // Compatibility props.
  onSalesClick: _onSalesClick,
  onReceiveStockClick: _onReceiveStockClick,
  onExpenseClick: _onExpenseClick,
  lowStockCount: _lowStockCount,

  rightSlot,
}: DashboardHeaderProps) {
  const t = (
    en: string,
    am: string,
  ) => (isAm ? am : en)

  const [dateText, setDateText] = useState('')

  /*
   * Keep the Ethiopian date current.
   */
  useEffect(() => {
    const updateDate = () => {
      setDateText(
        getBusinessDate(
          new Date(),
          isAm,
        ),
      )
    }

    updateDate()

    const interval = window.setInterval(
      updateDate,
      60_000,
    )

    return () => {
      window.clearInterval(interval)
    }
  }, [isAm])

  const statusLabel = activeShift
    ? t('OPEN', 'ክፍት')
    : t('CLOSED', 'ዝግ')

  const dayActionLabel = activeShift
    ? t(
        'Close business day',
        'የንግድ ቀን ዝጋ',
      )
    : t(
        'Open business day',
        'የንግድ ቀን ክፈት',
      )

  const voiceLabel = isVoicePlaying
    ? t(
        'Stop briefing',
        'አጭር መረጃውን አቁም',
      )
    : t(
        "Today's briefing",
        'የዛሬ አጭር መረጃ',
      )

  const handleDayAction = activeShift
    ? onCloseDay
    : onOpenDay

  return (
    <section
      aria-label={t(
        'Business dashboard',
        'የንግድ ዳሽቦርድ',
      )}
      className="
        relative
        rounded-2xl
        border
        border-cream-200
        bg-white
        shadow-sm
      "
    >
      <div
        className="
          relative
          flex
          min-h-[58px]
          items-center
          gap-3
          px-3
          py-2
          sm:px-4
        "
      >
        {/* =====================================================
            ETHIOPIAN DATE + BUSINESS STATUS
           ===================================================== */}

        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-1.5
            "
          >
            {/* Small accent */}
            <span
              aria-hidden="true"
              className="
                h-5
                w-0.5
                shrink-0
                rounded-full
                bg-berbere-500
              "
            />

            {/* Ethiopian date */}
            <div
              className="
                flex
                min-w-0
                flex-1
                items-center
                gap-1.5
              "
            >
              <CalendarDays
                aria-hidden="true"
                className="
                  h-3.5
                  w-3.5
                  shrink-0
                  text-coffee-400
                "
              />

              <span
                className="
                  min-w-0
                  truncate
                  text-[10px]
                  font-semibold
                  leading-5
                  text-coffee-600
                  sm:text-[11px]
                "
                title={dateText}
              >
                {dateText || '\u00A0'}
              </span>
            </div>

            {/* =================================================
                BUSINESS DAY STATUS
               ================================================= */}

            {onDayStatusClick ? (
              <button
                type="button"
                onClick={onDayStatusClick}
                aria-label={t(
                  'Business day status',
                  'የንግድ ቀን ሁኔታ',
                )}
                className="
                  group
                  inline-flex
                  shrink-0
                  items-center
                  gap-1
                  rounded-full
                  border
                  border-transparent
                  px-1.5
                  py-1
                  transition
                  hover:border-cream-200
                  hover:bg-cream-50
                  active:scale-95
                "
              >
                <span
                  aria-hidden="true"
                  className={`
                    h-1.5
                    w-1.5
                    shrink-0
                    rounded-full
                    ${
                      activeShift
                        ? `
                            bg-success
                            shadow-[0_0_0_3px_rgba(34,197,94,0.10)]
                          `
                        : 'bg-coffee-300'
                    }
                  `}
                />

                <span
                  className={`
                    text-[9px]
                    font-black
                    tracking-[0.07em]
                    ${
                      activeShift
                        ? 'text-success'
                        : 'text-coffee-400'
                    }
                  `}
                >
                  {statusLabel}
                </span>

                <ChevronDown
                  aria-hidden="true"
                  className="
                    h-2.5
                    w-2.5
                    text-coffee-300
                    transition-transform
                    duration-200
                    group-hover:translate-y-0.5
                  "
                />
              </button>
            ) : (
              <span
                className="
                  inline-flex
                  shrink-0
                  items-center
                  gap-1
                  rounded-full
                  px-1.5
                  py-1
                "
              >
                <span
                  aria-hidden="true"
                  className={`
                    h-1.5
                    w-1.5
                    rounded-full
                    ${
                      activeShift
                        ? 'bg-success'
                        : 'bg-coffee-300'
                    }
                  `}
                />

                <span
                  className={`
                    text-[9px]
                    font-black
                    tracking-[0.07em]
                    ${
                      activeShift
                        ? 'text-success'
                        : 'text-coffee-400'
                    }
                  `}
                >
                  {statusLabel}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* =====================================================
            ACTION CONTROLS
           ===================================================== */}

        <div
          className="
            relative
            z-30
            flex
            shrink-0
            items-center
            gap-1.5
          "
        >
          {/* Period filter */}
          {rightSlot && (
            <div className="relative shrink-0">
              {rightSlot}
            </div>
          )}

          {/* Open / Close Day */}
          {handleDayAction && (
            <button
              type="button"
              onClick={handleDayAction}
              aria-label={dayActionLabel}
              title={dayActionLabel}
              className="
                group
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-cream-200
                bg-cream-50
                text-coffee-500
                transition-all
                duration-200
                hover:border-coffee-300
                hover:bg-coffee-50
                hover:text-coffee-700
                active:scale-90
              "
            >
              {activeShift ? (
                <Moon
                  aria-hidden="true"
                  className="
                    h-3.5
                    w-3.5
                    transition-transform
                    duration-200
                    group-hover:-rotate-12
                  "
                />
              ) : (
                <Sun
                  aria-hidden="true"
                  className="
                    h-3.5
                    w-3.5
                    transition-transform
                    duration-200
                    group-hover:rotate-45
                  "
                />
              )}
            </button>
          )}

          {/* Voice briefing */}
          <button
            type="button"
            onClick={onToggleVoice}
            aria-label={voiceLabel}
            title={voiceLabel}
            aria-pressed={isVoicePlaying}
            className={`
              group
              relative
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              transition-all
              duration-200
              active:scale-90

              ${
                isVoicePlaying
                  ? `
                      border-berbere-500
                      bg-berbere-500
                      text-white
                      shadow-sm
                    `
                  : `
                      border-cream-200
                      bg-cream-50
                      text-coffee-500
                      hover:border-berbere-300
                      hover:bg-berbere-50
                      hover:text-berbere-600
                    `
              }
            `}
          >
            {isVoicePlaying && (
              <span
                aria-hidden="true"
                className="
                  absolute
                  inset-0
                  animate-ping
                  rounded-lg
                  bg-berbere-400/20
                "
              />
            )}

            {isVoicePlaying ? (
              <VolumeX
                aria-hidden="true"
                className="
                  relative
                  h-3.5
                  w-3.5
                "
              />
            ) : (
              <Volume2
                aria-hidden="true"
                className="
                  relative
                  h-3.5
                  w-3.5
                  transition-transform
                  duration-200
                  group-hover:scale-110
                "
              />
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
