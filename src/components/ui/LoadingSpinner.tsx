import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <Loader2
        className="
        w-6 h-6
        animate-spin
        text-[#8B2635]
        "
      />
    </div>
  );
}