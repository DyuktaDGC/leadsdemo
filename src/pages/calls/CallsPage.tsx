import { Building2, Megaphone, Phone, Trophy, UserRound, Users } from 'lucide-react'
import { useState } from 'react'

import { useCallStats } from '@hooks/useCalls'
import { useCampaigns } from '@hooks/useCampaigns'
import { useActiveProjectNames } from '@hooks/useProjects'
import { useSession } from '@hooks/useSession'
import type { CallLog } from '@logic/leads/leadTypes'
import { distinctValues } from '@logic/rules/requirements'
import { formatDate, formatDateTime, formatTime, todayKey } from '@shared/lib/date'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Dropdown } from '@shared/ui/Dropdown'
import { SearchInput } from '@shared/ui/SearchInput'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

type Range = { from: string; to: string }
type PersonRow = { id: string; name: string; calls: number; lastAt: string | null }

const dayOf = (call: CallLog) => todayKey(new Date(call.at))
const inRange = (calls: CallLog[], range: Range) =>
  calls.filter((call) => {
    const day = dayOf(call)
    return day >= range.from && day <= range.to
  })
const leadCount = (calls: CallLog[]) => new Set(calls.map((call) => call.leadId)).size

const myCallColumns: Column<CallLog>[] = [
  { key: 'date', header: 'Date', className: 'whitespace-nowrap', cell: (call) => formatDate(call.at) },
  { key: 'time', header: 'Time', className: 'whitespace-nowrap', cell: (call) => formatTime(call.at) },
  { key: 'phone', header: 'Number', className: 'whitespace-nowrap tabular-nums', cell: (call) => call.leadPhone ?? 'N/A' },
  { key: 'lead', header: 'Name', cell: (call) => <span className="font-semibold text-ink">{call.leadName}</span> }
]

const teamCallColumns: Column<CallLog>[] = [
  ...myCallColumns,
  { key: 'by', header: 'Called by', className: 'whitespace-nowrap', cell: (call) => call.userName ?? 'N/A' }
]

const personColumns: Column<PersonRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => <span className="font-semibold text-ink">{row.name}</span> },
  {
    key: 'calls',
    header: <span className="block text-right">Calls</span>,
    cell: (row) => <span className="block text-right font-semibold tabular-nums text-ink">{row.calls}</span>
  },
  {
    key: 'last',
    header: 'Last call',
    className: 'whitespace-nowrap',
    cell: (row) => (row.lastAt ? formatDateTime(row.lastAt) : 'N/A')
  }
]

export function CallsPage() {
  const stats = useCallStats()
  const { session } = useSession()
  const mine = (stats.data?.calls ?? []).filter((call) => call.userId === session?.userId)
  const today = todayKey()
  const loading = stats.isPending

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Calls</h1>
      </header>
      {stats.error && <p className="text-sm text-red-600">{stats.error.message}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <StatTile label="Today" value={inRange(mine, { from: today, to: today }).length} loading={loading} tone="indigo" icon={Phone} />
        <StatTile label="Leads called this month" value={leadCount(inRange(mine, { from: `${today.slice(0, 7)}-01`, to: today }))} loading={loading} tone="emerald" icon={Users} />
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">My call log</h2>
        <Table
          columns={myCallColumns}
          rows={mine}
          rowKey={(call) => `${call.at}-${call.leadId}`}
          isLoading={loading}
          pageSize={20}
          emptyMessage="You haven't called anyone yet."
        />
      </section>
    </div>
  )
}

export function TeamCallsPage() {
  const stats = useCallStats()
  const projects = useActiveProjectNames()
  const campaignList = useCampaigns()
  const today = todayKey()
  const [range, setRange] = useState<Range | null>(null)
  const [project, setProject] = useState('')
  const [caller, setCaller] = useState('')
  const [campaign, setCampaign] = useState('')
  const [search, setSearch] = useState('')
  const shown = range ?? { from: today, to: today }
  const needle = search.trim().toLowerCase()
  const all = stats.data?.calls ?? []
  const campaigns = distinctValues([...(campaignList.data ?? []).map((c) => c.name), ...all.map((call) => call.campaign)], (name) => name)
  const calls = inRange(all, shown).filter(
    (call) =>
      (!project || call.project === project) &&
      (!caller || call.userId === caller) &&
      (!campaign || call.campaign === campaign) &&
      (!needle || [call.leadName, call.leadPhone, call.userName].some((field) => (field ?? '').toLowerCase().includes(needle)))
  )
  const loading = stats.isPending

  const tally = new Map<string | null, { calls: number; lastAt: string }>()
  for (const call of calls) {
    const seen = tally.get(call.userId)
    if (seen) seen.calls += 1
    else tally.set(call.userId, { calls: 1, lastAt: call.at })
  }
  const people: PersonRow[] = (stats.data?.people ?? [])
    .filter((person) => !caller || person.id === caller)
    .map((person) => ({ ...person, calls: tally.get(person.id)?.calls ?? 0, lastAt: tally.get(person.id)?.lastAt ?? null }))
    .sort((a, b) => b.calls - a.calls)
  const top = people[0]?.calls ? people[0] : null

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Team calls</h1>
      </header>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
        <SearchInput
          className="xl:flex-1"
          inputClassName="border-slate-200 bg-white shadow-sm"
          placeholder="Search lead or caller"
          aria-label="Search calls"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Dropdown
            className="min-w-0 xl:w-44"
            icon={UserRound}
            tone="brand"
            active={Boolean(caller)}
            value={caller}
            onChange={setCaller}
            options={[{ value: '', label: 'All callers' }, ...(stats.data?.people ?? []).map((person) => ({ value: person.id, label: person.name }))]}
          />
          <Dropdown
            className="min-w-0 xl:w-44"
            icon={Megaphone}
            tone="brand"
            active={Boolean(campaign)}
            value={campaign}
            onChange={setCampaign}
            options={[{ value: '', label: 'All campaigns' }, ...campaigns.map((name) => ({ value: name, label: name }))]}
          />
          <Dropdown
            className="min-w-0 xl:w-44"
            icon={Building2}
            tone="brand"
            active={Boolean(project)}
            value={project}
            onChange={setProject}
            options={[{ value: '', label: 'All projects' }, ...projects.map((name) => ({ value: name, label: name }))]}
          />
          <DateRangePicker className="min-w-0 xl:w-44" label="Today" value={range} onChange={setRange} onClear={() => setRange(null)} />
        </div>
      </div>
      {stats.error && <p className="text-sm text-red-600">{stats.error.message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <StatTile label="Calls made" value={calls.length} loading={loading} tone="indigo" icon={Phone} />
        <StatTile
          label="Top caller"
          value={top ? `${top.name} · ${top.calls}` : 'N/A'}
          loading={loading}
          tone="amber"
          icon={Trophy}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Calls by person</h2>
        <Table columns={personColumns} rows={people} rowKey={(row) => row.id} isLoading={loading} emptyMessage="No one here yet." />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Team call log</h2>
        <Table
          columns={teamCallColumns}
          rows={calls}
          rowKey={(call) => `${call.at}-${call.leadId}-${call.userId}`}
          isLoading={loading}
          pageSize={20}
          emptyMessage="No calls match these filters."
        />
      </section>
    </div>
  )
}
