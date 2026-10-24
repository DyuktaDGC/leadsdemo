import { ArrowRight } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'

export function ScrollHint({ target }: { target: RefObject<HTMLElement | null> }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const element = target.current
    if (!element) return

    const check = () =>
      setShow(element.scrollWidth - element.clientWidth > 8 && element.scrollLeft < 8)

    check()
    const observer = new ResizeObserver(check)
    observer.observe(element)
    element.addEventListener('scroll', check, { passive: true })

    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', check)
    }
  }, [target])

  if (!show) return null

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-2 right-2 flex animate-pulse items-center gap-1 rounded-full bg-ink/75 px-2.5 py-1 text-2xs font-semibold text-white sm:hidden"
    >
      Scroll
      <ArrowRight className="h-3 w-3" />
    </span>
  )
}
