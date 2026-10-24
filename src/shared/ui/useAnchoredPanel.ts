import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type PanelPosition = { top: number; left: number; width: number }

export function useAnchoredPanel<T extends HTMLElement = HTMLButtonElement>() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const triggerRef = useRef<T>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!isOpen) return

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const margin = 8
      const panel = panelRef.current
      const panelWidth = panel?.offsetWidth ?? rect.width
      const panelHeight = panel?.offsetHeight ?? 0

      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - panelWidth - margin))
      const below = rect.bottom + 6
      const flip =
        panelHeight > 0 &&
        below + panelHeight > window.innerHeight - margin &&
        rect.top - panelHeight - 6 > margin

      const top = Math.max(
        margin,
        Math.min(flip ? rect.top - panelHeight - 6 : below, window.innerHeight - panelHeight - margin)
      )

      setPosition({ top, left, width: rect.width })
    }

    update()
    const frame = requestAnimationFrame(update)
    const settle = window.setTimeout(update, 0)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return { isOpen, setIsOpen, position, triggerRef, panelRef }
}
