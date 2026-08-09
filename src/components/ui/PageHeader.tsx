import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div
      className="
      sticky top-0 z-30
      bg-[#F7F4EB]/90
      backdrop-blur-lg
      border-b
      border-slate-200
      "
    >
      <div className="px-4 py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#2B1E1A]">
              {title}
            </h1>

            {subtitle && (
              <p className="text-xs text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          {actions}
        </div>
      </div>
    </div>
  );
}