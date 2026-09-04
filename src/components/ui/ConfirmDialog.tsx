'use client'

import {
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isAm?: boolean
  destructive?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[10000]
        flex
        items-center
        justify-center
        bg-coffee-900/30
        p-4
        backdrop-blur-[2px]
      "
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="
          w-full
          max-w-sm
          overflow-hidden
          rounded-2xl
          border
          border-cream-300
          bg-cream-50
          shadow-[0_20px_50px_rgba(43,30,26,0.22)]
          animate-scale-in
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${
                  destructive
                    ? 'bg-danger/10 text-danger'
                    : 'bg-gold-400/15 text-gold-600'
                }
              `}
            >
              <AlertTriangle
                className="h-5 w-5"
                strokeWidth={2.5}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="confirm-dialog-title"
                className="text-sm font-black text-coffee-900"
              >
                {title}
              </h2>

              <p className="mt-1.5 text-xs leading-5 text-coffee-500">
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-coffee-400
                hover:bg-cream-200
                hover:text-coffee-700
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="
            flex
            gap-2
            border-t
            border-cream-200
            bg-cream-100/60
            p-3
          "
        >
          <button
            type="button"
            onClick={onCancel}
            className="
              flex
              h-10
              flex-1
              items-center
              justify-center
              gap-1.5
              rounded-xl
              border
              border-cream-300
              bg-cream-50
              px-3
              text-xs
              font-black
              text-coffee-600
              transition
              hover:bg-white
              active:scale-[0.98]
            "
          >
            <X className="h-3.5 w-3.5" />
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`
              flex
              h-10
              flex-1
              items-center
              justify-center
              gap-1.5
              rounded-xl
              px-3
              text-xs
              font-black
              text-white
              shadow-sm
              transition
              active:scale-[0.98]
              ${
                destructive
                  ? 'bg-danger hover:bg-danger/90'
                  : 'bg-coffee-900 hover:bg-coffee-800'
              }
            `}
          >
            <Check className="h-3.5 w-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}