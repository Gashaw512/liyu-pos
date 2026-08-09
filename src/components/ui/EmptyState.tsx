import { Package } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div
      className="
      bg-white
      rounded-2xl
      p-8
      text-center
      border
      border-slate-200
      "
    >
      <Package
        className="
        mx-auto
        w-10
        h-10
        text-slate-300
        mb-3
        "
      />

      <h3 className="font-bold text-[#2B1E1A]">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-500 mt-1">
          {description}
        </p>
      )}
    </div>
  );
}