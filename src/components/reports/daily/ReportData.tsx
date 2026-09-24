import { Wifi, WifiOff } from "lucide-react";
import { formatNumber } from "@/lib/reports/daily-report-format";
import { SectionHeader } from "@/components/reports/daily/DailyReportPrimitives";
type ReportDataProps = { remoteAvailable: boolean; remoteSalesCount: number; localOnlySalesCount: number; t: (en: string, am: string) => string };
export function ReportData({ remoteAvailable, remoteSalesCount, localOnlySalesCount, t }: ReportDataProps) {
  return (
    <>
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


    </>
  );
}