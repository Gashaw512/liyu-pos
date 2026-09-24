import { getDailyReport } from "@/lib/reports/daily-report.service";
import { numberValue } from "@/lib/reports/daily-report-format";
import type {
  CategorySummary,
  DailyReport,
  DailyReportOptions,
  ProductSummary,
  ReportSyncState,
} from "@/lib/reports/report.types";

type DailyReportPeriodOptions = Omit<DailyReportOptions, "date" | "allowRemote"> & {
  businessId: string;
  periodDates: Date[];
};

export type DailyReportPeriodResult = {
  report: DailyReport | null;
  reportDays: number;
  lastUpdated: Date | null;
};

function sumReports<T>(reports: DailyReport[], select: (report: DailyReport) => T): number {
  return reports.reduce((sum, report) => sum + numberValue(select(report)), 0);
}

function mergeProducts(reports: DailyReport[]): ProductSummary[] {
  const products = new Map<string, ProductSummary>();
  for (const report of reports) {
    for (const item of report.products ?? []) {
      const key = String(item.id || item.name || "unknown");
      const current = products.get(key);
      if (current) {
        current.quantity += numberValue(item.quantity);
        current.revenue += numberValue(item.revenue);
        current.grossProfit += numberValue(item.grossProfit);
      } else {
        products.set(key, {
          id: String(item.id || key),
          name: String(item.name || "Unnamed Product"),
          quantity: numberValue(item.quantity),
          revenue: numberValue(item.revenue),
          grossProfit: numberValue(item.grossProfit),
        });
      }
    }
  }
  return [...products.values()];
}

function mergeCategories(reports: DailyReport[]): CategorySummary[] {
  const categories = new Map<string, CategorySummary>();
  for (const report of reports) {
    for (const item of report.categories ?? []) {
      const key = String(item.id || item.name || "unknown");
      const current = categories.get(key);
      if (current) {
        current.quantity += numberValue(item.quantity);
        current.revenue += numberValue(item.revenue);
        current.grossProfit += numberValue(item.grossProfit);
      } else {
        categories.set(key, {
          id: String(item.id || key),
          name: String(item.name || "Uncategorized"),
          nameAm: item.nameAm ?? null,
          quantity: numberValue(item.quantity),
          revenue: numberValue(item.revenue),
          grossProfit: numberValue(item.grossProfit),
        });
      }
    }
  }
  return [...categories.values()];
}

function mergeExpenses(reports: DailyReport[]): DailyReport["expenses"] {
  const byCategory = new Map<string, number>();
  for (const report of reports) {
    for (const row of report.expenses?.byCategory ?? []) {
      const category = row.category || "Other";
      byCategory.set(category, (byCategory.get(category) ?? 0) + numberValue(row.amount));
    }
  }
  return {
    total: sumReports(reports, (report) => report.expenses?.total ?? 0),
    transactions: sumReports(reports, (report) => report.expenses?.transactions ?? 0),
    byCategory: [...byCategory].map(([category, amount]) => ({ category, amount })),
  };
}

function mergeSync(reports: DailyReport[]): ReportSyncState {
  const first = reports[0].sync;
  return reports.reduce<ReportSyncState>((merged, report) => {
    const sync = report.sync;
    if (!sync) return merged;
    return {
      ...merged,
      source: sync.source || merged.source || "merged",
      remoteAvailable: merged.remoteAvailable && sync.remoteAvailable !== false,
      localOnlySales: merged.localOnlySales + numberValue(sync.localOnlySales),
      remoteSales: merged.remoteSales + numberValue(sync.remoteSales),
      remoteExpenses: merged.remoteExpenses + numberValue(sync.remoteExpenses),
      lastUpdated: sync.lastUpdated || merged.lastUpdated,
    };
  }, {
    source: first?.source ?? "merged",
    remoteAvailable: reports.every((report) => report.sync?.remoteAvailable !== false),
    localOnlySales: 0,
    remoteSales: 0,
    remoteExpenses: 0,
    lastUpdated: first?.lastUpdated ?? new Date().toISOString(),
  });
}

function mergeReports(reports: DailyReport[]): DailyReport {
  const first = reports[0];
  const last = reports[reports.length - 1];
  const financials = {
    ...first.financials,
    revenue: sumReports(reports, (report) => report.financials?.revenue ?? 0),
    grossProfit: sumReports(reports, (report) => report.financials?.grossProfit ?? 0),
    netProfit: sumReports(reports, (report) => report.financials?.netProfit ?? 0),
    totalReceived: sumReports(reports, (report) => report.financials?.totalReceived ?? 0),
    tips: sumReports(reports, (report) => report.financials?.tips ?? 0),
    transactions: sumReports(reports, (report) => report.financials?.transactions ?? 0),
    itemsSold: sumReports(reports, (report) => report.financials?.itemsSold ?? 0),
    cash: sumReports(reports, (report) => report.financials?.cash ?? 0),
    telebirr: sumReports(reports, (report) => report.financials?.telebirr ?? 0),
    bank: sumReports(reports, (report) => report.financials?.bank ?? 0),
    card: sumReports(reports, (report) => report.financials?.card ?? 0),
    other: sumReports(reports, (report) => report.financials?.other ?? 0),
  };

  return {
    ...last,
    financials,
    expenses: mergeExpenses(reports),
    products: mergeProducts(reports),
    categories: mergeCategories(reports),
    sync: mergeSync(reports),
  };
}

function findLastUpdated(reports: DailyReport[]): Date | null {
  for (let index = reports.length - 1; index >= 0; index--) {
    const value = reports[index]?.sync?.lastUpdated;
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export async function getDailyReportPeriod({
  businessId,
  branchId,
  userId,
  periodDates,
}: DailyReportPeriodOptions): Promise<DailyReportPeriodResult> {
  const reports: DailyReport[] = [];
  const batchSize = 5;

  for (let index = 0; index < periodDates.length; index += batchSize) {
    const batch = periodDates.slice(index, index + batchSize);
    const batchReports = await Promise.all(batch.map((date) => getDailyReport({
      businessId,
      branchId,
      userId,
      date,
      allowRemote: true,
    })));
    reports.push(...batchReports);
  }

  return {
    report: reports.length === 0
      ? null
      : reports.length === 1
        ? reports[0]
        : mergeReports(reports),
    reportDays: reports.length,
    lastUpdated: findLastUpdated(reports),
  };
}
