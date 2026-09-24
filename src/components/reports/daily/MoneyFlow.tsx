import { TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/reports/daily-report-format";
import { DataRow, SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
type MoneyFlowProps = {
  salesTotal: number; tips: number; totalReceived: number; expenseTotal: number;
  netProfit: number; averageSale: number; grossProfit: number; t: (en: string, am: string) => string;
};
export function MoneyFlow({ salesTotal, tips, totalReceived, expenseTotal, netProfit, averageSale, grossProfit, t }: MoneyFlowProps) {
  return (
    <>
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


    </>
  );
}