"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ReportDataResult<T> = {
  report: T | null;
  reportDays?: number;
  lastUpdated?: Date | null;
};

type UseReportDataOptions<T> = {
  load: () => Promise<ReportDataResult<T>>;
  enabled?: boolean;
  ready?: boolean;
  errorMessage?: string;
};

export function useReportData<T>({
  load,
  enabled = true,
  ready = true,
  errorMessage = "Unable to load the report. Please try again.",
}: UseReportDataOptions<T>) {
  const [report, setReport] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportDays, setReportDays] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestId = useRef(0);

  const loadReport = useCallback(async (isRefresh: boolean) => {
    const currentRequest = ++requestId.current;
    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await load();
      if (currentRequest !== requestId.current) return;
      setReport(result.report);
      setReportDays(result.reportDays ?? (result.report ? 1 : 0));
      setLastUpdated(result.lastUpdated ?? null);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      console.error("[ReportData] Failed to load report:", cause);
      setError(errorMessage);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled, errorMessage, load]);

  useEffect(() => {
    if (!ready) return;

    let active = true;
    queueMicrotask(() => {
      if (active) void loadReport(false);
    });
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, [loadReport, ready]);

  const refresh = useCallback(() => loadReport(true), [loadReport]);

  return {
    report,
    loading,
    refreshing,
    error,
    reportDays,
    lastUpdated,
    refresh,
  };
}
