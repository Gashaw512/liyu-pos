import type { ReactNode } from "react";

export { DataRow, MetricCard, SectionHeader } from "@/components/shared/ReportPrimitives";

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
