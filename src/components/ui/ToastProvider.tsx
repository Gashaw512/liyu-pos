'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import Toast, {
  ToastItem,
  ToastType,
} from './Toast'

interface ToastContextValue {
  toast: (
    message: string,
    type?: ToastType,
    duration?: number,
  ) => void
}

const ToastContext =
  createContext<ToastContextValue | null>(null)

export function ToastProvider({
  children,
}: {
  children: ReactNode
}) {
  const [toasts, setToasts] =
    useState<ToastItem[]>([])

  const removeToast = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.filter(
          (item) => item.id !== id,
        ),
      )
    },
    [],
  )

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      duration = 3000,
    ) => {
      const id =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`

      setToasts((current) => [
        ...current.slice(-3),
        {
          id,
          message,
          type,
        },
      ])

      window.setTimeout(() => {
        removeToast(id)
      }, duration)
    },
    [removeToast],
  )

  const value = useMemo(
    () => ({
      toast: showToast,
    }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="
          pointer-events-none
          fixed
          inset-x-0
          bottom-0
          z-[9999]
          flex
          flex-col
          items-end
          gap-2
          p-3
          sm:p-4
        "
      >
        {toasts.map((item) => (
          <Toast
            key={item.id}
            toast={item}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context =
    useContext(ToastContext)

  if (!context) {
    throw new Error(
      'useToast must be used inside ToastProvider',
    )
  }

  return context
}