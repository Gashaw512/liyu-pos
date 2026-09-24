import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/reports/daily-report-format";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
type ShiftCashProps = { openingCash: number; cashSales: number; expectedCash: number; actualCash: number | null; cashDifference: number | null; t: (en: string, am: string) => string };
export function ShiftCash({ openingCash, cashSales, expectedCash, actualCash, cashDifference, t }: ShiftCashProps) {
  return (
    <>
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


    </>
  );
}