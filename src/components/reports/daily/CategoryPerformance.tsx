import { BarChart3 } from "lucide-react";
import { formatMoney, formatNumber, numberValue, safePercentage } from "@/lib/reports/daily-report-format";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
import type { CategorySummary } from "@/lib/reports/report.types";
type CategoryPerformanceProps = { categoryReport: CategorySummary[]; salesTotal: number; t: (en: string, am: string) => string };
export function CategoryPerformance({ categoryReport, salesTotal, t }: CategoryPerformanceProps) {
  return (
    <>
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


    </>
  );
}