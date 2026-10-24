import { Building2, Menu } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@app/layout/Sidebar'
import { useSession } from '@hooks/useSession'
import { env } from '@shared/lib/env'
import { Loading } from '@shared/ui/Loading'
import { Toaster } from '@shared/ui/Toast'

const STORAGE_KEY = 'swr.sidebar.collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppShell() {
  const { session } = useSession()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }

  if (!session) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 bg-canvas">
        <Sidebar
          collapsed={collapsed}
          onToggle={toggle}
          session={session}
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
        />

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMenuOpen(false)}
            role="presentation"
          />
        )}

        <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-ink">{env.appName}</p>
          </div>
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-8 sm:py-9 lg:px-12">
            <div key={location.pathname} className="page-in">
              <Suspense fallback={<Loading />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
