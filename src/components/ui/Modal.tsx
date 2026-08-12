import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="
      fixed inset-0
      z-50
      bg-black/50
      backdrop-blur-sm
      flex
      items-center
      justify-center
      p-4
      "
    >
      <div
        className="
        bg-white
        w-full
        max-w-md
        rounded-2xl
        shadow-2xl
        "
      >
        <div
          className="
          flex
          items-center
          justify-between
          p-4
          border-b
          "
        >
          <h2 className="font-bold">{title}</h2>

          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}