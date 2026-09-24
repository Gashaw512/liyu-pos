type DailyReportPrintHeaderProps = {
  businessName: string;
  reportPeriodLabel: string;
  reportPeriodDetail: string;
  generatedAt: Date;
  locale: string;
  branchName?: string | null;
  t: (en: string, am: string) => string;
};

export function DailyReportPrintHeader({
  businessName,
  reportPeriodLabel,
  reportPeriodDetail,
  generatedAt,
  locale,
  branchName,
  t,
}: DailyReportPrintHeaderProps) {
  const dateLocale = locale === "am" ? "am-ET" : "en-ET";

  return (
    <header className="daily-report-print-only mb-6 border-b-2 border-berbere-500 pb-4 text-coffee-700">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-coffee-500">
        {businessName}
      </p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-coffee-800">
        {t("Sales Report", "የሽያጭ ሪፖርት")}
      </h1>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="font-bold">{reportPeriodDetail}</p>
          <p className="mt-0.5 text-xs text-coffee-500">{reportPeriodLabel}</p>
          {branchName && (
            <p className="mt-1 text-xs text-coffee-500">
              {t("Branch", "ቅርንጫፍ")}: {branchName}
            </p>
          )}
        </div>
        <p className="text-right text-[10px] text-coffee-500">
          {t("Generated", "የተዘጋጀበት")}: {generatedAt.toLocaleString(dateLocale, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
    </header>
  );
}
