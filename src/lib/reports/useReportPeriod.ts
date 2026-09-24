"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatDateInput,
  formatDateRange,
  getDatesBetween,
  getStartOfMonth,
  getStartOfWeek,
  parseDateInput,
  shiftDate,
  sameDate,
} from "@/lib/reports/daily-report-format";

export type ReportPreset = "today" | "yesterday" | "week" | "month" | "custom";

type ReportPeriod = {
  from: Date;
  to: Date;
};

type UseReportPeriodOptions = {
  today: Date;
  locale: string;
};

export function useReportPeriod({ today, locale }: UseReportPeriodOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAm = locale === "am";
  const queryDate = searchParams.get("date");

  const initialDate = useMemo(() => {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      const parsed = parseDateInput(queryDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return today;
  }, [queryDate, today]);

  const [reportPreset, setReportPreset] = useState<ReportPreset>(() =>
    sameDate(initialDate, today)
      ? "today"
      : sameDate(initialDate, shiftDate(today, -1))
        ? "yesterday"
        : "custom",
  );
  const [customFrom, setCustomFrom] = useState(() => formatDateInput(initialDate));
  const [customTo, setCustomTo] = useState(() => formatDateInput(initialDate));

  const reportPeriod = useMemo<ReportPeriod>(() => {
    switch (reportPreset) {
      case "today":
        return { from: today, to: today };
      case "yesterday": {
        const yesterday = shiftDate(today, -1);
        return { from: yesterday, to: yesterday };
      }
      case "week":
        return { from: getStartOfWeek(today), to: today };
      case "month":
        return { from: getStartOfMonth(today), to: today };
      case "custom": {
        const from = parseDateInput(customFrom);
        const to = parseDateInput(customTo);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
          return { from: today, to: today };
        }
        return from <= to ? { from, to } : { from: to, to: from };
      }
      default:
        return { from: today, to: today };
    }
  }, [reportPreset, today, customFrom, customTo]);

  const reportPeriodLabel = useMemo(() => {
    switch (reportPreset) {
      case "today": return isAm ? "ዛሬ" : "Today";
      case "yesterday": return isAm ? "ትናንት" : "Yesterday";
      case "week": return isAm ? "በዚህ ሳምንት" : "This Week";
      case "month": return isAm ? "በዚህ ወር" : "This Month";
      case "custom": return formatDateRange(reportPeriod.from, reportPeriod.to, isAm);
      default: return "";
    }
  }, [reportPreset, reportPeriod, isAm]);

  const reportPeriodDetail = useMemo(
    () => formatDateRange(reportPeriod.from, reportPeriod.to, isAm),
    [reportPeriod, isAm],
  );

  const periodDates = useMemo(
    () => getDatesBetween(reportPeriod.from, reportPeriod.to),
    [reportPeriod],
  );

  const applyPreset = useCallback((preset: ReportPreset) => {
    setReportPreset(preset);
    if (preset === "today" || preset === "yesterday") {
      const date = preset === "today" ? today : shiftDate(today, -1);
      router.replace(`/${locale}/reports/daily?date=${formatDateInput(date)}`);
    }
  }, [locale, router, today]);

  const applyCustomRange = useCallback(() => {
    const from = parseDateInput(customFrom);
    const to = parseDateInput(customTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;
    setReportPreset("custom");
  }, [customFrom, customTo]);

  const goPreviousDay = useCallback(() => {
    const previous = shiftDate(reportPeriod.from, -1);
    setCustomFrom(formatDateInput(previous));
    setCustomTo(formatDateInput(previous));
    setReportPreset("custom");
  }, [reportPeriod.from]);

  const goNextDay = useCallback(() => {
    const next = shiftDate(reportPeriod.to, 1);
    if (next > today) return;
    setCustomFrom(formatDateInput(next));
    setCustomTo(formatDateInput(next));
    setReportPreset("custom");
  }, [reportPeriod.to, today]);

  return {
    reportPreset,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    reportPeriod,
    reportPeriodLabel,
    reportPeriodDetail,
    periodDates,
    applyPreset,
    applyCustomRange,
    goPreviousDay,
    goNextDay,
  };
}
