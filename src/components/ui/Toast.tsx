'use client'

import {
  CheckCircle2,
  AlertCircle,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react'

export type ToastType =
  | 'success'
  | 'error'
  | 'info'
  | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastProps {
  toast: ToastItem
  onClose: (id: string) => void
}

const styles: Record<
  ToastType,
  {
    icon: typeof CheckCircle2
    iconClass: string
    accentClass: string
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-berbere-600',
    accentClass: 'bg-berbere-500',
  },

  error: {
    icon: AlertCircle,
    iconClass: 'text-danger',
    accentClass: 'bg-danger',
  },

  info: {
    icon: Info,
    iconClass: 'text-gold-600',
    accentClass: 'bg-gold-500',
  },

  warning: {
    icon: TriangleAlert,
    iconClass: 'text-amber-600',
    accentClass: 'bg-amber-500',
  },
}

export default function Toast({
  toast,
  onClose,
}: ToastProps) {
  const style = styles[toast.type]
  const Icon = style.icon

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        pointer-events-auto
        flex
        w-[calc(100vw-1.5rem)]
        max-w-sm
        overflow-hidden
        rounded-2xl
        border
        border-cream-300
        bg-cream-50
        shadow-[0_12px_32px_rgba(43,30,26,0.16)]
        animate-slide-up
      "
    >
      <div
        className={`w-1 shrink-0 ${style.accentClass}`}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
        <Icon
          className={`h-5 w-5 shrink-0 ${style.iconClass}`}
          strokeWidth={2.5}
        />

        <p className="min-w-0 flex-1 text-xs font-bold leading-5 text-coffee-800">
          {toast.message}
        </p>

        <button
          type="button"
          onClick={() => onClose(toast.id)}
          aria-label="Close notification"
          className="
            flex
            h-6
            w-6
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-coffee-400
            transition
            hover:bg-cream-200
            hover:text-coffee-700
            active:scale-90
          "
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}