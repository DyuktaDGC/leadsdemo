import { BadgeCheck, Building2, CalendarClock, LayoutDashboard, List, LogOut, Megaphone, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, Trophy, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { useFollowUps } from '@hooks/useFollowUps'
import { useLeads } from '@hooks/useLeads'
import { useSignOut } from '@hooks/useSession'
import { isOwner, type Session } from '@logic/rules/session'
import { cn } from '@shared/lib/cn'
import { env } from '@shared/lib/env'
import { useTheme } from '@shared/lib/theme'

type NavItem = {
  label: string
  icon: LucideIcon
  to: string
  view?: string
  ownerOnly?: boolean
  badge?: number
}

type NavGroup = {
  heading: string | null
  items: NavItem[]
}

function initialsOf(session: Session): string {
  const source = session.fullName.trim() || session.email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export function Sidebar({
  collapsed,
  onToggle,
  session,
  menuOpen,
  onCloseMenu
}: {
  collapsed: boolean
  onToggle: () => void
  session: Session
  menuOpen: boolean
  onCloseMenu: () => void
}) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const signOut = useSignOut()
  const owner = isOwner(session)

  const unassigned = useLeads('unassigned')
  const unassignedCount = unassigned.leads.length
  const followUps = useFollowUps()

  const groups: NavGroup[] = [
    {
      heading: null,
      items: [
        { label: 'Overview', icon: LayoutDashboard, to: '/overview' },
        { label: 'Performance', icon: Trophy, to: '/performance' }
      ]
    },
    {
      heading: 'Leads',
      items: [
        { label: 'My Leads', icon: Users, to: '/leads?view=mine', view: 'mine' },
        {
          label: 'Unassigned',
          icon: UserPlus,
          to: '/leads?view=unassigned',
          view: 'unassigned',
          badge: unassignedCount
        },
        {
          label: 'Follow ups',
          icon: CalendarClock,
          to: '/follow-ups',
          badge: followUps.overdue.length + followUps.today.length
        },
        { label: 'Booked', icon: BadgeCheck, to: '/booked' },
        {
          label: 'All Leads',
          icon: List,
          to: '/leads?view=all',
          view: 'all'
        }
      ]
    },
    {
      heading: 'Marketing',
      items: [{ label: 'Campaigns', icon: Megaphone, to: '/campaigns', ownerOnly: true }]
    },
    {
      heading: 'Management',
      items: [
        { label: 'Projects', icon: Building2, to: '/projects', ownerOnly: true },
        { label: 'Users', icon: Users, to: '/users', ownerOnly: true },
        { label: 'Account', icon: Settings, to: '/account' }
      ]
    }
  ]

  const isActive = (item: NavItem): boolean => {
    const path = item.to.split('?')[0]

    if (item.view) {
      return location.pathname === path && (searchParams.get('view') ?? 'mine') === item.view
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'shrink-0 select-none flex-col bg-gradient-to-b from-brand-900 via-brand-950 to-brand-950 text-white',
        'fixed inset-y-0 left-0 z-50 w-[272px] lg:static lg:z-auto lg:flex',
        menuOpen ? 'flex' : 'hidden',
        collapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-4', collapsed && 'justify-center px-0')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Building2 className="h-[18px] w-[18px]" />
        </div>

        {!collapsed && (
          <>
            <p className="min-w-0 flex-1 text-sm font-bold leading-tight text-white">
              {env.appName}
            </p>
            <ToggleButton collapsed={collapsed} onToggle={onToggle} />
          </>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-2">
          <ToggleButton collapsed={collapsed} onToggle={onToggle} />
        </div>
      )}

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-4" onClick={onCloseMenu}>
        {groups.map((group, index) => {
          const items = group.items.filter((item) => !item.ownerOnly || owner)
          if (items.length === 0) return null

          return (
            <div key={group.heading ?? 'root'} className={index === 0 ? 'mt-1' : 'mt-6'}>
              {group.heading && !collapsed && (
                <p className="mb-2 px-3 text-2xs font-bold uppercase tracking-wide text-white/60">
                  {group.heading}
                </p>
              )}
              {group.heading && collapsed && <div className="mx-4 mb-2 h-px bg-white/10" />}

              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.label}>
                    <NavRow item={item} active={isActive(item)} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
      <ThemeSwitch collapsed={collapsed} />
      <div className="mx-4 mb-4 rounded-2xl bg-white/5 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold uppercase text-white">
            {initialsOf(session)}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {session.fullName || session.email}
                </p>
                <p className="truncate text-xs capitalize text-white/60">{session.role}</p>
              </div>
              <button
                type="button"
                title="Sign out"
                aria-label="Sign out"
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                className="rounded-md p-1.5 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

function ThemeSwitch({ collapsed }: { collapsed: boolean }) {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  const hint = dark ? 'Switch to light mode' : 'Switch to dark mode'

  if (collapsed) {
    return (
      <div className="flex justify-center pb-3">
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          onClick={toggle}
          title={hint}
          aria-label={hint}
          className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/8 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Sun
            className={cn(
              'absolute h-[18px] w-[18px] transition-all duration-300',
              dark ? '-translate-y-6 rotate-90 opacity-0' : 'translate-y-0 rotate-0 opacity-100'
            )}
          />
          <Moon
            className={cn(
              'absolute h-[18px] w-[18px] transition-all duration-300',
              dark ? 'translate-y-0 rotate-0 opacity-100' : 'translate-y-6 -rotate-90 opacity-0'
            )}
          />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      title={hint}
      className="relative mx-4 mb-3 grid grid-cols-2 rounded-full bg-white/8 p-1 ring-1 ring-inset ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full',
          'bg-gradient-to-r from-brand-600 to-brand-700 shadow-lg shadow-brand-950/50',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          dark && 'translate-x-full'
        )}
      />
      <ThemeFace icon={Sun} label="Light" active={!dark} />
      <ThemeFace icon={Moon} label="Dark" active={dark} />
    </button>
  )
}

function ThemeFace({
  icon: Icon,
  label,
  active
}: {
  icon: LucideIcon
  label: string
  active: boolean
}) {
  return (
    <span
      className={cn(
        'relative z-10 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-300',
        active ? 'text-white' : 'text-white/60'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function ToggleButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="hidden rounded-md p-1.5 text-white/65 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  )
}

function NavRow({
  item,
  active,
  collapsed
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const { icon: Icon, label, badge } = item

  return (
    <Link
      to={item.to}
      draggable={false}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-brand-600 font-semibold text-white shadow-sm shadow-brand-950/30'
          : 'font-medium text-white/70 hover:bg-brand-600/25 hover:text-white'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/60')} />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-2xs font-bold text-white',
                active ? 'bg-white/25' : 'bg-brand-600'
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}
