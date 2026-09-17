'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { Route } from 'next'

import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'

import {
  CalendarDays,
  Check,
  ChevronDown,
} from 'lucide-react'

import EthiopianDatePicker from '@/components/dashboard/EthiopianDatePicker'

/* ============================================================
   TYPES
   ============================================================ */

interface DashboardPeriodFilterProps {
  locale: string
  from: string
  to: string
}

type Preset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'custom'

type PickerTarget =
  | 'from'
  | 'to'
  | null

/* ============================================================
   CONSTANTS
   ============================================================ */

const TIME_ZONE =
  'Africa/Addis_Ababa'

/* ============================================================
   DATE HELPERS
   ============================================================ */

function getTodayDate(): string {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date())
}

function formatDate(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(date)
}

function parseDate(
  dateString: string,
): Date {
  const [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number)

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )
}

function addDays(
  dateString: string,
  days: number,
): string {
  const date =
    parseDate(dateString)

  date.setUTCDate(
    date.getUTCDate() + days,
  )

  return (
    `${date.getUTCFullYear()}-` +
    `${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}-` +
    `${String(
      date.getUTCDate(),
    ).padStart(2, '0')}`
  )
}

function startOfWeek(
  dateString: string,
): string {
  const date =
    parseDate(dateString)

  const day =
    date.getUTCDay()

  const difference =
    day === 0
      ? -6
      : 1 - day

  date.setUTCDate(
    date.getUTCDate() +
      difference,
  )

  return (
    `${date.getUTCFullYear()}-` +
    `${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}-` +
    `${String(
      date.getUTCDate(),
    ).padStart(2, '0')}`
  )
}

function startOfMonth(
  dateString: string,
): string {
  const [
    year,
    month,
  ] = dateString.split('-')

  return `${year}-${month}-01`
}

function previousMonthStart(
  dateString: string,
): string {
  const date =
    parseDate(dateString)

  date.setUTCMonth(
    date.getUTCMonth() - 1,
  )

  date.setUTCDate(1)

  return (
    `${date.getUTCFullYear()}-` +
    `${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}-01`
  )
}

function currentMonthStart(
  dateString: string,
): string {
  return startOfMonth(
    dateString,
  )
}

function formatEthiopianDate(
  dateString: string,
  locale: string,
): string {
  const date =
    parseDate(dateString)

  return new Intl.DateTimeFormat(
    locale === 'am'
      ? 'am-ET-u-ca-ethiopic'
      : 'en-ET-u-ca-ethiopic',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ).format(date)
}

function isValidDate(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false
  }

  const date =
    parseDate(value)

  return (
    formatDate(date) === value
  )
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function DashboardPeriodFilter({
  locale,
  from,
  to,
}: DashboardPeriodFilterProps) {
  const router =
    useRouter()

  const pathname =
    usePathname()

  const searchParams =
    useSearchParams()

  const containerRef =
    useRef<HTMLDivElement>(null)

  const isAm =
    locale === 'am'

  const [open, setOpen] =
    useState(false)

  const [
    pickerTarget,
    setPickerTarget,
  ] = useState<PickerTarget>(
    null,
  )

  const [
    customFrom,
    setCustomFrom,
  ] = useState(from)

  const [
    customTo,
    setCustomTo,
  ] = useState(
    addDays(to, -1),
  )

  /* ==========================================================
     LABELS
     ========================================================== */

  const labels = {
    today: isAm
      ? 'ዛሬ'
      : 'Today',

    yesterday: isAm
      ? 'ትናንት'
      : 'Yesterday',

    this_week: isAm
      ? 'ይህ ሳምንት'
      : 'This Week',

    this_month: isAm
      ? 'ይህ ወር'
      : 'This Month',

    last_month: isAm
      ? 'ያለፈው ወር'
      : 'Last Month',

    custom: isAm
      ? 'የተመረጠ ጊዜ'
      : 'Custom Range',
  }

  /* ==========================================================
     SYNC INPUTS
     ========================================================== */

  useEffect(() => {
    setCustomFrom(from)
    setCustomTo(
      addDays(to, -1),
    )
  }, [from, to])

  /* ==========================================================
     OUTSIDE CLICK + ESCAPE
     ========================================================== */

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown =
      (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target as Node,
          )
        ) {
          setOpen(false)
          setPickerTarget(null)
        }
      }

    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (
          event.key === 'Escape'
        ) {
          if (pickerTarget) {
            setPickerTarget(null)
            return
          }

          setOpen(false)
        }
      }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    )

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    open,
    pickerTarget,
  ])

  /* ==========================================================
     CURRENT PRESET
     ========================================================== */

  const currentPreset =
    useMemo<Preset>(() => {
      const today =
        getTodayDate()

      const tomorrow =
        addDays(
          today,
          1,
        )

      const yesterday =
        addDays(
          today,
          -1,
        )

      const weekStart =
        startOfWeek(today)

      const monthStart =
        startOfMonth(today)

      const lastMonthStart =
        previousMonthStart(
          today,
        )

      if (
        from === today &&
        to === tomorrow
      ) {
        return 'today'
      }

      if (
        from === yesterday &&
        to === today
      ) {
        return 'yesterday'
      }

      if (
        from === weekStart &&
        to === tomorrow
      ) {
        return 'this_week'
      }

      if (
        from === monthStart &&
        to === tomorrow
      ) {
        return 'this_month'
      }

      if (
        from === lastMonthStart &&
        to === monthStart
      ) {
        return 'last_month'
      }

      return 'custom'
    }, [
      from,
      to,
    ])

  /* ==========================================================
     DISPLAY RANGE
     ========================================================== */

  const displayRange =
    useMemo(() => {
      if (
        currentPreset !==
        'custom'
      ) {
        return null
      }

      if (
        !isValidDate(from) ||
        !isValidDate(to)
      ) {
        return null
      }

      const visibleTo =
        addDays(
          to,
          -1,
        )

      return (
        `${formatEthiopianDate(
          from,
          locale,
        )} – ` +
        `${formatEthiopianDate(
          visibleTo,
          locale,
        )}`
      )
    }, [
      currentPreset,
      from,
      to,
      locale,
    ])

  /* ==========================================================
     CURRENT SELECTION DISPLAY
     ========================================================== */

  const selectedPeriodLabel =
    currentPreset === 'custom'
      ? displayRange ||
        labels.custom
      : labels[currentPreset]

  /* ==========================================================
     APPLY RANGE
     ========================================================== */

  const applyRange = (
    nextFrom: string,
    nextTo: string,
  ) => {
    if (
      !nextFrom ||
      !nextTo
    ) {
      return
    }

    if (
      !isValidDate(nextFrom) ||
      !isValidDate(nextTo)
    ) {
      return
    }

    if (
      nextFrom >= nextTo
    ) {
      return
    }

    const params =
      new URLSearchParams(
        searchParams.toString(),
      )

    params.set(
      'from',
      nextFrom,
    )

    params.set(
      'to',
      nextTo,
    )

    router.push(
      `${pathname}?${params.toString()}` as Route,
    )

    setOpen(false)
    setPickerTarget(null)
  }

  /* ==========================================================
     PRESET SELECTION
     ========================================================== */

  const selectPreset = (
    preset: Exclude<
      Preset,
      'custom'
    >,
  ) => {
    const today =
      getTodayDate()

    const tomorrow =
      addDays(
        today,
        1,
      )

    if (
      preset === 'today'
    ) {
      applyRange(
        today,
        tomorrow,
      )

      return
    }

    if (
      preset === 'yesterday'
    ) {
      applyRange(
        addDays(
          today,
          -1,
        ),
        today,
      )

      return
    }

    if (
      preset === 'this_week'
    ) {
      applyRange(
        startOfWeek(today),
        tomorrow,
      )

      return
    }

    if (
      preset === 'this_month'
    ) {
      applyRange(
        startOfMonth(today),
        tomorrow,
      )

      return
    }

    if (
      preset === 'last_month'
    ) {
      applyRange(
        previousMonthStart(
          today,
        ),
        currentMonthStart(
          today,
        ),
      )
    }
  }

  /* ==========================================================
     PICKER CHANGE
     ========================================================== */

  const handlePickerChange = (
    value: string,
  ) => {
    if (
      pickerTarget === 'from'
    ) {
      setCustomFrom(value)

      if (
        value > customTo
      ) {
        setCustomTo(value)
      }

      setPickerTarget(null)

      return
    }

    if (
      pickerTarget === 'to'
    ) {
      setCustomTo(value)

      if (
        value < customFrom
      ) {
        setCustomFrom(value)
      }

      setPickerTarget(null)
    }
  }

  /* ==========================================================
     TRIGGER LABEL
     ========================================================== */

  const triggerLabel =
    currentPreset === 'custom'
      ? displayRange ||
        labels.custom
      : labels[currentPreset]

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* ======================================================
          TRIGGER
          ====================================================== */}

      <button
        type="button"
        onClick={() => {
          setOpen(
            value => !value,
          )
          setPickerTarget(null)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="
          inline-flex
          h-8
          max-w-[230px]
          items-center
          gap-1.5
          rounded-lg
          border
          border-cream-200
          bg-white
          px-2.5
          text-[10px]
          font-bold
          text-coffee-700
          shadow-sm
          transition
          hover:border-coffee-300
          hover:bg-cream-50
          active:scale-[0.98]
        "
      >
        <CalendarDays
          aria-hidden="true"
          className="
            h-3.5
            w-3.5
            shrink-0
            text-berbere-500
          "
        />

        <span className="truncate">
          {triggerLabel}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`
            h-3.5
            w-3.5
            shrink-0
            text-coffee-400
            transition-transform
            duration-200
            ${
              open
                ? 'rotate-180'
                : ''
            }
          `}
        />
      </button>

      {/* ======================================================
          DROPDOWN
          ====================================================== */}

      {open && (
        <div
          role="menu"
          className="
            absolute
            right-0
            top-full
            z-50
            mt-1.5
            w-[270px]
            overflow-visible
            rounded-xl
            border
            border-cream-200
            bg-white
            shadow-xl
          "
        >
          {/* ==================================================
              CURRENT SELECTION
              ================================================== */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-2
              border-b
              border-cream-100
              px-3
              py-2
            "
          >
            <div
              className="
                flex
                min-w-0
                items-center
                gap-2
              "
            >
              <div
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-cream-50
                  text-berbere-500
                "
              >
                <CalendarDays
                  className="h-3.5 w-3.5"
                />
              </div>

              <div className="min-w-0">
                <p
                  className="
                    text-[10px]
                    font-bold
                    text-coffee-400
                  "
                >
                  {isAm
                    ? 'የተመረጠው'
                    : 'Selected'}
                </p>

                <p
                  className="
                    truncate
                    text-[11px]
                    font-black
                    text-coffee-800
                  "
                >
                  {selectedPeriodLabel}
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              QUICK PERIODS
              ================================================== */}

          <div className="p-1.5">
            <div
              className="
                mb-1
                px-2
                text-[8px]
                font-bold
                uppercase
                tracking-wider
                text-coffee-400
              "
            >
              {isAm
                ? 'ፈጣን ምርጫ'
                : 'Quick Periods'}
            </div>

            <div className="space-y-0.5">
              {(
                [
                  'today',
                  'yesterday',
                  'this_week',
                  'this_month',
                  'last_month',
                ] as const
              ).map(
                preset => {
                  const selected =
                    currentPreset ===
                    preset

                  return (
                    <button
                      key={preset}
                      type="button"
                      role="menuitem"
                      onClick={() =>
                        selectPreset(
                          preset,
                        )
                      }
                      className={`
                        flex
                        h-7
                        w-full
                        items-center
                        rounded-lg
                        px-2.5
                        text-left
                        text-[10px]
                        font-semibold
                        transition
                        ${
                          selected
                            ? `
                              bg-cream-100
                              text-berbere-600
                            `
                            : `
                              text-coffee-700
                              hover:bg-cream-50
                            `
                        }
                      `}
                    >
                      <span className="flex-1">
                        {labels[preset]}
                      </span>

                      {selected && (
                        <Check
                          className="
                            h-3.5
                            w-3.5
                            text-berbere-500
                          "
                        />
                      )}
                    </button>
                  )
                },
              )}
            </div>
          </div>

          {/* ==================================================
              CUSTOM RANGE
              ================================================== */}

          <div
            className="
              border-t
              border-cream-100
              px-3
              pb-3
              pt-2
            "
          >
            <div
              className="
                mb-1.5
                text-[8px]
                font-bold
                uppercase
                tracking-wider
                text-coffee-400
              "
            >
              {isAm
                ? 'የተመረጠ ጊዜ'
                : 'Custom Range'}
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2
              "
            >
              {/* FROM */}

              <div className="relative">
                <span
                  className="
                    mb-1
                    block
                    text-[8px]
                    font-semibold
                    text-coffee-400
                  "
                >
                  {isAm
                    ? 'ከ'
                    : 'From'}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPickerTarget(
                      pickerTarget ===
                        'from'
                        ? null
                        : 'from',
                    )
                  }
                  className={`
                    flex
                    h-8
                    w-full
                    items-center
                    gap-1
                    rounded-lg
                    border
                    px-2
                    text-left
                    text-[9px]
                    font-semibold
                    transition
                    ${
                      pickerTarget ===
                      'from'
                        ? `
                          border-berbere-400
                          bg-white
                          ring-2
                          ring-berbere-100
                        `
                        : `
                          border-cream-200
                          bg-cream-50
                          text-coffee-700
                          hover:border-coffee-300
                        `
                    }
                  `}
                >
                  <CalendarDays
                    className="
                      h-3
                      w-3
                      shrink-0
                      text-berbere-500
                    "
                  />

                  <span className="truncate">
                    {formatEthiopianDate(
                      customFrom,
                      locale,
                    )}
                  </span>
                </button>

                {pickerTarget ===
                  'from' && (
                  <div
                    className="
                      absolute
                      right-0
                      top-[58px]
                      z-[60]
                    "
                  >
                    <EthiopianDatePicker
                      value={
                        customFrom
                      }
                      locale={
                        locale
                      }
                      onChange={
                        handlePickerChange
                      }
                      onClose={() =>
                        setPickerTarget(
                          null,
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {/* TO */}

              <div className="relative">
                <span
                  className="
                    mb-1
                    block
                    text-[8px]
                    font-semibold
                    text-coffee-400
                  "
                >
                  {isAm
                    ? 'እስከ'
                    : 'To'}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPickerTarget(
                      pickerTarget ===
                        'to'
                        ? null
                        : 'to',
                    )
                  }
                  className={`
                    flex
                    h-8
                    w-full
                    items-center
                    gap-1
                    rounded-lg
                    border
                    px-2
                    text-left
                    text-[9px]
                    font-semibold
                    transition
                    ${
                      pickerTarget ===
                      'to'
                        ? `
                          border-berbere-400
                          bg-white
                          ring-2
                          ring-berbere-100
                        `
                        : `
                          border-cream-200
                          bg-cream-50
                          text-coffee-700
                          hover:border-coffee-300
                        `
                    }
                  `}
                >
                  <CalendarDays
                    className="
                      h-3
                      w-3
                      shrink-0
                      text-berbere-500
                    "
                  />

                  <span className="truncate">
                    {formatEthiopianDate(
                      customTo,
                      locale,
                    )}
                  </span>
                </button>

                {pickerTarget ===
                  'to' && (
                  <div
                    className="
                      absolute
                      right-0
                      top-[58px]
                      z-[60]
                    "
                  >
                    <EthiopianDatePicker
                      value={
                        customTo
                      }
                      locale={
                        locale
                      }
                      onChange={
                        handlePickerChange
                      }
                      onClose={() =>
                        setPickerTarget(
                          null,
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                APPLY
                ================================================== */}

            <button
              type="button"
              onClick={() =>
                applyRange(
                  customFrom,
                  addDays(
                    customTo,
                    1,
                  ),
                )
              }
              disabled={
                !customFrom ||
                !customTo ||
                customFrom >
                  customTo
              }
              className="
                mt-2
                h-8
                w-full
                rounded-lg
                bg-[#1B2B50]
                px-3
                text-[10px]
                font-bold
                text-white
                shadow-sm
                transition
                hover:opacity-95
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {isAm
                ? 'ተግብር'
                : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

