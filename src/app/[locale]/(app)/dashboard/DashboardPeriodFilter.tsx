"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Route } from "next";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  CalendarDays,
  Check,
  ChevronDown,
} from "lucide-react";

import {
  CalendarDate,
  EthiopicCalendar,
  parseDate as parseCalendarDate,
  toCalendar,
} from "@internationalized/date";

import EthiopianDatePicker from "@/components/dashboard/EthiopianDatePicker";

/* ============================================================
   TYPES
============================================================ */

interface DashboardPeriodFilterProps {
  locale: string;
  from: string;
  to: string;
}

type Preset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "previous_month"
  | "custom";

type PickerTarget = "from" | "to" | null;

/* ============================================================
   CONSTANTS
============================================================ */

const TIME_ZONE = "Africa/Addis_Ababa";

const ETHIOPIAN_MONTHS_EN = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
];

const ETHIOPIAN_MONTHS_AM = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
];

/* ============================================================
   DATE HELPERS
============================================================ */

function getTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate(),
  ).padStart(2, "0");

  return [year, month, day].join("-");
}

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );
}

function addDays(
  dateString: string,
  days: number,
): string {
  const date = parseDate(dateString);

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return formatDate(date);
}

function startOfWeek(
  dateString: string,
): string {
  const date = parseDate(dateString);

  const day = date.getUTCDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  date.setUTCDate(
    date.getUTCDate() + difference,
  );

  return formatDate(date);
}

function startOfMonth(
  dateString: string,
): string {
  const [year, month] =
    dateString.split("-");

  return [
    year,
    month,
    "01",
  ].join("-");
}

function previousMonthStart(
  dateString: string,
): string {
  const date = parseDate(dateString);

  date.setUTCMonth(
    date.getUTCMonth() - 1,
  );

  date.setUTCDate(1);

  return formatDate(date);
}

/* ============================================================
   ETHIOPIAN DATE
============================================================ */

function gregorianToEthiopian(
  value: string,
): CalendarDate {
  return toCalendar(
    parseCalendarDate(value),
    new EthiopicCalendar(),
  );
}

function formatEthiopianDate(
  dateString: string,
  locale: string,
): string {
  const date =
    gregorianToEthiopian(dateString);

  const months =
    locale === "am"
      ? ETHIOPIAN_MONTHS_AM
      : ETHIOPIAN_MONTHS_EN;

  const month =
    months[date.month - 1] ??
    String(date.month);

  return (
    month +
    " " +
    date.day +
    ", " +
    date.year
  );
}

/* ============================================================
   VALIDATION
============================================================ */

function isValidDate(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = parseDate(value);

  return formatDate(date) === value;
}

/* ============================================================
   NORMALIZE DATE
============================================================ */

function normalizeDate(
  value: string,
): string {
  return value?.slice(0, 10) ?? "";
}

/* ============================================================
   COMPONENT
============================================================ */

export default function DashboardPeriodFilter({
  locale,
  from,
  to,
}: DashboardPeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const containerRef =
    useRef<HTMLDivElement>(null);

  const isAm = locale === "am";

  const [open, setOpen] =
    useState(false);

  const [
    pickerTarget,
    setPickerTarget,
  ] = useState<PickerTarget>(null);

  const [customFrom, setCustomFrom] =
    useState(
      normalizeDate(from),
    );

  const [customTo, setCustomTo] =
    useState(
      addDays(
        normalizeDate(to),
        -1,
      ),
    );

  /* ==========================================================
     LABELS
  ========================================================== */

  const labels = {
    today: isAm
      ? "ዛሬ"
      : "Today",

    yesterday: isAm
      ? "ትናንት"
      : "Yesterday",

    this_week: isAm
      ? "ይህ ሳምንት"
      : "This Week",

    this_month: isAm
      ? "ይህ ወር"
      : "This Month",

    previous_month: isAm
      ? "ያለፈው ወር"
      : "Previous Month",

    custom: isAm
      ? "የተመረጠ"
      : "Custom",
  };

  /* ==========================================================
     SYNC CUSTOM VALUES
  ========================================================== */

  useEffect(() => {
    const nextFrom =
      normalizeDate(from);

    const nextTo =
      normalizeDate(to);

    if (isValidDate(nextFrom)) {
      setCustomFrom(nextFrom);
    }

    if (isValidDate(nextTo)) {
      setCustomTo(
        addDays(
          nextTo,
          -1,
        ),
      );
    }
  }, [from, to]);

  /* ==========================================================
     OUTSIDE CLICK + ESC
  ========================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (
      event: MouseEvent,
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
        setPickerTarget(null);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key !== "Escape") {
        return;
      }

      if (pickerTarget) {
        setPickerTarget(null);
        return;
      }

      setOpen(false);
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    pickerTarget,
  ]);

  /* ==========================================================
     CURRENT PRESET

     `period` is the source of truth.

     Supported:
       today
       yesterday
       this_week
       this_month
       previous_month
       custom
  ========================================================== */

  const currentPreset =
    useMemo<Preset>(() => {
      const explicitPeriod =
        searchParams.get("period");

      if (
        explicitPeriod === "today" ||
        explicitPeriod === "yesterday" ||
        explicitPeriod === "this_week" ||
        explicitPeriod === "this_month" ||
        explicitPeriod === "previous_month" ||
        explicitPeriod === "custom"
      ) {
        return explicitPeriod;
      }

      /*
       * Backward compatibility for URLs that existed before
       * the `period` parameter was introduced.
       */

      const currentFrom =
        normalizeDate(from);

      const currentTo =
        normalizeDate(to);

      const today =
        getTodayDate();

      const tomorrow =
        addDays(
          today,
          1,
        );

      const yesterday =
        addDays(
          today,
          -1,
        );

      const weekStart =
        startOfWeek(today);

      const monthStart =
        startOfMonth(today);

      const previousStart =
        previousMonthStart(today);

      if (
        currentFrom === today &&
        currentTo === tomorrow
      ) {
        return "today";
      }

      if (
        currentFrom === yesterday &&
        currentTo === today
      ) {
        return "yesterday";
      }

      if (
        currentFrom === weekStart &&
        currentTo === tomorrow
      ) {
        return "this_week";
      }

      if (
        currentFrom === monthStart &&
        currentTo === tomorrow
      ) {
        return "this_month";
      }

      if (
        currentFrom === previousStart &&
        currentTo === monthStart
      ) {
        return "previous_month";
      }

      return "custom";
    }, [
      searchParams,
      from,
      to,
    ]);

  /* ==========================================================
     CUSTOM RANGE SUMMARY
  ========================================================== */

  const customRangeSummary =
    useMemo(() => {
      if (
        !isValidDate(customFrom) ||
        !isValidDate(customTo)
      ) {
        return null;
      }

      return (
        formatEthiopianDate(
          customFrom,
          locale,
        ) +
        " → " +
        formatEthiopianDate(
          customTo,
          locale,
        )
      );
    }, [
      customFrom,
      customTo,
      locale,
    ]);

  /* ==========================================================
     COMPACT TRIGGER LABEL
  ========================================================== */

  const triggerLabel =
    currentPreset === "custom"
      ? labels.custom
      : labels[currentPreset];

  /* ==========================================================
     APPLY RANGE
  ========================================================== */

  const applyRange = (
    nextFrom: string,
    nextTo: string,
    preset: Preset = "custom",
  ) => {
    if (
      !nextFrom ||
      !nextTo
    ) {
      return;
    }

    if (
      !isValidDate(nextFrom) ||
      !isValidDate(nextTo)
    ) {
      return;
    }

    if (nextFrom >= nextTo) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    params.set(
      "from",
      nextFrom,
    );

    params.set(
      "to",
      nextTo,
    );

    params.set(
      "period",
      preset,
    );

    router.push(
      `${pathname}?${params.toString()}` as Route,
    );

    setOpen(false);
    setPickerTarget(null);
  };

  /* ==========================================================
     PRESETS
  ========================================================== */

  const selectPreset = (
    preset: Exclude<
      Preset,
      "custom"
    >,
  ) => {
    const today =
      getTodayDate();

    const tomorrow =
      addDays(
        today,
        1,
      );

    switch (preset) {
      case "today":
        applyRange(
          today,
          tomorrow,
          "today",
        );
        break;

      case "yesterday":
        applyRange(
          addDays(
            today,
            -1,
          ),
          today,
          "yesterday",
        );
        break;

      case "this_week":
        applyRange(
          startOfWeek(today),
          tomorrow,
          "this_week",
        );
        break;

      case "this_month":
        applyRange(
          startOfMonth(today),
          tomorrow,
          "this_month",
        );
        break;

      case "previous_month":
        applyRange(
          previousMonthStart(
            today,
          ),
          startOfMonth(today),
          "previous_month",
        );
        break;
    }
  };

  /* ==========================================================
     DATE PICKER
  ========================================================== */

  const handlePickerChange = (
    value: string,
  ) => {
    if (!isValidDate(value)) {
      return;
    }

    if (
      pickerTarget === "from"
    ) {
      setCustomFrom(value);

      if (value > customTo) {
        setCustomTo(value);
      }

      setPickerTarget(null);

      return;
    }

    if (
      pickerTarget === "to"
    ) {
      setCustomTo(value);

      if (value < customFrom) {
        setCustomFrom(value);
      }

      setPickerTarget(null);
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* ======================================================
          COMPACT TRIGGER
      ====================================================== */}

      <button
        type="button"
        onClick={() => {
          setOpen(
            (value) => !value,
          );

          setPickerTarget(null);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          isAm
            ? "ጊዜ፡ " +
              triggerLabel
            : "Period: " +
              triggerLabel
        }
        className="
          inline-flex
          h-9
          min-w-[112px]
          max-w-[150px]
          items-center
          justify-center
          gap-1.5
          rounded-lg
          border
          border-cream-200
          bg-white
          px-2.5
          text-[11px]
          font-bold
          text-coffee-700
          shadow-sm
          transition
          duration-150
          hover:border-berbere-300
          hover:bg-cream-50
          active:scale-[0.98]
          focus:outline-none
          focus:ring-2
          focus:ring-berbere-500/20
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
                ? "rotate-180"
                : ""
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
          aria-label={
            isAm
              ? "የጊዜ ምርጫ"
              : "Period selection"
          }
          className="
            absolute
            right-0
            top-full
            z-50
            mt-2
            w-[270px]
            overflow-visible
            rounded-xl
            border
            border-cream-200
            bg-white
            shadow-xl
            ring-1
            ring-black/[0.03]
          "
        >
          {/* ==================================================
              CURRENT PERIOD
          ================================================== */}

          <div
            className="
              border-b
              border-cream-100
              px-3
              py-2.5
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div className="min-w-0">
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-coffee-400
                  "
                >
                  {isAm
                    ? "የአሁኑ ጊዜ"
                    : "Current period"}
                </p>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-[11px]
                    font-bold
                    text-coffee-800
                  "
                >
                  {triggerLabel}
                </p>
              </div>

              <div
                className="
                  shrink-0
                  rounded-md
                  bg-cream-50
                  px-2
                  py-1
                  text-[9px]
                  font-semibold
                  text-coffee-500
                "
              >
                {isAm
                  ? "ዳሽቦርድ"
                  : "Dashboard"}
              </div>
            </div>

            {currentPreset ===
              "custom" &&
              customRangeSummary && (
                <p
                  className="
                    mt-1.5
                    truncate
                    text-[9px]
                    font-medium
                    text-coffee-500
                  "
                >
                  {customRangeSummary}
                </p>
              )}
          </div>

          {/* ==================================================
              QUICK PERIODS
          ================================================== */}

          <div className="p-2.5">
            <div
              className="
                px-2
                pb-1.5
                text-[9px]
                font-bold
                uppercase
                tracking-wide
                text-coffee-400
              "
            >
              {isAm
                ? "ፈጣን ምርጫ"
                : "Quick periods"}
            </div>

            <div className="space-y-0.5">
              {(
                [
                  "today",
                  "yesterday",
                  "this_week",
                  "this_month",
                  "previous_month",
                ] as const
              ).map((preset) => {
                const selected =
                  currentPreset ===
                  preset;

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
                      h-9
                      w-full
                      items-center
                      gap-2
                      rounded-lg
                      px-2.5
                      text-left
                      text-[11px]
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
                    <CalendarDays
                      aria-hidden="true"
                      className={`
                        h-3.5
                        w-3.5
                        shrink-0
                        ${
                          selected
                            ? "text-berbere-500"
                            : "text-coffee-400"
                        }
                      `}
                    />

                    <span className="flex-1">
                      {labels[preset]}
                    </span>

                    {selected && (
                      <Check
                        aria-hidden="true"
                        className="
                          h-3.5
                          w-3.5
                          shrink-0
                          text-berbere-500
                        "
                      />
                    )}
                  </button>
                );
              })}
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
              pt-2.5
            "
          >
            <div className="mb-2">
              <p
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-coffee-400
                "
              >
                {isAm
                  ? "የተመረጠ ጊዜ"
                  : "Custom range"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* FROM */}

              <div className="relative">
                <span
                  className="
                    mb-1
                    block
                    text-[9px]
                    font-semibold
                    text-coffee-400
                  "
                >
                  {isAm
                    ? "ከ"
                    : "From"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPickerTarget(
                      pickerTarget ===
                        "from"
                        ? null
                        : "from",
                    )
                  }
                  className={`
                    flex
                    h-9
                    w-full
                    items-center
                    gap-1.5
                    rounded-lg
                    border
                    px-2
                    text-left
                    text-[9px]
                    font-semibold
                    transition
                    ${
                      pickerTarget ===
                      "from"
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
                    aria-hidden="true"
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
                  "from" && (
                  <div
                    className="
                      absolute
                      right-0
                      top-[62px]
                      z-[60]
                    "
                  >
                    <EthiopianDatePicker
                      value={customFrom}
                      locale={locale}
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
                    text-[9px]
                    font-semibold
                    text-coffee-400
                  "
                >
                  {isAm
                    ? "እስከ"
                    : "To"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPickerTarget(
                      pickerTarget ===
                        "to"
                        ? null
                        : "to",
                    )
                  }
                  className={`
                    flex
                    h-9
                    w-full
                    items-center
                    gap-1.5
                    rounded-lg
                    border
                    px-2
                    text-left
                    text-[9px]
                    font-semibold
                    transition
                    ${
                      pickerTarget ===
                      "to"
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
                    aria-hidden="true"
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
                  "to" && (
                  <div
                    className="
                      absolute
                      right-0
                      top-[62px]
                      z-[60]
                    "
                  >
                    <EthiopianDatePicker
                      value={customTo}
                      locale={locale}
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

            {/* APPLY */}

            <button
              type="button"
              onClick={() =>
                applyRange(
                  customFrom,
                  addDays(
                    customTo,
                    1,
                  ),
                  "custom",
                )
              }
              disabled={
                !customFrom ||
                !customTo ||
                customFrom >
                  customTo
              }
              className="
                mt-2.5
                h-9
                w-full
                rounded-lg
                bg-berbere-500
                px-3
                text-[11px]
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-berbere-600
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-40
                focus:outline-none
                focus:ring-2
                focus:ring-berbere-500/20
              "
            >
              {isAm
                ? "ተግብር"
                : "Apply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}