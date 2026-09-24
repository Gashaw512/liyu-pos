import { BarChart3 } from "lucide-react";
import { formatMoney, formatNumber, numberValue, safePercentage } from "@/lib/reports/daily-report-format";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
import type { CategorySummary } from "@/lib/reports/report.types";
type CategoryPerformanceProps = { categoryReport: CategorySummary[]; salesTotal: number; t: (en: string, am: string) => string };
export function CategoryPerformance({ categoryReport, salesTotal, t }: CategoryPerformanceProps) {
  const rows = categoryReport.map((category) => {
    const revenue = numberValue(category.revenue);
    return {
      category,
      revenue,
      quantity: numberValue(category.quantity),
      percentage: safePercentage(revenue, salesTotal),
    };
  });

  return (
    <>
              {/* ==================================================
                  CATEGORY PERFORMANCE
              ================================================== */}

              <section className="daily-report-category-section overflow-hidden rounded-2xl border border-coffee-700/10 bg-white shadow-sm">
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

                <div className="daily-report-category-screen-content p-4">
                  {categoryReport.length ===
                    0 ? (
                    <div className="py-8 text-center text-xs text-coffee-400">
                      {t(
                        "No category data available.",
                        "የምድብ መረጃ የለም።",
                      )}
                    </div>
                  ) : (
                    <div className="daily-report-category-screen-list space-y-4">
                      {rows.map(({ category, revenue, quantity, percentage }) => (
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
                      ))}
                    </div>
                  )}
                </div>

                <table className="daily-report-print-table daily-report-category-print-table w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left">{t("Category", "ምድብ")}</th>
                      <th className="px-2 py-2 text-right">{t("Quantity", "ብዛት")}</th>
                      <th className="px-2 py-2 text-right">{t("Revenue", "ገቢ")}</th>
                      <th className="px-2 py-2 text-right">{t("Share", "ድርሻ")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-2 py-3 text-center text-coffee-500">
                          {t("No category data available.", "የምድብ መረጃ የለም።")}
                        </td>
                      </tr>
                    ) : rows.map(({ category, quantity, revenue, percentage }) => (
                      <tr key={category.id ?? category.name}>
                        <td className="px-2 py-2">{category.name}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(quantity)}</td>
                        <td className="px-2 py-2 text-right">{formatMoney(revenue)}</td>
                        <td className="px-2 py-2 text-right">{Math.round(percentage)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>


    </>
  );
}
