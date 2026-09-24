type ReportFooterProps = {
  reportPeriodDetail: string;
  remoteAvailable: boolean;
  t: (en: string, am: string) => string;
};

export function ReportFooter({ reportPeriodDetail, remoteAvailable, t }: ReportFooterProps) {
  return (
    <footer className="px-4 pt-1 text-center">
      <p className="text-[9px] text-coffee-300">
        LIYU POS � {reportPeriodDetail} � {remoteAvailable
          ? t("Remote + Offline", "Remote + Offline")
          : t("Offline mode", "Offline ሁኔታ")}
      </p>
    </footer>
  );
}
