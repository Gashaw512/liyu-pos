import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "min-h-[44px] px-4 rounded-xl font-bold transition-all active:scale-[0.98]",
        {
          "bg-[#8B2635] text-white shadow-md":
            variant === "primary",

          "bg-[#E2A03F] text-[#2B1E1A]":
            variant === "secondary",

          "bg-white border border-slate-200 text-[#2B1E1A]":
            variant === "ghost",

          "bg-red-600 text-white":
            variant === "danger",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}