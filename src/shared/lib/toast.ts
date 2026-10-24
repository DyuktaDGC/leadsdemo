type Tone = 'success' | 'error'

type Toast = { id: number; message: string; tone: Tone }

let toasts: Toast[] = []
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function toast(message: string, tone: Tone = 'success'): void {
  const id = Date.now() + Math.random()
  toasts = [...toasts, { id, message, tone }]
  emit()

  window.setTimeout(
    () => {
      toasts = toasts.filter((entry) => entry.id !== id)
      emit()
    },
    tone === 'error' ? 6000 : 3200
  )
}

export function subscribeToasts(listener: () => void): () => void {
  return subscribe(listener)
}

export function readToasts(): Toast[] {
  return toasts
}
