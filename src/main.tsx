import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppProviders } from '@app/providers'
import { AppRouter } from '@app/router'

import './index.css'

window.addEventListener('vite:preloadError', () => {
  try {
    const last = Number(sessionStorage.getItem('swr.chunkReload'))
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem('swr.chunkReload', String(Date.now()))
  } catch {}
  window.location.reload()
})

let swipe: { input: HTMLInputElement; x: number; y: number; left: number } | null = null

document.addEventListener(
  'touchstart',
  (event) => {
    const target = event.target
    const touch = event.touches[0]
    swipe =
      target instanceof HTMLInputElement && event.touches.length === 1
        ? { input: target, x: touch.clientX, y: touch.clientY, left: target.scrollLeft }
        : null
  },
  { passive: true }
)

document.addEventListener(
  'touchmove',
  (event) => {
    if (!swipe) return
    const touch = event.touches[0]
    const dx = touch.clientX - swipe.x
    if (Math.abs(dx) < Math.abs(touch.clientY - swipe.y)) return
    swipe.input.scrollLeft = swipe.left - dx
  },
  { passive: true }
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>
)
