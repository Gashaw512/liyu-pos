import type { ReactNode } from "react";

export function SectionHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-cream-200 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cream-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-black text-coffee-700">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[10px] leading-4 text-coffee-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  caption,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  caption?: string;
  icon: ReactNode;
  tone?: "default" | "primary" | "profit" | "warning";
}) {
  const styles = {
    default: { card: "border-coffee-700/10 bg-white", icon: "bg-cream-100 text-coffee-500", value: "text-coffee-700" },
    primary: { card: "border-berbere-500 bg-berbere-500", icon: "bg-white/10 text-white", value: "text-white" },
    profit: { card: "border-berbere-100 bg-white", icon: "bg-berbere-50 text-berbere-600", value: "text-berbere-600" },
    warning: { card: "border-gold-100 bg-white", icon: "bg-gold-50 text-gold-700", value: "text-gold-700" },
  }[tone];
  const muted = tone === "primary" ? "text-white/60" : "text-coffee-400";

  return (
    <div className={`daily-report-metric-card rounded-2xl border p-4 shadow-sm ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${muted}`}>{label}</p>
          <p className={`mt-2 break-words font-mono text-xl font-black tracking-tight sm:text-2xl ${styles.value}`}>{value}</p>
        </div>
        <div className={`daily-report-metric-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>{icon}</div>
      </div>
      {caption && <p className={`mt-2 text-[9px] ${muted}`}>{caption}</p>}
    </div>
  );
}

export function DataRow({
  label,
  value,
  valueClassName = "text-coffee-700",
  border = true,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${border ? "border-b border-cream-200" : ""}`}>
      <span className="min-w-0 text-xs text-coffee-500">{label}</span>
      <span className={`shrink-0 text-right font-mono text-sm font-black ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function PresetButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 whitespace-nowrap rounded-xl px-3 text-[10px] font-black transition active:scale-[0.98] ${active
        ? "bg-berbere-500 text-white shadow-sm"
        : "border border-coffee-700/10 bg-white text-coffee-500 hover:bg-cream-50"
        }`}
    >
      {children}
    </button>
  );
}
