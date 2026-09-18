
'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import {
  CalendarDate,
  EthiopicCalendar,
  GregorianCalendar,
  getDayOfWeek,
  getWeeksInMonth,
  startOfMonth,
  startOfWeek,
  toCalendar,
  parseDate,
} from '@internationalized/date'

/* ============================================================
   TYPES
   ============================================================ */

interface EthiopianDatePickerProps {
  value: string
  locale: string
  onChange: (gregorianDate: string) => void
  onClose?: () => void
}

/* ============================================================
   CALENDAR
   ============================================================ */

const ETHIOPIAN_CALENDAR =
  new EthiopicCalendar()

const GREGORIAN_CALENDAR =
  new GregorianCalendar()

/* ============================================================
   MONTH NAMES
   ============================================================ */

const MONTH_NAMES_EN = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miyazya',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagumen',
]

const MONTH_NAMES_AM = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜን',
]

const WEEKDAYS_EN = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

const WEEKDAYS_AM = [
  'ሰኞ',
  'ማክሰኞ',
  'ረቡዕ',
  'ሐሙስ',
  'ዓርብ',
  'ቅዳሜ',
  'እሁድ',
]

/* ============================================================
   CONVERSION HELPERS
   ============================================================ */

function gregorianToEthiopian(
  value: string,
): CalendarDate {
  const gregorian =
    parseDate(value)

  return toCalendar(
    gregorian,
    ETHIOPIAN_CALENDAR,
  )
}

function ethiopianToGregorian(
  value: CalendarDate,
): string {
  const gregorian =
    toCalendar(
      value,
      GREGORIAN_CALENDAR,
    )

  return gregorian.toString()
}

function sameDate(
  a: CalendarDate,
  b: CalendarDate,
): boolean {
  return (
    a.compare(b) === 0
  )
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function EthiopianDatePicker({
  value,
  locale,
  onChange,
  onClose,
}: EthiopianDatePickerProps) {
  const isAm =
    locale === 'am'

  const selectedDate =
    useMemo(
      () =>
        gregorianToEthiopian(
          value,
        ),
      [value],
    )

  const [
    focusedMonth,
    setFocusedMonth,
  ] = useState<CalendarDate>(
    startOfMonth(
      selectedDate,
    ),
  )

  /* ==========================================================
     KEEP CALENDAR IN SYNC
     ========================================================== */

  useEffect(() => {
    setFocusedMonth(
      startOfMonth(
        selectedDate,
      ),
    )
  }, [selectedDate])

  /* ==========================================================
     MONTH DATA
     ========================================================== */

  const monthName =
    isAm
      ? MONTH_NAMES_AM[
          focusedMonth.month - 1
        ]
      : MONTH_NAMES_EN[
          focusedMonth.month - 1
        ]

  const weekStart =
    startOfWeek(
      startOfMonth(
        focusedMonth,
      ),
      'en-ET',
      'mon',
    )

  const weeks =
    getWeeksInMonth(
      focusedMonth,
      'en-ET',
      'mon',
    )

  const totalCells =
    weeks * 7

  const calendarDays =
    Array.from(
      {
        length: totalCells,
      },
      (_, index) =>
        weekStart.add({
          days: index,
        }),
    )

  /* ==========================================================
     NAVIGATION
     ========================================================== */

  const previousMonth = () => {
    setFocusedMonth(
      focusedMonth.subtract({
        months: 1,
      }),
    )
  }

  const nextMonth = () => {
    setFocusedMonth(
      focusedMonth.add({
        months: 1,
      }),
    )
  }

  /* ==========================================================
     TODAY
     ========================================================== */

  const goToToday = () => {
    const todayGregorian =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Africa/Addis_Ababa',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      ).format(new Date())

    const todayEthiopian =
      gregorianToEthiopian(
        todayGregorian,
      )

    setFocusedMonth(
      startOfMonth(
        todayEthiopian,
      ),
    )
  }

  /* ==========================================================
     SELECT
     ========================================================== */

  const handleSelect = (
    date: CalendarDate,
  ) => {
    onChange(
      ethiopianToGregorian(
        date,
      ),
    )

    onClose?.()
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div
      className="
        w-[248px]
        rounded-xl
        border
        border-cream-200
        bg-white
        p-2.5
        shadow-xl
      "
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div
        className="
          mb-2
          flex
          items-center
          justify-between
        "
      >
        <button
          type="button"
          onClick={previousMonth}
          aria-label={
            isAm
              ? 'ያለፈው ወር'
              : 'Previous month'
          }
          className="
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-lg
            text-coffee-500
            transition
            hover:bg-cream-50
            hover:text-coffee-800
          "
        >
          <ChevronLeft
            className="h-4 w-4"
          />
        </button>

        <div className="text-center">
          <div
            className="
              text-[11px]
              font-black
              text-coffee-800
            "
          >
            {monthName}
          </div>

          <div
            className="
              text-[10px]
              font-semibold
              text-coffee-400
            "
          >
            {focusedMonth.year}
          </div>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          aria-label={
            isAm
              ? 'የሚቀጥለው ወር'
              : 'Next month'
          }
          className="
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-lg
            text-coffee-500
            transition
            hover:bg-cream-50
            hover:text-coffee-800
          "
        >
          <ChevronRight
            className="h-4 w-4"
          />
        </button>
      </div>

      {/* ======================================================
          TODAY
          ====================================================== */}

      <button
        type="button"
        onClick={goToToday}
        className="
          mb-2
          w-full
          rounded-lg
          bg-cream-50
          py-1
          text-[9px]
          font-bold
          text-berbere-600
          transition
          hover:bg-cream-100
        "
      >
        {isAm
          ? 'ዛሬ'
          : 'Today'}
      </button>

      {/* ======================================================
          WEEKDAYS
          ====================================================== */}

      <div
        className="
          mb-1
          grid
          grid-cols-7
        "
      >
        {(isAm
          ? WEEKDAYS_AM
          : WEEKDAYS_EN
        ).map(day => (
          <div
            key={day}
            className="
              text-center
              text-[8px]
              font-bold
              text-coffee-400
            "
          >
            {day}
          </div>
        ))}
      </div>

      {/* ======================================================
          DAYS
          ====================================================== */}

      <div
        className="
          grid
          grid-cols-7
          gap-y-0.5
        "
      >
        {calendarDays.map(
          date => {
            const isSelected =
              sameDate(
                date,
                selectedDate,
              )

            const isCurrentMonth =
              date.month ===
                focusedMonth.month &&
              date.year ===
                focusedMonth.year

            const dayOfWeek =
              getDayOfWeek(
                date,
                'en-ET',
                'mon',
              )

            const isWeekend =
              dayOfWeek >= 5

            return (
              <button
                key={date.toString()}
                type="button"
                onClick={() =>
                  handleSelect(
                    date,
                  )
                }
                className={`
                  flex
                  h-7
                  items-center
                  justify-center
                  rounded-md
                  text-[10px]
                  font-semibold
                  transition
                  ${
                    isSelected
                      ? `
                        bg-[#1B2B50]
                        text-white
                        shadow-sm
                      `
                      : isCurrentMonth
                        ? `
                          ${
                            isWeekend
                              ? 'text-coffee-500'
                              : 'text-coffee-700'
                          }
                          hover:bg-cream-100
                        `
                        : `
                          text-coffee-200
                        `
                  }
                `}
              >
                {date.day}
              </button>
            )
          },
        )}
      </div>

      {/* ======================================================
          FOOTER
          ====================================================== */}

      <div
        className="
          mt-2
          border-t
          border-cream-100
          pt-2
          text-center
          text-[9px]
          font-medium
          text-coffee-400
        "
      >
        {isAm
          ? 'የኢትዮጵያ ዘመን አቆጣጠር'
          : 'Ethiopian Calendar'}
      </div>
    </div>
  )
}

