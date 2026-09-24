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
  Loader2,
  RefreshCw,
} from "lucide-react";

import { DailyReportHeader } from "@/components/reports/daily/DailyReportHeader";
import { DailyReportPrintHeader } from "@/components/reports/daily/DailyReportPrintHeader";
import { FinancialSnapshot } from "@/components/reports/daily/FinancialSnapshot";
import { CategoryPerformance } from "@/components/reports/daily/CategoryPerformance";
import { ExpenseBreakdown } from "@/components/reports/daily/ExpenseBreakdown";
import { InventoryCheck } from "@/components/reports/daily/InventoryCheck";
import { MoneyFlow } from "@/components/reports/daily/MoneyFlow";
import { PaymentBreakdown } from "@/components/reports/daily/PaymentBreakdown";
import { ReportData } from "@/components/reports/daily/ReportData";
import { ReportFooter } from "@/components/reports/daily/ReportFooter";
import { ReportPrintFooter } from "@/components/reports/daily/ReportPrintFooter";
import { DailyReportPrintStyles } from "@/components/reports/daily/DailyReportPrintStyles";
import { SalesPerformance } from "@/components/reports/daily/SalesPerformance";
import { ShiftCash } from "@/components/reports/daily/ShiftCash";
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
  startOfDay,
} from "@/lib/reports/daily-report-format";
import { useReportPeriod } from "@/lib/reports/useReportPeriod";
import { useReportData } from "@/lib/reports/useReportData";
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
  const [printGeneratedAt, setPrintGeneratedAt] =
    useState<Date | null>(null);

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

const productReport = useMemo(
  () =>
    [...products].sort(
      (a, b) =>
        numberValue(b.revenue) -
        numberValue(a.revenue),
    ),
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

const printReport = useCallback(() => {
  if (typeof window === "undefined") {
    return;
  }

  setPrintGeneratedAt(new Date());

  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  }, 50);
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
      <DailyReportPrintStyles />

      <main className="min-h-screen bg-cream-100 pb-24">
        <div
          id="daily-report-print-root"
          className="daily-report-document mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-5"
        >
          {report && (
            <DailyReportPrintHeader
              businessName={businessId ? businessName : "LIYU POS"}
              reportPeriodLabel={reportPeriodLabel}
              reportPeriodDetail={reportPeriodDetail}
              generatedAt={printGeneratedAt ?? new Date()}
              locale={locale}
              t={t}
            />
          )}
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
            <div className="daily-report-content space-y-4">

              <FinancialSnapshot
                salesTotal={salesTotal}
                netProfit={netProfit}
                expenseTotal={expenseTotal}
                orderCount={orderCount}
                t={t}
              />

              <MoneyFlow
                salesTotal={salesTotal}
                tips={tips}
                totalReceived={totalReceived}
                expenseTotal={expenseTotal}
                netProfit={netProfit}
                averageSale={averageSale}
                grossProfit={grossProfit}
                t={t}
              />
              <PaymentBreakdown
                paymentSummary={paymentSummary}
                paymentTotal={paymentTotal}
                t={t}
              />
              <SalesPerformance productReport={productReport} t={t} />
              <CategoryPerformance
                categoryReport={categoryReport}
                salesTotal={salesTotal}
                t={t}
              />
              <ExpenseBreakdown
                expenseCategories={expenseCategories}
                expenseTotal={expenseTotal}
                t={t}
              />
              <ShiftCash
                openingCash={openingCash}
                cashSales={cashSales}
                expectedCash={expectedCash}
                actualCash={actualCash}
                cashDifference={cashDifference}
                t={t}
              />
              <InventoryCheck
                lowStockProducts={lowStockProducts}
                lowStockCount={lowStockCount}
                outOfStockCount={outOfStockCount}
                t={t}
              />
              <ReportData
                remoteAvailable={remoteAvailable}
                remoteSalesCount={remoteSalesCount}
                localOnlySalesCount={localOnlySalesCount}
                t={t}
              />
              <ReportFooter
                reportPeriodDetail={reportPeriodDetail}
                remoteAvailable={remoteAvailable}
                t={t}
              />

              <ReportPrintFooter
                businessName={businessId ? businessName : "LIYU POS"}
                reportPeriodDetail={reportPeriodDetail}
                t={t}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
