type ReportPrintFooterProps = {
  reportPeriodDetail: string;
  t: (en: string, am: string) => string;
};

export function ReportPrintFooter({ reportPeriodDetail, t }: ReportPrintFooterProps) {
  return (
    <div className="print-report-footer mt-8 border-t border-coffee-200 pt-3">
      <div className="flex items-center justify-between gap-4 text-[8px] text-coffee-400">
        <span>LIYU POS</span>
        <span>{t("Sales Report", "የሽያጭ ሪፖርት")}</span>
        <span>{reportPeriodDetail}</span>
      </div>
    </div>
  );
}
