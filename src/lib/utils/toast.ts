// src/lib/utils/toast.ts


type ToastType = 'success' | 'error' | 'info'

export function toast(message: string, type: ToastType = 'info') {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }

  const el = document.createElement('div')

  el.innerText = message

  el.className = `
    fixed bottom-4 right-4 z-[9999]
    px-4 py-3 rounded-md text-white
    shadow-lg text-sm
    ${colors[type]}
  `

  document.body.appendChild(el)

  setTimeout(() => {
    el.remove()
  }, 2500)
}