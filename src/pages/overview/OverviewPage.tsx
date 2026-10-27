import { ArrowRight, BellRing, Building2, Calendar, CalendarClock, CheckCircle2, UserPlus, Users, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useFollowUps } from '@hooks/useFollowUps'
import { useLeads } from '@hooks/useLeads'
import { useProjects } from '@hooks/useProjects'
import { useSession } from '@hooks/useSession'
import type { Lead } from '@logic/leads/leadTypes'
import { sameProject } from '@logic/rules/projects'
import { isOwner } from '@logic/rules/session'
import { statusLabel } from '@logic/rules/statuses'
import { leadsPerAssignee } from '@logic/rules/workload'
import { RepeatedBadge } from '@pages/leads/LeadTable'
import { LeadHandlerCard } from '@pages/overview/LeadHandlerCard'
import { MyTodayLeadsCard, TodayLeadsCard } from '@pages/overview/TodayLeadsCard'
import { cn } from '@shared/lib/cn'
import { daysUntil, formatDateTime, periodOptions } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Dropdown } from '@shared/ui/Dropdown'
import { SegmentedControl } from '@shared/ui/SegmentedControl'
import { Skeleton } from '@shared/ui/Skeleton'
import { StatTile } from '@shared/ui/StatTile'

function dueLabel(iso: string): { text: string; tone: string } {
  const days = daysUntil(iso)

  if (days < 0) return { text: `${pluralize(-days, 'day')} overdue`, tone: 'text-red-600' }
  if (days === 0) return { text: 'Today', tone: 'text-red-600' }
  if (days === 1) return { text: 'Tomorrow', tone: 'text-brand-700' }
  return { text: `In ${pluralize(days, 'day')}`, tone: 'text-slate-500' }
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(full: string | undefined): string {
  const name = (full ?? '').trim()
  return name ? name.split(' ')[0]! : 'there'
}

export function OverviewPage() {
  const { session } = useSession()
  const owner = isOwner(session)

  const [period, setPeriod] = useState('')
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const query = useMemo(() => (range ?? (period ? { month: period } : {})), [range, period])

  const leads = useLeads('all', undefined, query)
  const projectList = useProjects()
  const monthOptions = [{ value: '', label: 'All months' }, ...periodOptions(leads.months)]

  const [projectFilter, setProjectFilter] = useState('')

  const allLeads: Lead[] = useMemo(
    () =>
      projectFilter
        ? leads.leads.filter((lead) => sameProject(lead.project, projectFilter))
        : leads.leads,
    [leads.leads, projectFilter]
  )
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const lead of allLeads) counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1)
    return counts
  }, [allLeads])
  const countAt = (status: string) => statusCounts.get(status) ?? 0

  const unassigned = useMemo(
    () => allLeads.filter((lead) => lead.view === 'unassigned').length,
    [allLeads]
  )

  const leadsLoading = leads.isPending

  const failure = [leads, projectList].find((result) => result.isError)?.error as
    | Error
    | undefined

  const loads = useMemo(() => leadsPerAssignee(allLeads), [allLeads])
  const myProjects = useMemo(() => {
    const active = projectList.projects.filter((project) => project.active)
    if (owner) return active
    const id = session?.userId
    return id ? active.filter((project) => project.memberIds.includes(id)) : []
  }, [projectList.projects, owner, session?.userId])

  const projectsOf = (userId: string) =>
    leads.roster.find((person) => person.id === userId)?.projects ?? 0

  const hello = useMemo(
    () => `${greeting(new Date().getHours())}, ${firstName(session?.fullName)}`,
    [session?.fullName]
  )

  const followUps = useFollowUps()
  const [dueTab, setDueTab] = useState<'today' | 'overdue' | 'upcoming'>('today')
  const due = useMemo(() => {
    const pick = (list: Lead[]) =>
      projectFilter ? list.filter((lead) => sameProject(lead.project, projectFilter)) : list
    return { overdue: pick(followUps.overdue), today: pick(followUps.today), upcoming: pick(followUps.upcoming) }
  }, [followUps.overdue, followUps.today, followUps.upcoming, projectFilter])
  const dueRows = due[dueTab]

  return (
    <div className="space-y-5 sm:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{hello}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <Dropdown
            className="min-w-0 sm:w-44"
            icon={Calendar}
            value={period}
            onChange={(value) => {
              setPeriod(value)
              setRange(null)
            }}
            options={monthOptions}
          />
          {myProjects.length > 0 && (
            <Dropdown
              className="order-last col-span-2 sm:order-none sm:col-span-1 sm:w-44"
              icon={Building2}
              tone="brand"
              active={Boolean(projectFilter)}
              value={projectFilter}
              onChange={setProjectFilter}
              options={[
                { value: '', label: 'All projects' },
                ...myProjects.map((project) => ({ value: project.name, label: project.name }))
              ]}
            />
          )}
          <DateRangePicker
            className="min-w-0 sm:w-44"
            value={range}
            onChange={setRange}
            onClear={() => setRange(null)}
          />
        </div>
      </header>

      {failure && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {failure.message}
        </p>
      )}

      {owner ? <TodayLeadsCard /> : <MyTodayLeadsCard />}

      {!followUps.isPending && due.today.length + due.overdue.length > 0 && (
        <Link
          to="/follow-ups"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition-colors hover:bg-amber-100"
        >
          <BellRing className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Reminder:</span> {pluralize(due.today.length, 'follow up')} due today
            {due.overdue.length > 0 && <span className="font-semibold text-red-600"> · {due.overdue.length} overdue</span>}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total leads"
          value={allLeads.length}
          loading={leadsLoading}
          tone="indigo"
          icon={Users}
        />
        <StatTile
          label="Unassigned"
          value={leadsLoading ? undefined : unassigned}
          loading={leadsLoading}
          tone="amber"
          icon={UserPlus}
        />
        <StatTile
          label="Lost"
          value={leadsLoading ? undefined : countAt('lost')}
          loading={leadsLoading}
          tone="rose"
          icon={XCircle}
        />
        <StatTile
          label="Closed"
          value={leadsLoading ? undefined : countAt('closed')}
          loading={leadsLoading}
          tone="emerald"
          icon={CheckCircle2}
        />
      </div>
      <div>
        <Panel title="Follow ups" action={{ to: '/follow-ups', label: 'All follow ups' }}>
          <SegmentedControl
            className="mb-3 sm:self-start"
            value={dueTab}
            onChange={setDueTab}
            options={[
              { value: 'today', label: `Today (${due.today.length})` },
              { value: 'overdue', label: `Overdue (${due.overdue.length})` },
              { value: 'upcoming', label: `Upcoming (${due.upcoming.length})` }
            ]}
          />
          {followUps.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : dueRows.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">
              {dueTab === 'today' ? 'Nothing due today.' : dueTab === 'overdue' ? 'Nothing overdue. Nice.' : 'Nothing scheduled.'}
            </p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {dueRows.map((lead) => {
                const due = dueLabel(lead.nextFollowUpAt!)

                return (
                  <li key={lead.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                        <RepeatedBadge lead={lead} />
                      </div>
                      <p className="truncate text-xs text-slate-600">
                        {formatDateTime(lead.nextFollowUpAt)} · {statusLabel(lead.status)}
                        {lead.project ? ` · ${lead.project}` : ''}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-xs font-semibold', due.tone)}>
                      {due.text}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      {owner && (
        <Panel title="Leads per person" action={{ to: '/leads?view=all', label: 'All leads' }}>
          {leadsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : loads.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">Nobody is handling leads yet.</p>
          ) : (
            <div className="space-y-3">
              {loads.map((row) => (
                <LeadHandlerCard
                  key={row.assigneeId}
                  name={row.assigneeName}
                  leads={row.leads}
                  projects={projectsOf(row.assigneeId)}
                />
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

function Panel({
  title,
  action,
  className,
  children
}: {
  title: string
  action?: { to: string; label: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn('flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6', className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {action && (
          <Link
            to={action.to}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}
