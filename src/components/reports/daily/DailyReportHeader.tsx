import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  RefreshCw,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { PresetButton } from "@/components/reports/daily/DailyReportPrimitives";
import type { ReportPreset } from "@/lib/reports/useReportPeriod";

type DailyReportHeaderProps = {
  businessName: string;
  isShiftOpen: boolean;
  reportPreset: ReportPreset;
  reportPeriodLabel: string;
  reportPeriodDetail: string;
  customFrom: string;
  customTo: string;
  maxDate: string;
  canGoNext: boolean;
  remoteAvailable: boolean;
  lastUpdated: Date | null;
  refreshing: boolean;
  isAm: boolean;
  onBack: () => void;
  onPresetChange: (preset: ReportPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyCustomRange: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  onPrint: () => void;
  onShare: () => void;
  t: (en: string, am: string) => string;
};

export function DailyReportHeader({
  businessName,
  isShiftOpen,
  reportPreset,
  reportPeriodLabel,
  reportPeriodDetail,
  customFrom,
  customTo,
  maxDate,
  canGoNext,
  remoteAvailable,
  lastUpdated,
  refreshing,
  isAm,
  onBack,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustomRange,
  onPrevious,
  onNext,
  onRefresh,
  onPrint,
  onShare,
  t,
}: DailyReportHeaderProps) {
  return (
    <header className="no-print rounded-2xl border border-coffee-700/10 bg-white p-4 shadow-sm screen-report-body">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-coffee-700/10 bg-white text-coffee-500 transition hover:bg-cream-50 active:scale-95"
          aria-label={t("Back", "ተመለስ")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-coffee-700 sm:text-xl">
              {t("Sales Report", "የሽያጭ ሪፖርት")}
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black ${isShiftOpen
              ? "border-berbere-200 bg-berbere-50 text-berbere-600"
              : "border-coffee-200 bg-cream-200 text-coffee-500"
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isShiftOpen ? "bg-berbere-500" : "bg-coffee-400"}`} />
              {isShiftOpen
                ? t("Shift Open", "ፈረቃ ክፍት")
                : t("Shift Closed", "ፈረቃ ተዘግቷል")}
            </span>
          </div>

          <p className="mt-1 text-[10px] font-bold text-coffee-400">{businessName}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-coffee-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {reportPeriodLabel}
            </span>
            <span className="text-coffee-300">•</span>
            <span>{reportPeriodDetail}</span>
            {lastUpdated && (
              <span className="hidden items-center gap-1 sm:flex">
                <Clock3 className="h-3 w-3" />
                {lastUpdated.toLocaleTimeString(isAm ? "am-ET" : "en-ET")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto border-t border-cream-200 pt-3">
        <div className="flex min-w-max items-center gap-1.5">
          <PresetButton active={reportPreset === "today"} onClick={() => onPresetChange("today")}>
            {t("Today", "ዛሬ")}
          </PresetButton>
          <PresetButton active={reportPreset === "yesterday"} onClick={() => onPresetChange("yesterday")}>
            {t("Yesterday", "ትናንት")}
          </PresetButton>
          <PresetButton active={reportPreset === "week"} onClick={() => onPresetChange("week")}>
            {t("This Week", "በዚህ ሳምንት")}
          </PresetButton>
          <PresetButton active={reportPreset === "month"} onClick={() => onPresetChange("month")}>
            {t("This Month", "በዚህ ወር")}
          </PresetButton>
          <PresetButton active={reportPreset === "custom"} onClick={() => onPresetChange("custom")}>
            {t("Custom Range", "የተመረጠ ክልል")}
          </PresetButton>
        </div>
      </div>

      {reportPreset === "custom" && (
        <div className="mt-3 rounded-2xl border border-cream-200 bg-cream-50 p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="report-from" className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-coffee-400">
                {t("From", "ከ")}
              </label>
              <input
                id="report-from"
                type="date"
                value={customFrom}
                max={maxDate}
                onChange={(event) => onCustomFromChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-coffee-700/10 bg-white px-3 text-xs font-bold text-coffee-700 outline-none transition focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100"
              />
            </div>
            <div className="hidden pb-3 text-coffee-300 sm:block">→</div>
            <div>
              <label htmlFor="report-to" className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-coffee-400">
                {t("To", "እስከ")}
              </label>
              <input
                id="report-to"
                type="date"
                value={customTo}
                max={maxDate}
                onChange={(event) => onCustomToChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-coffee-700/10 bg-white px-3 text-xs font-bold text-coffee-700 outline-none transition focus:border-berbere-400 focus:ring-2 focus:ring-berbere-100"
              />
            </div>
            <button
              type="button"
              onClick={onApplyCustomRange}
              className="h-10 rounded-xl bg-berbere-500 px-4 text-[10px] font-black text-white transition hover:bg-berbere-600 active:scale-[0.98]"
            >
              {t("Apply", "ተግብር")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onPrevious} className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-coffee-700/10 bg-white px-3 text-[10px] font-bold text-coffee-500 transition hover:bg-cream-50" title={t("Previous day", "ቀዳሚ ቀን")}>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("Previous", "ቀዳሚ")}</span>
        </button>
        <button type="button" onClick={onNext} disabled={!canGoNext} className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-coffee-700/10 bg-white px-3 text-[10px] font-bold text-coffee-500 transition hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-30" title={t("Next day", "ቀጣይ ቀን")}>
          <span className="hidden sm:inline">{t("Next", "ቀጣይ")}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-[10px] font-bold sm:flex-none ${remoteAvailable
          ? "border-berbere-200 bg-berbere-50 text-berbere-600"
          : "border-gold-200 bg-gold-50 text-gold-700"
          }`}>
          {remoteAvailable ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {remoteAvailable ? t("Connected", "ተገናኝቷል") : t("Offline", "ከመስመር ውጭ")}
        </div>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-coffee-700/10 bg-white px-3 text-[10px] font-bold text-coffee-500 transition hover:bg-cream-50 disabled:opacity-60 sm:flex-none">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("Refresh", "አድስ")}
        </button>
        <button type="button" onClick={onPrint} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-coffee-700/10 bg-white px-3 text-[10px] font-bold text-coffee-500 transition hover:bg-cream-50 sm:flex-none">
          <Download className="h-3.5 w-3.5" />
          {t("Save PDF", "PDF አስቀምጥ")}
        </button>
        <button type="button" onClick={onShare} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-berbere-500 px-3 text-[10px] font-black text-white shadow-sm transition hover:bg-berbere-600 active:scale-95 sm:flex-none">
          <Share2 className="h-3.5 w-3.5" />
          {t("Share", "አጋራ")}
        </button>
      </div>
    </header>
  );
}
