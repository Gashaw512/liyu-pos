import { Wallet } from "lucide-react";
import { formatMoney } from "@/lib/reports/daily-report-format";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
type PaymentSummaryItem = { label: string; am: string; amount: number };
type PaymentBreakdownProps = { paymentSummary: PaymentSummaryItem[]; paymentTotal: number; t: (en: string, am: string) => string };
export function PaymentBreakdown({ paymentSummary, paymentTotal, t }: PaymentBreakdownProps) {
  return (
    <>
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

                <div className="daily-report-payment-grid grid grid-cols-2 divide-x divide-y divide-cream-200 sm:grid-cols-5 sm:divide-y-0">
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


    </>
  );
}
