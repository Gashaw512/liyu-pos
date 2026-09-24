// src/app/[locale]/(app)/reports/daily/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";

import { DailyReportHeader } from "@/components/reports/daily/DailyReportHeader";
import { FinancialSnapshot } from "@/components/reports/daily/FinancialSnapshot";
import { getDailyReportPeriod } from "@/lib/reports/daily-report-period.service";

import type {
  LowStockSummary,
} from "@/lib/reports/report.types";

import {
  useBusinessContext,
} from "@/lib/auth/useBusinessContext";

import createClient from "@/lib/supabase/client";
import {
  formatDateInput,
  formatMoney,
  formatNumber,
  numberValue,
  safePercentage,
  startOfDay,
} from "@/lib/reports/daily-report-format";
import { useReportPeriod } from "@/lib/reports/useReportPeriod";
import { useReportData } from "@/lib/reports/useReportData";
import {
  DataRow,
  SectionHeader,
} from "@/components/reports/daily/DailyReportPrimitives";

const EMPTY_REPORT_ITEMS: never[] = [];

/* ============================================================
   PAGE
============================================================ */

export default function DailyReportPage() {
  const params = useParams();
  const router = useRouter();

  const locale = String(
    params.locale || "en",
  );

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

  const [businessName, setBusinessName] =
    useState("LIYU POS");

  useEffect(() => {
    if (!businessId) {
      return;
    }

    let active = true;

    const loadBusinessName = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle();

      if (!active) return;

      if (!error && data?.name) {
        setBusinessName(data.name);
        return;
      }

      setBusinessName("LIYU POS");
    };

    void loadBusinessName();

    return () => {
      active = false;
    };
  }, [businessId]);

  /* ==========================================================
     DATE
  ========================================================== */

  const today = useMemo(
    () => startOfDay(new Date()),
    [],
  );

  const {
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
  } = useReportPeriod({ today, locale });

  /* ==========================================================
     TRANSLATION
  ========================================================== */

  const t = useCallback(
    (en: string, am: string) =>
      isAm ? am : en,
    [isAm],
  );

  const loadPeriod = useCallback(() => {
    if (!businessId || !branchId || !userId) {
      return Promise.resolve({ report: null, reportDays: 0, lastUpdated: null });
    }

    return getDailyReportPeriod({ businessId, branchId, userId, periodDates });
  }, [businessId, branchId, userId, periodDates]);

  const {
    report,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  } = useReportData({
    load: loadPeriod,
    ready: !contextLoading,
    enabled: Boolean(businessId && branchId && userId),
    errorMessage: t(
      "Unable to load the report. Please try again.",
      "ሪፖርቱን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    ),
  });
  const financials =
    report?.financials;

  const expenses =
    report?.expenses;

  const inventory =
    report?.inventory;

  const categories =
    report?.categories ?? EMPTY_REPORT_ITEMS;

  const products =
    report?.products ?? EMPTY_REPORT_ITEMS;

  const activeShift =
    report?.activeShift ?? null;

  const sync =
    report?.sync;

  /* ==========================================================
     FINANCIAL VALUES
  ========================================================== */

  const salesTotal =
    numberValue(
      financials?.revenue,
    );

  const grossProfit =
    numberValue(
      financials?.grossProfit,
    );

  const netProfit =
    numberValue(
      financials?.netProfit,
    );

  const totalReceived =
    numberValue(
      financials?.totalReceived ??
      financials?.revenue,
    );

  const tips =
    numberValue(
      financials?.tips,
    );

  const expenseTotal =
    numberValue(
      expenses?.total,
    );

  const orderCount =
    numberValue(
      financials?.transactions,
    );

  const averageSale =
    orderCount > 0
      ? salesTotal / orderCount
      : 0;

  /* ==========================================================
     PAYMENTS
  ========================================================== */

  const paymentSummary = [
    {
      label: "Cash",
      am: "ካሽ",
      amount: numberValue(
        financials?.cash,
      ),
    },
    {
      label: "Telebirr",
      am: "ቴሌብር",
      amount: numberValue(
        financials?.telebirr,
      ),
    },
    {
      label: "Bank",
      am: "ባንክ",
      amount: numberValue(
        financials?.bank,
      ),
    },
    {
      label: "Card",
      am: "ካርድ",
      amount: numberValue(
        financials?.card,
      ),
    },
    {
      label: "Other",
      am: "ሌላ",
      amount: numberValue(
        financials?.other,
      ),
    },
  ];

  const paymentTotal =
    paymentSummary.reduce(
      (sum, payment) =>
        sum + payment.amount,
      0,
    );

  /* ==========================================================
     EXPENSES
  ========================================================== */

  const expenseCategories =
    expenses?.byCategory ?? [];

  /* ==========================================================
     PRODUCTS
  ========================================================== */

  const productReport =
    useMemo(
      () =>
        [...products]
          .sort(
            (a, b) =>
              numberValue(
                b.revenue,
              ) -
              numberValue(
                a.revenue,
              ),
          )
          .slice(0, 20),
      [products],
    );

  /* ==========================================================
     CATEGORIES
  ========================================================== */

  const categoryReport =
    useMemo(
      () =>
        [...categories].sort(
          (a, b) =>
            numberValue(
              b.revenue,
            ) -
            numberValue(
              a.revenue,
            ),
        ),
      [categories],
    );

  /* ==========================================================
     INVENTORY
  ========================================================== */

  const lowStockProducts:
    LowStockSummary[] =
    inventory?.lowStock ?? EMPTY_REPORT_ITEMS;

  const lowStockCount =
    numberValue(
      inventory?.lowStockCount,
    );

  const outOfStockCount =
    numberValue(
      inventory?.outOfStockCount,
    );

  /* ==========================================================
     CASH
  ========================================================== */

  const openingCash =
    numberValue(
      activeShift?.opening_cash,
    );

  const cashSales =
    numberValue(
      financials?.cash,
    );

  const expectedCash =
    openingCash + cashSales;

  const actualCash =
    activeShift?.actual_cash != null
      ? numberValue(
        activeShift.actual_cash,
      )
      : null;

  const cashDifference =
    actualCash != null
      ? actualCash - expectedCash
      : null;

  /* ==========================================================
     SYNC
  ========================================================== */

  const remoteAvailable =
    sync?.remoteAvailable ??
    false;

  const remoteSalesCount =
    numberValue(
      sync?.remoteSales,
    );

  const localOnlySalesCount =
    numberValue(
      sync?.localOnlySales,
    );

  /* ==========================================================
     SHARE
  ========================================================== */

  const shareReport =
    useCallback(async () => {
      const padRight = (
        value: string,
        width: number,
      ) =>
        value.padEnd(width, " ");

      const productLines =
        productReport.length > 0
          ? productReport.slice(0, 8).map(
              (item) =>
                `${padRight(
                  String(item.name ?? "Unnamed Product"),
                  18,
                )}${padRight(
                  `${formatNumber(numberValue(item.quantity))}`,
                  8,
                )}${formatMoney(
                  numberValue(item.revenue),
                )}`,
            )
          : ["No sold items recorded."];

      const categoryLines =
        categoryReport.length > 0
          ? categoryReport.slice(0, 5).map(
              (item) =>
                `${padRight(
                  String(item.name ?? "Uncategorized"),
                  26,
                )}${formatMoney(
                  numberValue(item.revenue),
                )}`,
            )
          : ["No category breakdown available."];

      const lowStockLines =
        lowStockProducts.length > 0
          ? lowStockProducts.slice(0, 6).map(
              (item) =>
                `${padRight(
                  String(item.name ?? "Unnamed Product"),
                  18,
                )}${formatNumber(
                  numberValue(item.quantity),
                )}`,
            )
          : ["No low stock items."];

      const text = [
        "LIYU POS",
        "SALES REPORT",
        reportPeriodDetail ||
          new Date().toLocaleDateString(
            "en-ET",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          ),
        "────────────────────────────────",
        "",
        "FINANCIAL SNAPSHOT",
        "",
        `${padRight("Sales", 22)}${formatMoney(salesTotal)}`,
        `${padRight("Expenses", 22)}${formatMoney(expenseTotal)}`,
        `${padRight("Net Profit", 22)}${formatMoney(netProfit)}`,
        `${padRight("Sales Made", 22)}${formatNumber(orderCount)}`,
        "",
        "PAYMENT BREAKDOWN",
        "",
        `${padRight("Cash", 22)}${formatMoney(
          numberValue(financials?.cash),
        )}`,
        `${padRight("Telebirr", 22)}${formatMoney(
          numberValue(financials?.telebirr),
        )}`,
        `${padRight("Bank", 22)}${formatMoney(
          numberValue(financials?.bank),
        )}`,
        `${padRight("Card", 22)}${formatMoney(
          numberValue(financials?.card),
        )}`,
        `${padRight("Other", 22)}${formatMoney(
          numberValue(financials?.other),
        )}`,
        "",
        "SOLD ITEMS",
        "",
        `${padRight("Product", 18)}${padRight("Qty", 8)}Revenue`,
        "─────────────────────────────────────",
        ...productLines,
        "",
        "SALES PERFORMANCE",
        "",
        `${padRight("Product", 18)}${padRight("Qty", 8)}Revenue`,
        "─────────────────────────────────────",
        ...productLines,
        "",
        "CATEGORY PERFORMANCE",
        "",
        ...categoryLines,
        "",
        "LOW STOCK ITEMS",
        "",
        ...lowStockLines,
        "",
        "SHIFT & CASH",
        "",
        `${padRight("Opening Cash", 24)}${formatMoney(openingCash)}`,
        `${padRight("Cash Sales", 24)}${formatMoney(cashSales)}`,
        `${padRight("Expected Cash", 24)}${formatMoney(expectedCash)}`,
        `${padRight("Actual Cash", 24)}${formatMoney(
          actualCash ?? 0,
        )}`,
        `${padRight("Difference", 24)}${formatMoney(
          cashDifference ?? 0,
        )}`,
        "",
        "INVENTORY CHECK",
        "",
        `${padRight("Low Stock", 24)}${formatNumber(lowStockCount)}`,
        `${padRight("Out of Stock", 24)}${formatNumber(outOfStockCount)}`,
        "",
        "REPORT DATA",
        "",
        `${padRight("Remote Sales", 24)}${formatNumber(remoteSalesCount)}`,
        `${padRight("Offline Only", 24)}${formatNumber(localOnlySalesCount)}`,
        "",
        "────────────────────────────────",
        "LIYU POS       SALES REPORT",
        reportPeriodDetail ||
          new Date().toLocaleDateString(
            "en-ET",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          ),
      ].join("\n");

      try {
        if (
          typeof navigator !==
          "undefined" &&
          navigator.share
        ) {
          await navigator.share({
            title:
              "Liyu POS Sales Report",
            text,
          });

          return;
        }

        if (
          typeof navigator !==
          "undefined" &&
          navigator.clipboard
        ) {
          await navigator.clipboard.writeText(
            text,
          );

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
          error.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "[DailyReport] Unable to share:",
          error,
        );
      }
    }, [
      reportPeriodDetail,
      salesTotal,
      expenseTotal,
      netProfit,
      orderCount,
      productReport,
      categoryReport,
      financials,
      openingCash,
      cashSales,
      expectedCash,
      actualCash,
      cashDifference,
      lowStockCount,
      outOfStockCount,
      lowStockProducts,
      remoteSalesCount,
      localOnlySalesCount,
      t,
    ]);

  /* ==========================================================
     PRINT / PDF
  ========================================================== */

  const printReport =
    useCallback(() => {
      if (
        typeof window !==
        "undefined"
      ) {
        window.print();
      }
    }, []);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    contextLoading ||
    loading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berbere-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>

          <p className="text-sm font-black text-coffee-700">
            {t(
              "Preparing report...",
              "ሪፖርቱን በማዘጋጀት ላይ...",
            )}
          </p>

          <p className="text-[10px] text-coffee-400">
            {periodDates.length > 1
              ? t(
                `Preparing ${periodDates.length} days of data`,
                `${periodDates.length} ቀናት መረጃ በማዘጋጀት ላይ`,
              )
              : t(
                "Checking local and remote records",
                "የlocal እና remote መረጃዎችን በመፈተሽ ላይ",
              )}
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     BUSINESS CONTEXT ERROR
  ========================================================== */

  if (
    !businessId ||
    !branchId ||
    !userId
  ) {
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
     REPORT ERROR
  ========================================================== */

  if (
    error &&
    !report
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-coffee-700/10 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-50">
            <AlertTriangle className="h-5 w-5 text-gold-600" />
          </div>

          <h1 className="mt-4 text-base font-black text-coffee-700">
            {t(
              "Report unavailable",
              "ሪፖርቱ አልተገኘም",
            )}
          </h1>

          <p className="mt-2 text-xs leading-5 text-coffee-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-berbere-500 px-4 text-xs font-black text-white transition hover:bg-berbere-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />

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
     MAIN
  ========================================================== */

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print,
          .screen-report-body,
          .screen-only {
            display: none !important;
          }

          #daily-report-print-root,
          #daily-report-print-root * {
            visibility: visible !important;
          }

          #daily-report-print-root {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
            color: #2b1e1a !important;
          }

          #daily-report-print-root section,
          #daily-report-print-root table,
          #daily-report-print-root tr,
          #daily-report-print-root footer {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .print-summary {
            display: block !important;
            color: #2b1e1a !important;
          }
        }

        @media screen {
          .print-summary {
            display: none;
          }
        }
      `}</style>

      <main className="min-h-screen bg-cream-100 pb-24">
        <div
          id="daily-report-print-root"
          className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-5"
        >

          {/* ==================================================
              PRINT HEADER
          ================================================== */}

          <div className="print-summary mt-0 space-y-4 text-[11px] leading-relaxed text-coffee-700">
            <div className="border-b-2 border-coffee-700 pb-3">
              <h2 className="text-[24px] font-black tracking-tight text-coffee-700">
                {businessId ? businessName : "LIYU POS"}
              </h2>
              <p className="mt-1 text-[11px] font-bold text-coffee-500">
                {reportPeriodDetail}
              </p>
            </div>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Financial Snapshot
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-cream-50 p-2">
                  <div className="text-[9px] font-bold text-coffee-400">Sales</div>
                  <div className="mt-1 text-[14px] font-black text-coffee-700">{formatMoney(salesTotal)}</div>
                </div>
                <div className="rounded-lg bg-cream-50 p-2">
                  <div className="text-[9px] font-bold text-coffee-400">Expenses</div>
                  <div className="mt-1 text-[14px] font-black text-coffee-700">{formatMoney(expenseTotal)}</div>
                </div>
                <div className="rounded-lg bg-cream-50 p-2">
                  <div className="text-[9px] font-bold text-coffee-400">Net Profit</div>
                  <div className="mt-1 text-[14px] font-black text-berbere-600">{formatMoney(netProfit)}</div>
                </div>
                <div className="rounded-lg bg-cream-50 p-2">
                  <div className="text-[9px] font-bold text-coffee-400">Sales Made</div>
                  <div className="mt-1 text-[14px] font-black text-coffee-700">{formatNumber(orderCount)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Payment Breakdown
              </p>
              <div className="space-y-1">
                {paymentSummary.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="font-bold text-coffee-700">{t(item.label, item.am)}</span>
                    <span className="font-mono font-black text-coffee-700">{formatMoney(item.amount)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Sold Items
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-coffee-200 text-left text-[9px] font-black uppercase tracking-wide text-coffee-400">
                    <th className="pb-1 pr-2">Product</th>
                    <th className="pb-1 pr-2 text-right">Qty</th>
                    <th className="pb-1 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(productReport.length > 0 ? productReport : []).map((item) => (
                    <tr key={item.id ?? item.name} className="border-b border-coffee-100">
                      <td className="py-1 pr-2 font-bold text-coffee-700">{item.name}</td>
                      <td className="py-1 pr-2 text-right font-mono text-coffee-600">{formatNumber(numberValue(item.quantity))}</td>
                      <td className="py-1 text-right font-mono font-black text-berbere-600">{formatMoney(numberValue(item.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Category Performance
              </p>
              <div className="space-y-1">
                {(categoryReport.length > 0 ? categoryReport : []).map((item) => (
                  <div key={item.id ?? item.name} className="flex items-center justify-between gap-3">
                    <span className="font-bold text-coffee-700">{item.name}</span>
                    <span className="font-mono font-black text-berbere-600">{formatMoney(numberValue(item.revenue))}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Shift & Cash
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between"><span>Opening Cash</span><span className="font-mono">{formatMoney(openingCash)}</span></div>
                <div className="flex items-center justify-between"><span>Cash Sales</span><span className="font-mono">{formatMoney(cashSales)}</span></div>
                <div className="flex items-center justify-between"><span>Expected Cash</span><span className="font-mono">{formatMoney(expectedCash)}</span></div>
                <div className="flex items-center justify-between"><span>Actual Cash</span><span className="font-mono">{actualCash == null ? "—" : formatMoney(actualCash)}</span></div>
                <div className="flex items-center justify-between"><span>Difference</span><span className="font-mono">{cashDifference == null ? "—" : formatMoney(cashDifference)}</span></div>
              </div>
            </section>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Stock Alert / Inventory Check
              </p>

              {lowStockProducts.length === 0 ? (
                <div className="rounded-lg bg-cream-50 p-2 text-[10px] font-bold text-berbere-600">
                  Inventory levels look healthy.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em] text-coffee-400">
                    <span>Product</span>
                    <span>Stock</span>
                  </div>

                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 border-t border-coffee-100 pt-2">
                      <span className="font-bold text-coffee-700">{product.name}</span>
                      <span className="font-mono font-black text-gold-700">
                        {formatNumber(numberValue(product.quantity))} / {formatNumber(numberValue(product.alertLevel))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(lowStockCount > 0 || outOfStockCount > 0) && (
                <div className="mt-3 flex flex-wrap gap-3 text-[9px] font-bold text-gold-700">
                  {lowStockCount > 0 && <span>{formatNumber(lowStockCount)} low stock</span>}
                  {outOfStockCount > 0 && <span>{formatNumber(outOfStockCount)} out of stock</span>}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-coffee-700/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-coffee-400">
                Report Data
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between"><span>Remote Sales</span><span className="font-mono">{formatNumber(remoteSalesCount)}</span></div>
                <div className="flex items-center justify-between"><span>Offline Only</span><span className="font-mono">{formatNumber(localOnlySalesCount)}</span></div>
              </div>
            </section>
          </div>

          <DailyReportHeader
            businessName={businessId ? businessName : "LIYU POS"}
            isShiftOpen={Boolean(activeShift)}
            reportPreset={reportPreset}
            reportPeriodLabel={reportPeriodLabel}
            reportPeriodDetail={reportPeriodDetail}
            customFrom={customFrom}
            customTo={customTo}
            maxDate={formatDateInput(today)}
            canGoNext={reportPeriod.to < today}
            remoteAvailable={remoteAvailable}
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            isAm={isAm}
            onBack={() => router.push(`/${locale}/reports`)}
            onPresetChange={applyPreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustomRange={applyCustomRange}
            onPrevious={goPreviousDay}
            onNext={goNextDay}
            onRefresh={() => void refresh()}
            onPrint={printReport}
            onShare={() => void shareReport()}
            t={t}
          />
          {/* ==================================================
              REPORT CONTENT
          ================================================== */}

          {report && (
            <div className="screen-report-body">

              <FinancialSnapshot
                salesTotal={salesTotal}
                netProfit={netProfit}
                expenseTotal={expenseTotal}
                orderCount={orderCount}
                t={t}
              />

              {/* ==================================================
                  MONEY FLOW
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    <TrendingUp className="h-4 w-4 text-berbere-500" />
                  }
                  title={t(
                    "Money Flow",
                    "የገንዘብ ፍሰት",
                  )}
                  subtitle={t(
                    "Income and expenses for the selected period",
                    "ለተመረጠው ጊዜ ገቢ እና ወጪ",
                  )}
                />

                <div className="p-4">
                  <DataRow
                    label={t(
                      "Sales",
                      "ሽያጭ",
                    )}
                    value={formatMoney(
                      salesTotal,
                    )}
                  />

                  <DataRow
                    label={t(
                      "Tips",
                      "ጉርሻ",
                    )}
                    value={formatMoney(
                      tips,
                    )}
                  />

                  <DataRow
                    label={t(
                      "Total Received",
                      "ጠቅላላ የተቀበለ",
                    )}
                    value={formatMoney(
                      totalReceived,
                    )}
                    valueClassName="text-berbere-600"
                  />

                  <DataRow
                    label={t(
                      "Expenses",
                      "ወጪ",
                    )}
                    value={`- ${formatMoney(
                      expenseTotal,
                    )}`}
                    valueClassName="text-gold-700"
                  />

                  <div className="mt-2 flex items-center justify-between rounded-xl bg-cream-100 px-3.5 py-3">
                    <span className="text-xs font-black text-coffee-700">
                      {t(
                        "Net Profit",
                        "የተጣራ ትርፍ",
                      )}
                    </span>

                    <span
                      className={`font-mono text-base font-black ${netProfit >= 0
                        ? "text-berbere-600"
                        : "text-gold-700"
                        }`}
                    >
                      {formatMoney(
                        netProfit,
                      )}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5">
                      <p className="text-[9px] font-bold text-coffee-400">
                        {t(
                          "Average Sale",
                          "አማካይ ሽያጭ",
                        )}
                      </p>

                      <p className="mt-1 font-mono text-xs font-black text-coffee-700">
                        {formatMoney(
                          averageSale,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5">
                      <p className="text-[9px] font-bold text-coffee-400">
                        {t(
                          "Gross Profit",
                          "ጠቅላላ ትርፍ",
                        )}
                      </p>

                      <p className="mt-1 font-mono text-xs font-black text-coffee-700">
                        {formatMoney(
                          grossProfit,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================================================
                  PAYMENTS
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    <Wallet className="h-4 w-4 text-berbere-500" />
                  }
                  title={t(
                    "Payment Breakdown",
                    "የክፍያ ዝርዝር",
                  )}
                  subtitle={t(
                    "How customers paid",
                    "ደንበኞች እንዴት እንደከፈሉ",
                  )}
                />

                <div className="grid grid-cols-2 divide-x divide-y divide-cream-200 sm:grid-cols-5 sm:divide-y-0">
                  {paymentSummary.map(
                    (item) => (
                      <div
                        key={
                          item.label
                        }
                        className="p-4"
                      >
                        <p className="text-[9px] font-bold text-coffee-400">
                          {t(
                            item.label,
                            item.am,
                          )}
                        </p>

                        <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                          {formatMoney(
                            item.amount,
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-cream-200 bg-cream-100/70 px-4 py-3">
                  <span className="text-xs font-black text-coffee-700">
                    {t(
                      "Payment Total",
                      "ጠቅላላ ክፍያ",
                    )}
                  </span>

                  <span className="font-mono font-black text-berbere-600">
                    {formatMoney(
                      paymentTotal,
                    )}
                  </span>
                </div>
              </section>

              {/* ==================================================
                  SALES PERFORMANCE
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    <ShoppingBag className="h-4 w-4 text-berbere-500" />
                  }
                  title={t(
                    "Sales Performance",
                    "የሽያጭ አፈጻጸም",
                  )}
                  subtitle={t(
                    "Top products by revenue",
                    "በገቢ መሠረት ከፍተኛ ሽያጭ ያላቸው ምርቶች",
                  )}
                  right={
                    <span className="rounded-lg bg-cream-100 px-2 py-1 text-[9px] font-black text-coffee-500">
                      {formatNumber(
                        productReport.length,
                      )}
                    </span>
                  }
                />

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
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
                      {productReport.length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-10 text-center text-xs text-coffee-400"
                          >
                            {t(
                              "No product sales recorded for this period.",
                              "ለዚህ ጊዜ የምርት ሽያጭ አልተመዘገበም።",
                            )}
                          </td>
                        </tr>
                      ) : (
                        productReport.map(
                          (
                            product,
                            index,
                          ) => (
                            <tr
                              key={
                                product.id ??
                                `${product.name}-${index}`
                              }
                              className="border-t border-cream-200 transition hover:bg-cream-50"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-[9px] font-black text-coffee-400">
                                    {index +
                                      1}
                                  </span>

                                  <span className="font-bold text-coffee-700">
                                    {product.name ||
                                      t(
                                        "Unknown Product",
                                        "ያልታወቀ ምርት",
                                      )}
                                  </span>
                                </div>
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

              {/* ==================================================
                  CATEGORY PERFORMANCE
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    <BarChart3 className="h-4 w-4 text-berbere-500" />
                  }
                  title={t(
                    "Sales by Category",
                    "ሽያጭ በምድብ",
                  )}
                  subtitle={t(
                    "Category contribution to sales",
                    "የእያንዳንዱ ምድብ ለጠቅላላ ሽያጭ ያበረከተው",
                  )}
                />

                <div className="p-4">
                  {categoryReport.length ===
                    0 ? (
                    <div className="py-8 text-center text-xs text-coffee-400">
                      {t(
                        "No category data available.",
                        "የምድብ መረጃ የለም።",
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categoryReport.map(
                        (
                          category,
                        ) => {
                          const revenue =
                            numberValue(
                              category.revenue,
                            );

                          const quantity =
                            numberValue(
                              category.quantity,
                            );

                          const percentage =
                            safePercentage(
                              revenue,
                              salesTotal,
                            );

                          return (
                            <div
                              key={
                                category.id ??
                                category.name
                              }
                            >
                              <div className="mb-1.5 flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-black text-coffee-700">
                                    {
                                      category.name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-[9px] text-coffee-400">
                                    {formatNumber(
                                      quantity,
                                    )}{" "}
                                    {t(
                                      "items",
                                      "እቃዎች",
                                    )}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right">
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
                                    width: `${percentage}%`,
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

              {/* ==================================================
                  EXPENSE BREAKDOWN
              ================================================== */}

              {expenseCategories.length >
                0 && (
                  <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                    <SectionHeader
                      icon={
                        <ArrowDownRight className="h-4 w-4 text-gold-600" />
                      }
                      title={t(
                        "Expense Breakdown",
                        "የወጪ ዝርዝር",
                      )}
                      subtitle={t(
                        "Where business expenses went",
                        "የንግድ ወጪዎች የት እንደዋሉ",
                      )}
                    />

                    <div className="p-4">
                      <div className="space-y-2">
                        {expenseCategories.map(
                          (
                            category,
                            index,
                          ) => {
                            const row =
                              category as Record<
                                string,
                                unknown
                              >;

                            const amount =
                              numberValue(
                                row.amount,
                              );

                            const percentage =
                              safePercentage(
                                amount,
                                expenseTotal,
                              );

                            return (
                              <div
                                key={
                                  String(
                                    row.id ??
                                    row.name ??
                                    index,
                                  )
                                }
                                className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-bold text-coffee-700">
                                    {String(
                                      row.name ??
                                      t(
                                        "Other",
                                        "ሌላ",
                                      ),
                                    )}
                                  </span>

                                  <span className="font-mono text-xs font-black text-gold-700">
                                    {formatMoney(
                                      amount,
                                    )}
                                  </span>
                                </div>

                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
                                  <div
                                    className="h-full rounded-full bg-gold-500"
                                    style={{
                                      width: `${percentage}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </section>
                )}

              {/* ==================================================
                  SHIFT & CASH
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    <CheckCircle2 className="h-4 w-4 text-berbere-500" />
                  }
                  title={t(
                    "Shift & Cash",
                    "ፈረቃ እና ካሽ",
                  )}
                  subtitle={t(
                    "Expected cash compared with counted cash",
                    "መኖር ያለበት ካሽ ከተቆጠረው ካሽ ጋር",
                  )}
                />

                <div className="grid grid-cols-2 divide-x divide-y divide-cream-200 sm:grid-cols-4 sm:divide-y-0">
                  <div className="p-4">
                    <p className="text-[9px] font-bold text-coffee-400">
                      {t(
                        "Opening Cash",
                        "የመነሻ ካሽ",
                      )}
                    </p>

                    <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                      {formatMoney(
                        openingCash,
                      )}
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
                      {formatMoney(
                        cashSales,
                      )}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-[9px] font-bold text-coffee-400">
                      {t(
                        "Expected",
                        "መኖር ያለበት",
                      )}
                    </p>

                    <p className="mt-1 font-mono text-sm font-black text-berbere-600">
                      {formatMoney(
                        expectedCash,
                      )}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-[9px] font-bold text-coffee-400">
                      {t(
                        "Actual",
                        "ትክክለኛ",
                      )}
                    </p>

                    <p className="mt-1 font-mono text-sm font-black text-coffee-700">
                      {actualCash ==
                        null
                        ? "—"
                        : formatMoney(
                          actualCash,
                        )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 bg-cream-100/60 px-4 py-3">
                  <span className="text-xs font-black text-coffee-700">
                    {t(
                      "Difference",
                      "ልዩነት",
                    )}
                  </span>

                  {cashDifference ==
                    null ? (
                    <span className="text-[10px] font-bold text-coffee-400">
                      {t(
                        "Cash has not been counted yet",
                        "ካሽ ገና አልተቆጠረም",
                      )}
                    </span>
                  ) : cashDifference ===
                    0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-berbere-200 bg-berbere-50 px-2.5 py-1 text-[10px] font-black text-berbere-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />

                      {t(
                        "Balanced",
                        "ተመጣጣኝ",
                      )}
                    </span>
                  ) : (
                    <span
                      className={`font-mono text-xs font-black ${cashDifference <
                        0
                        ? "text-gold-700"
                        : "text-berbere-600"
                        }`}
                    >
                      {cashDifference >
                        0
                        ? "+"
                        : ""}
                      {formatMoney(
                        cashDifference,
                      )}
                    </span>
                  )}
                </div>
              </section>

              {/* ==================================================
                  INVENTORY
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    <Package className="h-4 w-4 text-berbere-500" />
                  }
                  title={t(
                    "Inventory Check",
                    "የክምችት ማረጋገጫ",
                  )}
                  subtitle={t(
                    "Products that need attention",
                    "ትኩረት የሚፈልጉ ምርቶች",
                  )}
                  right={
                    lowStockCount >
                      0 ||
                      outOfStockCount >
                      0 ? (
                      <AlertTriangle className="h-4 w-4 text-gold-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-berbere-500" />
                    )
                  }
                />

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
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
                      {lowStockProducts.length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-9 text-center"
                          >
                            <div className="flex flex-col items-center">
                              <CheckCircle2 className="h-5 w-5 text-berbere-500" />

                              <p className="mt-2 text-xs font-bold text-berbere-600">
                                {t(
                                  "Inventory levels look healthy.",
                                  "የክምችት መጠን ጥሩ ነው።",
                                )}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        lowStockProducts
                          .slice(
                            0,
                            8,
                          )
                          .map(
                            (
                              product: LowStockSummary,
                            ) => {
                              const stock =
                                numberValue(
                                  product.quantity,
                                );

                              const threshold =
                                numberValue(
                                  product.alertLevel,
                                );

                              return (
                                <tr
                                  key={
                                    product.id
                                  }
                                  className="border-t border-cream-200"
                                >
                                  <td className="px-4 py-3 font-bold text-coffee-700">
                                    {
                                      product.name
                                    }
                                  </td>

                                  <td
                                    className={`px-4 py-3 text-right font-mono font-black ${stock <=
                                      0
                                      ? "text-gold-700"
                                      : "text-berbere-600"
                                      }`}
                                  >
                                    {formatNumber(
                                      stock,
                                    )}
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

                {(lowStockCount >
                  0 ||
                  outOfStockCount >
                  0) && (
                    <div className="flex flex-wrap gap-3 border-t border-cream-200 bg-gold-50/60 px-4 py-3 text-[10px] font-bold">
                      {lowStockCount >
                        0 && (
                          <span className="text-gold-700">
                            {formatNumber(
                              lowStockCount,
                            )}{" "}
                            {t(
                              "low stock",
                              "ዝቅተኛ ክምችት",
                            )}
                          </span>
                        )}

                      {outOfStockCount >
                        0 && (
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

              {/* ==================================================
                  REPORT DATA
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
                <SectionHeader
                  icon={
                    remoteAvailable ? (
                      <Wifi className="h-4 w-4 text-berbere-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-gold-600" />
                    )
                  }
                  title={t(
                    "Report Data",
                    "የሪፖርት መረጃ",
                  )}
                  subtitle={t(
                    "Data sources used to prepare this report",
                    "ይህን ሪፖርት ለማዘጋጀት የተጠቀሙ የመረጃ ምንጮች",
                  )}
                />

                <div className="grid grid-cols-2 divide-x divide-cream-200">
                  <div className="p-4">
                    <p className="text-[9px] font-bold text-coffee-400">
                      {t(
                        "Remote Sales",
                        "Remote ሽያጭ",
                      )}
                    </p>

                    <p className="mt-1 font-mono text-sm font-black text-berbere-600">
                      {formatNumber(
                        remoteSalesCount,
                      )}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-[9px] font-bold text-coffee-400">
                      {t(
                        "Offline Only",
                        "Offline ብቻ",
                      )}
                    </p>

                    <p className="mt-1 font-mono text-sm font-black text-gold-700">
                      {formatNumber(
                        localOnlySalesCount,
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t border-cream-200 bg-cream-50 px-4 py-3">
                  <p className="text-[10px] leading-4 text-coffee-400">
                    {t(
                      "Remote records are used as the primary source. Local records are included only when their transaction ID does not already exist remotely, helping prevent duplicate sales after synchronization.",
                      "Remote የተመሳሰሉ መረጃዎች ዋና የሪፖርት ምንጭ ናቸው። Local መረጃ የሚጨመረው የግብይቱ ID remote ላይ ከሌለ ብቻ ነው፣ ይህም ከsync በኋላ ድግግሞሽን ለመከላከል ይረዳል።",
                    )}
                  </p>
                </div>
              </section>

              {/* ==================================================
                  FOOTER
              ================================================== */}

              <footer className="px-4 pt-1 text-center">
                <p className="text-[9px] text-coffee-300">
                  LIYU POS •{" "}
                  {reportPeriodDetail} •{" "}
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

              {/* PRINT FOOTER */}

              <div className="print-report-header mt-8 border-t border-coffee-200 pt-3">
                <div className="flex items-center justify-between gap-4 text-[8px] text-coffee-400">
                  <span>LIYU POS</span>

                  <span>
                    {t(
                      "Sales Report",
                      "የሽያጭ ሪፖርት",
                    )}
                  </span>

                  <span>
                    {reportPeriodDetail}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
