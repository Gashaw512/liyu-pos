'use client'

import React, { useEffect, useState } from 'react'
import {
  Volume2,
  VolumeX,
  ChevronDown,
  CalendarDays,
  Moon,
  Sun,
  PackagePlus,
  ShoppingCart,
  ReceiptText,
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

  onSalesClick?: () => void
  onReceiveStockClick?: () => void
  onExpenseClick?: () => void

  lowStockCount?: number
}

function getBusinessDate(
  date: Date,
  isAm: boolean,
) {
  try {
    const locale = isAm
      ? 'am-ET-u-ca-ethiopic'
      : 'en-ET-u-ca-ethiopic'

    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
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

export function DashboardHeader({
  businessName,
  isAm,

  isVoicePlaying,
  onToggleVoice,

  activeShift = false,

  onDayStatusClick,
  onCloseDay,
  onOpenDay,

  onSalesClick,
  onReceiveStockClick,
  onExpenseClick,

  lowStockCount = 0,
}: DashboardHeaderProps) {
  const t = (en: string, am: string) =>
    isAm ? am : en

  const [dateText, setDateText] = useState('')

  useEffect(() => {
    setDateText(
      getBusinessDate(new Date(), isAm),
    )
  }, [isAm])

  const statusLabel = activeShift
    ? t('OPEN', 'ክፍት')
    : t('CLOSED', 'ዝግ')

  const voiceLabel = isVoicePlaying
    ? t(
      'Stop briefing',
      'አጭር መረጃውን አቁም',
    )
    : t(
      "Today's briefing",
      'የዛሬ አጭር መረጃ',
    )

  return (
    <section
      aria-label={t(
        'Business dashboard',
        'የንግድ ዳሽቦርድ',
      )}
      className="
        overflow-hidden
        rounded-2xl
        border
        border-cream-200
        bg-white
        shadow-sm
      "
    >
      {/* =====================================================
          BUSINESS IDENTITY
         ===================================================== */}

      <div
        className="
          relative
          flex
          min-h-[62px]
          items-center
          gap-3
          px-3.5
          py-3
          sm:px-4
        "
      >
        {/* Subtle decorative accent */}

        <div
          className="
            absolute
            left-0
            top-3
            h-8
            w-0.5
            rounded-r-full
            bg-berbere-500
          "
          aria-hidden="true"
        />

        {/* BUSINESS INFO */}

        <div className="min-w-0 flex-1 pl-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1
              className="
                min-w-0
                truncate
                text-[13px]
                font-black
                tracking-tight
                text-coffee-900
                sm:text-sm
              "
            >
              {businessName}
            </h1>

            {/* DAY STATUS */}

            <button
              type="button"
              onClick={onDayStatusClick}
              disabled={!onDayStatusClick}
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
                px-1.5
                py-0.5
                transition-all
                duration-200
                active:scale-95
                disabled:cursor-default
              "
            >
              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  transition-all
                  duration-300
                  ${activeShift
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
                  text-[10px]
                  font-black
                  tracking-[0.08em]
                  ${activeShift
                    ? 'text-success'
                    : 'text-coffee-400'
                  }
                `}
              >
                {statusLabel}
              </span>

              {onDayStatusClick && (
                <ChevronDown
                  className="
                    h-2.5
                    w-2.5
                    text-coffee-300
                    transition-transform
                    duration-200
                    group-hover:translate-y-0.5
                  "
                />
              )}
            </button>
          </div>

          {/* DATE */}

          <div
            className="
              mt-0.5
              flex
              min-h-[14px]
              min-w-0
              items-center
              gap-1
              text-[9px]
              font-medium
              text-coffee-400
            "
          >
            <CalendarDays
              className="
                h-2.5
                w-2.5
                shrink-0
              "
            />

            <span className="truncate">
              {dateText || '\u00A0'}
            </span>
          </div>
        </div>

        {/* VOICE BRIEFING */}

        <button
          type="button"
          onClick={onToggleVoice}
          aria-label={voiceLabel}
          title={voiceLabel}
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

            ${isVoicePlaying
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
              className="
                absolute
                inset-0
                animate-ping
                rounded-lg
                bg-berbere-400/20
              "
              aria-hidden="true"
            />
          )}

          {isVoicePlaying ? (
            <VolumeX className="relative h-3.5 w-3.5" />
          ) : (
            <Volume2
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

      {/* =====================================================
          QUICK ACTIONS
         ===================================================== */}

      {/* =====================================================
    QUICK ACTIONS
   ===================================================== */}

      <div
        className="
    border-t
    border-cream-200/70
    bg-cream-50/30
  "
      >
        {/* SECTION LABEL */}

        <div
          className="
      flex
      h-7
      items-center
      justify-center
    "
        >
          <div className="flex items-center gap-2">
            <span className="h-px w-4 bg-cream-300" />

            <span
              className="
          text-[7px]
          font-black
          uppercase
          tracking-[0.3em]
          text-coffee-400
        "
            >
              {t(
                'Quick Actions',
                'ፈጣን እርምጃዎች',
              )}
            </span>

            <span className="h-px w-4 bg-cream-300" />
          </div>
        </div>

        {/* ===================================================
      ACTION GRID
     =================================================== */}

        <div
          className="
      grid
      grid-cols-4
      border-t
      border-cream-200/60
    "
        >
          {/* =================================================
        NEW SALE
       ================================================= */}

          {onSalesClick && (
            <button
              type="button"
              onClick={onSalesClick}
              aria-label={t(
                'Start a new sale',
                'አዲስ ሽያጭ ጀምር',
              )}
              className="
          group
          flex
          min-w-0
          min-h-[58px]
          flex-col
          items-center
          justify-center
          gap-1
          border-r
          border-cream-200
          bg-white
          px-1
          py-2
          text-coffee-800
          transition-all
          duration-200
          hover:bg-berbere-50
          hover:text-berbere-700
          active:scale-[0.97]
        "
            >
              <span
                className="
            flex
            h-6
            w-6
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-berbere-50
            transition-all
            duration-200
            group-hover:bg-berbere-100
            group-hover:scale-105
          "
              >
                <ShoppingCart
                  className="
              h-3.5
              w-3.5
              text-berbere-600
              transition-transform
              duration-200
              group-hover:scale-110
            "
                />
              </span>

              <span
                className="
            text-center
            text-[10px]
            font-black
            leading-[1.15]
            sm:text-[9px]
          "
              >
                {isAm ? (
                  <>
                    <span >
                      አዲስ
                      ሽያጭ
                    </span>
                  </>
                ) : (
                  <>
                    <span >
                      New Sale
                    </span>
                  </>
                )}
              </span>
            </button>
          )}

          {/* =================================================
        RECEIVE STOCK
       ================================================= */}

          {onReceiveStockClick && (
            <button
              type="button"
              onClick={onReceiveStockClick}
              aria-label={t(
                'Receive stock',
                'እቃ ተቀበል',
              )}
              className="
          group
          relative
          flex
          min-w-0
          min-h-[58px]
          flex-col
          items-center
          justify-center
          gap-1
          border-r
          border-cream-200
          bg-white
          px-1
          py-2
          text-coffee-700
          transition-all
          duration-200
          hover:bg-cream-50
          active:scale-[0.97]
        "
            >
              <span
                className="
            flex
            h-6
            w-6
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-cream-50
            transition-all
            duration-200
            group-hover:bg-white
            group-hover:scale-105
          "
              >
                <PackagePlus
                  className="
              h-3.5
              w-3.5
              text-coffee-500
              transition-transform
              duration-200
              group-hover:-translate-y-0.5
            "
                />
              </span>

              <span
                className="
            text-center
            text-[10px]
            font-black
            leading-[1.15]
            sm:text-[9px]
          "
              >
                {isAm ? (
                  <>
                    <span >
                      እቃ
                      ተቀበል
                    </span>
                  </>
                ) : (
                  <>
                    <span >
                      Receive
                      Stock
                    </span>
                  </>
                )}
              </span>

              {/* LOW STOCK */}

              {lowStockCount > 0 && (
                <span
                  aria-label={t(
                    `${lowStockCount} low stock items`,
                    `${lowStockCount} ዝቅተኛ ክምችት ያላቸው እቃዎች`,
                  )}
                  className="
              absolute
              right-1
              top-1
              flex
              h-4
              min-w-4
              items-center
              justify-center
              rounded-full
              bg-berbere-500
              px-1
              text-[10px]
              font-black
              leading-none
              text-white
              shadow-sm
            "
                >
                  {lowStockCount > 99
                    ? '99+'
                    : lowStockCount}
                </span>
              )}
            </button>
          )}

          {/* =================================================
        RECORD EXPENSE
       ================================================= */}

          {onExpenseClick && (
            <button
              type="button"
              onClick={onExpenseClick}
              aria-label={t(
                'Record expense',
                'ወጪ መዝግብ',
              )}
              className="
          group
          flex
          min-w-0
          min-h-[58px]
          flex-col
          items-center
          justify-center
          gap-1
          border-r
          border-cream-200
          bg-white
          px-1
          py-2
          text-coffee-700
          transition-all
          duration-200
          hover:bg-cream-50
          active:scale-[0.97]
        "
            >
              <span
                className="
            flex
            h-6
            w-6
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-cream-50
            transition-all
            duration-200
            group-hover:bg-white
            group-hover:scale-105
          "
              >
                <ReceiptText
                  className="
              h-3.5
              w-3.5
              text-coffee-500
              transition-transform
              duration-200
              group-hover:scale-110
            "
                />
              </span>

              <span
                className="
            text-center
            text-[10px]
            font-black
            leading-[1.15]
            sm:text-[9px]
          "
              >
                {isAm ? (
                  <>
                    <span >
                      ወጪ

                      መዝግብ
                    </span>
                  </>
                ) : (
                  <>
                    <span >
                      Record

                      Expense
                    </span>
                  </>
                )}
              </span>
            </button>
          )}

          {/* =================================================
        OPEN / CLOSE DAY
       ================================================= */}

          {activeShift
            ? onCloseDay && (
              <button
                type="button"
                onClick={onCloseDay}
                aria-label={t(
                  'Close business day',
                  'የንግድ ቀን ዝጋ',
                )}
                className="
              group
              flex
              min-w-0
              min-h-[58px]
              flex-col
              items-center
              justify-center
              gap-1
              bg-white
              px-1
              py-2
              text-coffee-700
              transition-all
              duration-200
              hover:bg-coffee-50
              active:scale-[0.97]
            "
              >
                <span
                  className="
                flex
                h-6
                w-6
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-coffee-50
                transition-all
                duration-200
                group-hover:bg-coffee-100
                group-hover:scale-105
              "
                >
                  <Moon
                    className="
                  h-3.5
                  w-3.5
                  text-coffee-500
                  transition-transform
                  duration-200
                  group-hover:-rotate-12
                "
                  />
                </span>

                <span
                  className="
                text-center
                text-[10px]
                font-black
                leading-[1.15]
                sm:text-[9px]
              "
                >
                  {isAm ? (
                    <>
                      <span >
                        ቀኑን

                        ዝጋ
                      </span>
                    </>
                  ) : (
                    <>
                      <span >
                        Close

                        Day
                      </span>
                    </>
                  )}
                </span>
              </button>
            )
            : onOpenDay && (
              <button
                type="button"
                onClick={onOpenDay}
                aria-label={t(
                  'Open business day',
                  'የንግድ ቀን ክፈት',
                )}
                className="
              group
              flex
              min-w-0
              min-h-[58px]
              flex-col
              items-center
              justify-center
              gap-1
              bg-white
              px-1
              py-2
              text-success
              transition-all
              duration-200
              hover:bg-success/5
              active:scale-[0.97]
            "
              >
                <span
                  className="
                flex
                h-6
                w-6
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-success/10
                transition-all
                duration-200
                group-hover:bg-success/15
                group-hover:scale-105
              "
                >
                  <Sun
                    className="
                  h-3.5
                  w-3.5
                  text-success
                  transition-transform
                  duration-200
                  group-hover:rotate-45
                "
                  />
                </span>

                <span
                  className="
                text-center
                text-[10px]
                font-black
                leading-[1.15]
                sm:text-[9px]
              "
                >
                  {isAm ? (
                    <>
                      <span >
                        ቀኑን ክፈት
                      </span>
                    </>
                  ) : (
                    <>
                      <span >
                        Open
                        Day
                      </span>
                    </>
                  )}
                </span>
              </button>
            )}
        </div>
      </div>
    </section>
  )
}