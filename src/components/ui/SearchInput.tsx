import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        className="
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          w-4 h-4
          text-slate-400
        "
      />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          h-12
          pl-10
          pr-10
          bg-white
          rounded-xl
          border
          border-slate-200
          text-sm
          outline-none
          focus:ring-2
          focus:ring-[#8B2635]
        "
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
          "
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </div>
  );
}