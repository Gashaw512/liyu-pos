import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

// 🟢 1. Explicitly define all layout & presentation extensions in the type system
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  fullWidth?: boolean; // Protects against the inventory page property leak error
}

export function Button({
  children,
  className,
  variant = "primary",
  loading = false,
  disabled,
  fullWidth = false, // 🟢 2. Pull it out here so it never reaches ...props
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        // Base interactive design footprint
        "min-h-[44px] px-4 rounded-xl font-bold transition-all duration-150 ease-in-out",
        "flex items-center justify-center gap-2 select-none",
        "disabled:opacity-50 disabled:pointer-events-none disabled:scale-100",
        "active:scale-[0.98]",
        
        // Scalable visual variant lookup table map
        {
          "bg-[#8B2635] text-white hover:bg-[#75202C] shadow-sm shadow-[#8B2635]/10":
            variant === "primary",

          "bg-[#E2A03F] text-[#2B1E1A] hover:bg-[#CD8F32]":
            variant === "secondary",

          "bg-white border border-[#2B1E1A]/10 text-[#2B1E1A] hover:bg-[#F7F4EB]/50":
            variant === "ghost",

          "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/10":
            variant === "danger",
        },
        
        // 🟢 3. Conditional design tokens applied directly to the class composition layer
        fullWidth && "w-full",
        className
      )}
      {...props} // 🟢 4. Now safe from leaking non-standard DOM properties!
    >
      {/* 🟢 5. Premium loading indicator layout slot integration */}
      {loading ? (
        <div className="flex items-center gap-2 animate-pulse">
          <svg 
            className="animate-spin h-4 w-4 text-current" 
            xmlns="http://w3.org" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="opacity-80 text-[13px]">...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
