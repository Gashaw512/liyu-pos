// src/app/[locale]/(app)/reports/daily/page.tsx

"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Share2,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getDailyReport,
} from "@/lib/reports/daily-report.service";

import type {
  DailyReport,
  LowStockSummary,
} from "@/lib/reports/report.types";

import {
  useBusinessContext,
} from "@/lib/auth/useBusinessContext";

/* ============================================================
   HELPERS
============================================================ */

function numberValue(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString()} ETB`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

/* ============================================================
   PAGE
============================================================ */

export default function DailyReportPage() {
  const params = useParams();
  const router = useRouter();

  const locale = String(params.locale || "en");
  const isAm = locale === "am";

  /* ==========================================================
     BUSINESS CONTEXT
  ========================================================== */

  const {
    businessId,
    branchId,
    userId,
    loading: contextLoading,
    error: contextError,
    refresh: refreshContext,
  } = useBusinessContext();

  /* ==========================================================
     STATE
  ========================================================== */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ==========================================================
     TRANSLATION
  ========================================================== */

  const t = useCallback(
    (en: string, am: string) => (isAm ? am : en),
    [isAm],
  );

  /* ==========================================================
     LOAD REPORT
  ========================================================== */

  const loadReport = useCallback(
    async (showRefresh = false) => {
      if (!businessId || !branchId || !userId) {
        return;
      }

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const dailyReport = await getDailyReport({
          businessId,
          branchId,
          userId,
          date: new Date(),
          allowRemote: true,
        });

        setReport(dailyReport);

        const updatedValue = dailyReport.sync?.lastUpdated;

        if (updatedValue) {
          const updated = new Date(updatedValue);

          if (!Number.isNaN(updated.getTime())) {
            setLastUpdated(updated);
          }
        }
      } catch (error) {
        console.error(
          "[DailyReport] Failed to load report:",
          error,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId, branchId, userId],
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    if (contextLoading) {
      return;
    }

    if (!businessId || !branchId || !userId) {
      setLoading(false);
      return;
    }

    void loadReport();
  }, [
    contextLoading,
    businessId,
    branchId,
    userId,
    loadReport,
  ]);

  /* ==========================================================
     SAFE REPORT DATA
  ========================================================== */

  const financials = report?.financials;
  const expenses = report?.expenses;
  const inventory = report?.inventory;

  const categories = report?.categories ?? [];
  const products = report?.products ?? [];

  const activeShift = report?.activeShift ?? null;
  const sync = report?.sync;

  /* ==========================================================
     FINANCIAL VALUES
  ========================================================== */

  const salesTotal = numberValue(
    financials?.revenue,
  );

  const grossProfit = numberValue(
    financials?.grossProfit,
  );

  const netProfit = numberValue(
    financials?.netProfit,
  );

  const totalReceived = numberValue(
    financials?.totalReceived ?? financials?.revenue,
  );

  const tips = numberValue(
    financials?.tips,
  );

  const expenseTotal = numberValue(
    expenses?.total,
  );

  /*
   * IMPORTANT:
   *
   * DailyFinancialSummary already contains these values.
   *
   * Do NOT use:
   * report.summary.orders
   * report.summary.itemsSold
   */

  const orderCount = numberValue(
    financials?.transactions,
  );

  const itemsSold = numberValue(
    financials?.itemsSold,
  );

  /* ==========================================================
     PAYMENT SUMMARY
  ========================================================== */

  const paymentSummary = [
    {
      label: "Cash",
      am: "ካሽ",
      amount: numberValue(financials?.cash),
    },
    {
      label: "Telebirr",
      am: "ቴሌብር",
      amount: numberValue(financials?.telebirr),
    },
    {
      label: "Bank",
      am: "ባንክ",
      amount: numberValue(financials?.bank),
    },
    {
      label: "Card",
      am: "ካርድ",
      amount: numberValue(financials?.card),
    },
    {
      label: "Other",
      am: "ሌላ",
      amount: numberValue(financials?.other),
    },
  ];

  const paymentTotal = paymentSummary.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  /* ==========================================================
     EXPENSE CATEGORIES
  ========================================================== */

  const expenseCategories = expenses?.byCategory ?? [];

  const expenseTransactionCount = numberValue(
    expenses?.transactions,
  );

  /* ==========================================================
     PRODUCT REPORT
  ========================================================== */

  const productReport = [...products]
    .sort(
      (a, b) =>
        numberValue(b.revenue) -
        numberValue(a.revenue),
    )
    .slice(0, 20);

  /* ==========================================================
     CATEGORY REPORT
  ========================================================== */

  const categoryReport = [...categories].sort(
    (a, b) =>
      numberValue(b.revenue) -
      numberValue(a.revenue),
  );

  /* ==========================================================
     INVENTORY
  ========================================================== */

  /*
   * IMPORTANT:
   *
   * DailyInventorySummary defines:
   *
   * lowStock: LowStockSummary[]
   *
   * It does NOT define:
   *
   * lowStockProducts
   */

  const lowStockProducts: LowStockSummary[] =
    inventory?.lowStock ?? [];

  const lowStockCount = numberValue(
    inventory?.lowStockCount,
  );

  const outOfStockCount = numberValue(
    inventory?.outOfStockCount,
  );

  /* ==========================================================
     SHIFT / CASH
  ========================================================== */

  const openingCash = numberValue(
    activeShift?.opening_cash,
  );

  const cashSales = numberValue(
    financials?.cash,
  );

  const expectedCash = openingCash + cashSales;

  const actualCash =
    activeShift?.actual_cash != null
      ? numberValue(activeShift.actual_cash)
      : null;

  const cashDifference =
    actualCash != null
      ? actualCash - expectedCash
      : null;

  /* ==========================================================
     SYNC
  ========================================================== */

  const remoteAvailable =
    sync?.remoteAvailable ?? false;

  const remoteSalesCount = numberValue(
    sync?.remoteSales,
  );

  const localOnlySalesCount = numberValue(
    sync?.localOnlySales,
  );

  /* ==========================================================
     DATE
  ========================================================== */

  const reportDate = new Date().toLocaleDateString(
    isAm ? "am-ET" : "en-ET",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  /* ==========================================================
     SHARE REPORT
  ========================================================== */

  const shareReport = useCallback(async () => {
    const text = [
      "LIYU POS — DAILY REPORT",
      reportDate,
      "",
      `Sales: ${formatMoney(salesTotal)}`,
      `Tips: ${formatMoney(tips)}`,
      `Total Received: ${formatMoney(totalReceived)}`,
      `Expenses: ${formatMoney(expenseTotal)}`,
      `Net Profit: ${formatMoney(netProfit)}`,
      "",
      `Orders: ${formatNumber(orderCount)}`,
      `Items Sold: ${formatNumber(itemsSold)}`,
      "",
      "PAYMENTS",
      `Cash: ${formatMoney(
        numberValue(financials?.cash),
      )}`,
      `Telebirr: ${formatMoney(
        numberValue(financials?.telebirr),
      )}`,
      `Bank: ${formatMoney(
        numberValue(financials?.bank),
      )}`,
      `Card: ${formatMoney(
        numberValue(financials?.card),
      )}`,
      `Other: ${formatMoney(
        numberValue(financials?.other),
      )}`,
      "",
      `Shift: ${activeShift ? "Open" : "Closed"}`,
    ].join("\n");

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.share
      ) {
        await navigator.share({
          title: "Liyu POS Daily Report",
          text,
        });

        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(text);

        window.alert(
          t(
            "Report copied to clipboard.",
            "ሪፖርቱ ወደ clipboard ተቀድቷል።",
          ),
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "[DailyReport] Unable to share:",
        error,
      );
    }
  }, [
    reportDate,
    salesTotal,
    tips,
    totalReceived,
    expenseTotal,
    netProfit,
    orderCount,
    itemsSold,
    financials,
    activeShift,
    t,
  ]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (contextLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>

          <p className="text-sm font-black text-coffee-700">
            {t(
              "Preparing today’s report...",
              "የዛሬን ሪፖርት በማዘጋጀት ላይ...",
            )}
          </p>

          <p className="text-[10px] text-coffee-400">
            {t(
              "Checking local and remote records",
              "የlocal እና remote መረጃዎችን በመፈተሽ ላይ",
            )}
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     CONTEXT ERROR
  ========================================================== */

  if (!businessId || !branchId || !userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-coffee-700/10 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-50">
            <AlertTriangle className="h-5 w-5 text-gold-600" />
          </div>

          <h1 className="mt-4 text-base font-black text-coffee-700">
            {t(
              "Business context unavailable",
              "የንግድ መረጃ አልተገኘም",
            )}
          </h1>

          <p className="mt-2 text-xs leading-5 text-coffee-500">
            {contextError ||
              t(
                "Your account is not currently connected to a business and branch.",
                "የእርስዎ መለያ ከንግድ እና ቅርንጫፍ ጋር አልተገናኘም።",
              )}
          </p>

          <button
            type="button"
            onClick={() => {
              void refreshContext();
            }}
            className="mt-5 h-10 rounded-xl bg-berbere-500 px-4 text-xs font-black text-white transition hover:bg-berbere-600 active:scale-95"
          >
            {t(
              "Try Again",
              "እንደገና ሞክር",
            )}
          </button>
        </div>
      </main>
    );
  }

  /* ==========================================================
     MAIN PAGE
  ========================================================== */

  return (
    <main className="min-h-screen bg-cream-100 pb-28">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(`/${locale}/reports`)
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-coffee-700/10 bg-white text-coffee-500 shadow-sm transition hover:bg-cream-50 active:scale-95"
              aria-label={t(
                "Back",
                "ተመለስ",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-xl font-black text-coffee-700 sm:text-2xl">
                  {t(
                    "Daily Business Report",
                    "የዕለት የንግድ ሪፖርት",
                  )}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black ${
                    activeShift
                      ? "border-berbere-200 bg-berbere-50 text-berbere-600"
                      : "border-coffee-200 bg-cream-200 text-coffee-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeShift
                        ? "bg-berbere-500"
                        : "bg-coffee-400"
                    }`}
                  />

                  {activeShift
                    ? t(
                        "Shift Open",
                        "ፈረቃ ክፍት",
                      )
                    : t(
                        "Shift Closed",
                        "ፈረቃ ተዘግቷል",
                      )}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-coffee-500">

                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {reportDate}
                </span>

                {lastUpdated && (
                  <span className="hidden items-center gap-1 sm:flex">
                    <Clock3 className="h-3 w-3" />

                    {lastUpdated.toLocaleTimeString(
                      isAm ? "am-ET" : "en-ET",
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <div
              className={`hidden h-10 items-center gap-2 rounded-xl border px-3 text-[10px] font-bold sm:flex ${
                remoteAvailable
                  ? "border-berbere-200 bg-berbere-50 text-berbere-600"
                  : "border-gold-200 bg-gold-50 text-gold-700"
              }`}
            >
              {remoteAvailable ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}

              {remoteAvailable
                ? t(
                    "Remote connected",
                    "Remote ተገናኝቷል",
                  )
                : t(
                    "Remote unavailable",
                    "Remote አልተገናኘም",
                  )}
            </div>

            <button
              type="button"
              onClick={() => void loadReport(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-coffee-700/10 bg-white px-3 text-xs font-bold text-coffee-500 shadow-sm transition hover:bg-cream-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              {t(
                "Refresh",
                "አድስ",
              )}
            </button>

            <button
              type="button"
              onClick={() => void shareReport()}
              className="flex h-10 items-center gap-2 rounded-xl bg-berbere-500 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-berbere-600 active:scale-95"
            >
              <Share2 className="h-3.5 w-3.5" />

              {t(
                "Share",
                "አጋራ",
              )}
            </button>
          </div>
        </header>

        {/* ======================================================
            KPI CARDS
        ====================================================== */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          {/* TOTAL RECEIVED */}

          <div className="rounded-2xl bg-berbere-500 p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/60">
                  {t(
                    "Total Received",
                    "ጠቅላላ የተቀበለ",
                  )}
                </p>

                <p className="mt-2 font-mono text-xl font-black text-white sm:text-2xl">
                  {formatMoney(totalReceived)}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <CircleDollarSign className="h-4 w-4 text-white" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-white/60">
              {formatMoney(salesTotal)}{" "}
              {t(
                "sales + tips",
                "ሽያጭ + ጉርሻ",
              )}
            </p>
          </div>

          {/* EXPENSES */}

          <div className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-coffee-400">
                  {t(
                    "Expenses",
                    "ወጪ",
                  )}
                </p>

                <p className="mt-2 font-mono text-xl font-black text-coffee-700 sm:text-2xl">
                  {formatMoney(expenseTotal)}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50">
                <ArrowDownRight className="h-4 w-4 text-gold-600" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-coffee-400">
              {formatNumber(expenseTransactionCount)}{" "}
              {t(
                "expense records",
                "የወጪ መዝገቦች",
              )}
            </p>
          </div>

          {/* NET PROFIT */}

          <div className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-coffee-400">
                  {t(
                    "Net Profit",
                    "የተጣራ ትርፍ",
                  )}
                </p>

                <p
                  className={`mt-2 font-mono text-xl font-black sm:text-2xl ${
                    netProfit >= 0
                      ? "text-berbere-600"
                      : "text-gold-700"
                  }`}
                >
                  {formatMoney(netProfit)}
                </p>
              </div>

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  netProfit >= 0
                    ? "bg-berbere-50"
                    : "bg-gold-50"
                }`}
              >
                {netProfit >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-berbere-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-gold-700" />
                )}
              </div>
            </div>

            <p className="mt-2 text-[9px] text-coffee-400">
              {t(
                "After expenses",
                "ከወጪ በኋላ",
              )}
            </p>
          </div>

          {/* ORDERS */}

          <div className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-coffee-400">
                  {t(
                    "Orders",
                    "ትዕዛዞች",
                  )}
                </p>

                <p className="mt-2 font-mono text-xl font-black text-coffee-700 sm:text-2xl">
                  {formatNumber(orderCount)}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50">
                <ShoppingBag className="h-4 w-4 text-gold-700" />
              </div>
            </div>

            <p className="mt-2 text-[9px] text-coffee-400">
              {formatNumber(itemsSold)}{" "}
              {t(
                "items sold",
                "እቃዎች ተሸጡ",
              )}
            </p>
          </div>
        </section>

        {/* ======================================================
            REPORT DATA / SYNC
        ====================================================== */}

        <section className="rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-coffee-400">
                {t(
                  "Report Data",
                  "የሪፖርት መረጃ",
                )}
              </p>

              <p className="mt-1 text-xs font-bold text-coffee-700">
                {t(
                  "Remote records are combined with genuinely local-only offline transactions.",
                  "Remote መረጃ ከበእውነት local-only offline ግብይቶች ጋር ተጣምሯል።",
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-berbere-100 bg-berbere-50 px-2.5 py-1.5 text-[9px] font-bold text-berbere-600">
                <Wifi className="h-3 w-3" />

                {formatNumber(remoteSalesCount)}{" "}

                {t(
                  "remote sales",
                  "remote ሽያጭ",
                )}
              </span>

              {localOnlySalesCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gold-100 bg-gold-50 px-2.5 py-1.5 text-[9px] font-bold text-gold-700">
                  <WifiOff className="h-3 w-3" />

                  {formatNumber(localOnlySalesCount)}{" "}

                  {t(
                    "offline only",
                    "offline ብቻ",
                  )}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================
            FINANCIAL + EXPENSE
        ====================================================== */}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* FINANCIAL OVERVIEW */}

          <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

            <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
              <TrendingUp className="h-4 w-4 text-berbere-500" />

              <div>
                <h2 className="text-sm font-black text-coffee-700">
                  {t(
                    "Financial Overview",
                    "የገንዘብ አጠቃላይ እይታ",
                  )}
                </h2>

                <p className="text-[10px] text-coffee-400">
                  {t(
                    "Where the business stands today",
                    "የንግዱ የዛሬ ሁኔታ",
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4">

              <div className="flex items-center justify-between">
                <span className="text-xs text-coffee-500">
                  {t(
                    "Sales",
                    "ሽያጭ",
                  )}
                </span>

                <span className="font-mono text-sm font-black text-coffee-700">
                  {formatMoney(salesTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-coffee-500">
                  {t(
                    "Tips",
                    "ጉርሻ",
                  )}
                </span>

                <span className="font-mono text-sm font-bold text-coffee-700">
                  {formatMoney(tips)}
                </span>
              </div>

              <div className="h-px bg-cream-200" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-coffee-700">
                  {t(
                    "Total Received",
                    "ጠቅላላ የተቀበለ",
                  )}
                </span>

                <span className="font-mono text-base font-black text-berbere-500">
                  {formatMoney(totalReceived)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-coffee-500">
                  {t(
                    "Expenses",
                    "ወጪ",
                  )}
                </span>

                <span className="font-mono text-sm font-black text-gold-700">
                  - {formatMoney(expenseTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3.5 py-3">
                <span className="text-xs font-black text-coffee-700">
                  {t(
                    "Net Profit",
                    "የተጣራ ትርፍ",
                  )}
                </span>

                <span
                  className={`font-mono text-base font-black ${
                    netProfit >= 0
                      ? "text-berbere-600"
                      : "text-gold-700"
                  }`}
                >
                  {formatMoney(netProfit)}
                </span>
              </div>

              {grossProfit !== 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-coffee-400">
                    {t(
                      "Gross Profit",
                      "ጠቅላላ ትርፍ",
                    )}
                  </span>

                  <span className="font-mono text-xs font-bold text-berbere-600">
                    {formatMoney(grossProfit)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* EXPENSES */}

          <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

            <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
              <ArrowDownRight className="h-4 w-4 text-gold-600" />

              <div>
                <h2 className="text-sm font-black text-coffee-700">
                  {t(
                    "Today’s Expenses",
                    "የዛሬ ወጪዎች",
                  )}
                </h2>

                <p className="text-[10px] text-coffee-400">
                  {t(
                    "Money spent by expense category",
                    "በወጪ ምድብ የወጣ ገንዘብ",
                  )}
                </p>
              </div>
            </div>

            <div className="p-4">

              {expenseCategories.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-coffee-400">
                    {t(
                      "No expenses recorded today.",
                      "ዛሬ ምንም ወጪ አልተመዘገበም።",
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenseCategories.map((item) => {
                    const amount = numberValue(
                      item.amount,
                    );

                    const percentage =
                      expenseTotal > 0
                        ? (amount / expenseTotal) * 100
                        : 0;

                    return (
                      <div key={item.category}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-coffee-700">
                            {item.category}
                          </span>

                          <span className="font-mono text-xs font-black text-gold-700">
                            {formatMoney(amount)}
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-cream-200">
                          <div
                            className="h-full rounded-full bg-gold-400"
                            style={{
                              width: `${Math.min(
                                percentage,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {expenseTotal > 0 && (
                <div className="mt-4 flex items-center justify-between border-t border-cream-200 pt-3">
                  <span className="text-xs font-black text-coffee-700">
                    {t(
                      "Total Expenses",
                      "ጠቅላላ ወጪ",
                    )}
                  </span>

                  <span className="font-mono font-black text-gold-700">
                    {formatMoney(expenseTotal)}
                  </span>
                </div>
              )}
            </div>
          </section>
        </section>

        {/* ======================================================
            PAYMENTS
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

          <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
            <Wallet className="h-4 w-4 text-berbere-500" />

            <div>
              <h2 className="text-sm font-black text-coffee-700">
                {t(
                  "Payment Summary",
                  "የክፍያ ማጠቃለያ",
                )}
              </h2>

              <p className="text-[10px] text-coffee-400">
                {t(
                  "How customers paid today",
                  "ደንበኞች ዛሬ እንዴት እንደከፈሉ",
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-cream-200 sm:grid-cols-5">

            {paymentSummary.map((item) => (
              <div
                key={item.label}
                className="p-4"
              >
                <p className="text-[9px] font-bold text-coffee-400">
                  {t(
                    item.label,
                    item.am,
                  )}
                </p>

                <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                  {formatMoney(item.amount)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-cream-200 bg-cream-100/70 px-4 py-3">
            <span className="text-xs font-black text-coffee-700">
              {t(
                "Payment Total",
                "ጠቅላላ ክፍያ",
              )}
            </span>

            <span className="font-mono font-black text-berbere-500">
              {formatMoney(paymentTotal)}
            </span>
          </div>
        </section>

        {/* ======================================================
            PRODUCTS SOLD
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

          <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
            <ShoppingBag className="h-4 w-4 text-berbere-500" />

            <div>
              <h2 className="text-sm font-black text-coffee-700">
                {t(
                  "Products Sold Today",
                  "ዛሬ የተሸጡ ምርቶች",
                )}
              </h2>

              <p className="text-[10px] text-coffee-400">
                {t(
                  "Best-selling products by quantity and revenue",
                  "በብዛትና በገቢ የተሸጡ ምርቶች",
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">

              <thead className="bg-cream-50">
                <tr>

                  <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    #
                  </th>

                  <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    {t(
                      "Product",
                      "ምርት",
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    {t(
                      "Qty",
                      "ብዛት",
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    {t(
                      "Revenue",
                      "ገቢ",
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>

                {productReport.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-xs text-coffee-400"
                    >
                      {t(
                        "No product sales recorded today.",
                        "ዛሬ ምንም የምርት ሽያጭ አልተመዘገበም።",
                      )}
                    </td>
                  </tr>
                ) : (
                  productReport.map(
                    (product, index) => (
                      <tr
                        key={
                          product.id ??
                          `${product.name}-${index}`
                        }
                        className="border-t border-cream-200 transition hover:bg-cream-50"
                      >

                        <td className="px-4 py-3 font-mono text-xs text-coffee-400">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-coffee-700">
                            {product.name ||
                              t(
                                "Unknown Product",
                                "ያልታወቀ ምርት",
                              )}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-coffee-500">
                          {formatNumber(
                            numberValue(
                              product.quantity,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-black text-berbere-600">
                          {formatMoney(
                            numberValue(
                              product.revenue,
                            ),
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ======================================================
            CATEGORY REPORT
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

          <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
            <BarChart3 className="h-4 w-4 text-berbere-500" />

            <div>
              <h2 className="text-sm font-black text-coffee-700">
                {t(
                  "Sales by Category",
                  "ሽያጭ በምድብ",
                )}
              </h2>

              <p className="text-[10px] text-coffee-400">
                {t(
                  "Which category generated the most sales",
                  "የትኛው ምድብ ብዙ ሽያጭ እንዳመጣ",
                )}
              </p>
            </div>
          </div>

          <div className="p-4">

            {categoryReport.length === 0 ? (
              <div className="py-8 text-center text-xs text-coffee-400">
                {t(
                  "No category data available.",
                  "የምድብ መረጃ የለም።",
                )}
              </div>
            ) : (
              <div className="space-y-4">

                {categoryReport.map(
                  (category) => {
                    const revenue =
                      numberValue(
                        category.revenue,
                      );

                    const quantity =
                      numberValue(
                        category.quantity,
                      );

                    const percentage =
                      salesTotal > 0
                        ? (revenue / salesTotal) *
                          100
                        : 0;

                    return (
                      <div
                        key={
                          category.id ??
                          category.name
                        }
                      >

                        <div className="mb-1 flex items-center justify-between">

                          <div>
                            <p className="text-xs font-black text-coffee-700">
                              {category.name}
                            </p>

                            <p className="text-[9px] text-coffee-400">
                              {formatNumber(
                                quantity,
                              )}{" "}
                              {t(
                                "items",
                                "እቃዎች",
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-xs font-black text-berbere-600">
                              {formatMoney(
                                revenue,
                              )}
                            </p>

                            <p className="text-[9px] text-coffee-400">
                              {Math.round(
                                percentage,
                              )}
                              %
                            </p>
                          </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-cream-200">
                          <div
                            className="h-full rounded-full bg-berbere-500"
                            style={{
                              width: `${Math.min(
                                percentage,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            SHIFT & CASH
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

          <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-berbere-500" />

            <div>
              <h2 className="text-sm font-black text-coffee-700">
                {t(
                  "Shift & Cash Check",
                  "የፈረቃና የካሽ ማረጋገጫ",
                )}
              </h2>

              <p className="text-[10px] text-coffee-400">
                {t(
                  "Expected cash compared with counted cash",
                  "መኖር ያለበት ካሽ ከተቆጠረው ካሽ ጋር",
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-cream-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">

            <div className="p-4">
              <p className="text-[9px] font-bold text-coffee-400">
                {t(
                  "Opening Cash",
                  "የመነሻ ካሽ",
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                {formatMoney(openingCash)}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-coffee-400">
                {t(
                  "Cash Sales",
                  "የካሽ ሽያጭ",
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                {formatMoney(cashSales)}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-coffee-400">
                {t(
                  "Expected Cash",
                  "መኖር ያለበት ካሽ",
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-berbere-500">
                {formatMoney(expectedCash)}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[9px] font-bold text-coffee-400">
                {t(
                  "Actual Cash",
                  "ትክክለኛ ካሽ",
                )}
              </p>

              <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                {actualCash == null
                  ? "—"
                  : formatMoney(actualCash)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-cream-200 bg-cream-100/60 px-4 py-3">

            <span className="text-xs font-black text-coffee-700">
              {t(
                "Difference",
                "ልዩነት",
              )}
            </span>

            {cashDifference == null ? (
              <span className="text-[10px] font-bold text-coffee-400">
                {t(
                  "Cash has not been counted yet",
                  "ካሽ ገና አልተቆጠረም",
                )}
              </span>
            ) : cashDifference === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-berbere-200 bg-berbere-50 px-2.5 py-1 text-[10px] font-black text-berbere-600">

                <CheckCircle2 className="h-3.5 w-3.5" />

                {t(
                  "Balanced",
                  "ተመጣጣኝ",
                )}
              </span>
            ) : (
              <span
                className={`font-mono text-xs font-black ${
                  cashDifference < 0
                    ? "text-gold-700"
                    : "text-berbere-600"
                }`}
              >
                {cashDifference > 0 ? "+" : ""}

                {formatMoney(cashDifference)}
              </span>
            )}
          </div>
        </section>

        {/* ======================================================
            INVENTORY ALERT
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">

          <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">

            <Package className="h-4 w-4 text-berbere-500" />

            <div className="flex-1">
              <h2 className="text-sm font-black text-coffee-700">
                {t(
                  "Inventory Alert",
                  "የክምችት ማስጠንቀቂያ",
                )}
              </h2>

              <p className="text-[10px] text-coffee-400">
                {t(
                  "Products approaching or below their minimum stock",
                  "ዝቅተኛ ክምችት ላይ ያሉ ምርቶች",
                )}
              </p>
            </div>

            {lowStockCount > 0 && (
              <AlertTriangle className="h-4 w-4 text-gold-500" />
            )}
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[460px] text-sm">

              <thead className="bg-cream-50">
                <tr>

                  <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    {t(
                      "Product",
                      "ምርት",
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    {t(
                      "Current",
                      "አሁን",
                    )}
                  </th>

                  <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-coffee-400">
                    {t(
                      "Minimum",
                      "ዝቅተኛ",
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>

                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center"
                    >
                      <span className="text-xs font-bold text-berbere-600">
                        {t(
                          "Inventory levels look healthy.",
                          "የክምችት መጠን ጥሩ ነው።",
                        )}
                      </span>
                    </td>
                  </tr>
                ) : (
                  lowStockProducts
                    .slice(0, 8)
                    .map(
                      (
                        product: LowStockSummary,
                      ) => {
                        /*
                         * LowStockSummary fields:
                         *
                         * quantity   -> current stock
                         * alertLevel -> minimum/reorder level
                         */

                        const stock = numberValue(
                          product.quantity,
                        );

                        const threshold =
                          numberValue(
                            product.alertLevel,
                          );

                        return (
                          <tr
                            key={product.id}
                            className="border-t border-cream-200"
                          >

                            <td className="px-4 py-3 font-bold text-coffee-700">
                              {product.name}
                            </td>

                            <td
                              className={`px-4 py-3 text-right font-mono font-black ${
                                stock <= 0
                                  ? "text-gold-700"
                                  : "text-berbere-600"
                              }`}
                            >
                              {formatNumber(stock)}
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-coffee-500">
                              {formatNumber(
                                threshold,
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )
                )}
              </tbody>
            </table>
          </div>

          {(lowStockCount > 0 ||
            outOfStockCount > 0) && (
            <div className="flex flex-wrap gap-3 border-t border-cream-200 bg-gold-50/60 px-4 py-3 text-[10px] font-bold">

              {lowStockCount > 0 && (
                <span className="text-gold-700">
                  {formatNumber(lowStockCount)}{" "}

                  {t(
                    "low stock",
                    "ዝቅተኛ ክምችት",
                  )}
                </span>
              )}

              {outOfStockCount > 0 && (
                <span className="text-berbere-600">
                  {formatNumber(
                    outOfStockCount,
                  )}{" "}

                  {t(
                    "out of stock",
                    "ከክምችት ውጭ",
                  )}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer className="px-4 pt-1 text-center">

          <p className="text-[10px] leading-relaxed text-coffee-400">
            {t(
              "Remote synced records are used as the primary source. Local records are included only when their transaction ID does not already exist remotely, preventing duplicate sales after synchronization.",
              "Remote የተመሳሰሉ መረጃዎች ዋና የሪፖርት ምንጭ ናቸው። Local መረጃ የሚጨመረው የግብይቱ ID remote ላይ ከሌለ ብቻ ነው፣ ይህም ከsync በኋላ ድግግሞሽን ይከላከላል።",
            )}
          </p>

          <p className="mt-1 text-[9px] text-coffee-300">
            Liyu POS •{" "}
            {remoteAvailable
              ? t(
                  "Remote + Offline",
                  "Remote + Offline",
                )
              : t(
                  "Offline mode",
                  "Offline ሁኔታ",
                )}
          </p>
        </footer>
      </div>
    </main>
  );
}