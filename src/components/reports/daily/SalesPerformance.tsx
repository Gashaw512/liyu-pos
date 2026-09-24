import { ShoppingBag } from "lucide-react";
import { formatMoney, formatNumber, numberValue } from "@/lib/reports/daily-report-format";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
import type { ProductSummary } from "@/lib/reports/report.types";
type SalesPerformanceProps = { productReport: ProductSummary[]; t: (en: string, am: string) => string };
export function SalesPerformance({ productReport, t }: SalesPerformanceProps) {
  return (
    <>
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


    </>
  );
}