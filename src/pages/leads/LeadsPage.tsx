import { CalendarClock, FileSpreadsheet, Flame, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useLeads } from '@hooks/useLeads'
import { useActiveProjectNames, useMyProjectNames } from '@hooks/useProjects'
import { useSession } from '@hooks/useSession'
import type { Lead, LeadFilters as Filters, LeadsView } from '@logic/leads/leadTypes'
import { distinctValues } from '@logic/rules/requirements'
import { allowedLeadsViews } from '@logic/rules/session'
import { AssignLeadDialog } from '@pages/leads/AssignLeadDialog'
import { EditLeadDialog } from '@pages/leads/EditLeadDialog'
import { ImportLeadsDialog } from '@pages/leads/ImportLeadsDialog'
import { LeadDrawer } from '@pages/leads/LeadDrawer'
import { LeadFilters } from '@pages/leads/LeadFilters'
import { LeadTable } from '@pages/leads/LeadTable'
import { daysUntil } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'
import { SegmentedControl } from '@shared/ui/SegmentedControl'
import { StatTile } from '@shared/ui/StatTile'

const viewLabels: Record<LeadsView, string> = {
  mine: 'Mine',
  unassigned: 'Unassigned',
  others: 'Others',
  all: 'All Leads'
}

function countFollowUpsDue(leads: Lead[]): number {
  return leads.filter((lead) => {
    if (!lead.nextFollowUpAt) return false
    const days = daysUntil(lead.nextFollowUpAt)
    return days >= 0 && days < 7
  }).length
}

export function LeadsPage() {
  const { session } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()

  const views = allowedLeadsViews(session)
  const requested = searchParams.get('view') as LeadsView | null
  const view = requested && views.includes(requested) ? requested : 'mine'

  const [month, setMonth] = useState('')
  const [ownFilters, setFilters] = useState<Filters>({})

  const project = searchParams.get('project') ?? ''
  const setProject = (next: string) => {
    const params: Record<string, string> = { view }
    if (next) params.project = next
    setSearchParams(params)
  }

  const filters = useMemo<Filters>(
    () => ({ ...ownFilters, project: project || undefined }),
    [ownFilters, project]
  )
  const [selected, setSelected] = useState<Lead | null>(null)
  const [assigning, setAssigning] = useState<Lead[] | null>(null)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const assign = (leads: Lead[]) => {
    setAssigning(leads)
    setSelected(null)
  }

  const leads = useLeads(view, filters, month ? { month } : {})
  const rows = leads.leads

  const myProjects = useMyProjectNames()
  const allProjects = useActiveProjectNames()
  const projectNames = useMemo(() => {
    if (myProjects) return [...myProjects].sort((a, b) => a.localeCompare(b))

    const seen = new Set(allProjects.map((name) => name.toLowerCase()))
    const strays = distinctValues(rows, (lead) => lead.project).filter(
      (name) => !seen.has(name.toLowerCase())
    )
    return [...allProjects, ...strays].sort((a, b) => a.localeCompare(b))
  }, [myProjects, allProjects, rows])
  const sourceOptions = useMemo(
    () => distinctValues(leads.data?.leads ?? [], (lead) => lead.source).map((value) => ({ value, label: value })),
    [leads.data]
  )
  const campaignOptions = useMemo(
    () =>
      distinctValues(leads.data?.leads ?? [], (lead) => lead.campaign ?? null).map((value) => ({ value, label: value })),
    [leads.data]
  )
  const highPriority = useMemo(
    () => rows.filter((lead) => lead.priority === 'high').length,
    [rows]
  )
  const followUpsDue = useMemo(() => countFollowUpsDue(rows), [rows])

  const assignFrom = (lead: Lead) => {
    const picked = selectedIds.includes(lead.id)
      ? rows.filter((row) => selectedIds.includes(row.id))
      : []
    assign(picked.length > 0 ? picked : [lead])
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Leads</h1>
        <Button variant="secondary" onClick={() => setUploading(true)}>
          <FileSpreadsheet className="h-4 w-4" />
          Upload Excel
        </Button>
      </header>
      <div className="flex flex-wrap items-stretch gap-3">
        <SegmentedControl
          value={view}
          onChange={(option) => {
            setSearchParams(project ? { view: option, project } : { view: option })
            setSelectedIds([])
          }}
          options={views.map((option) => ({ value: option, label: viewLabels[option] }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <StatTile
          label={viewLabels[view]}
          value={rows.length}
          loading={leads.isPending}
          tone="indigo"
          icon={Users}
        />
        <StatTile
          label="High priority"
          value={highPriority}
          loading={leads.isPending}
          tone="rose"
          icon={Flame}
        />
        <StatTile
          label="Follow ups this week"
          value={followUpsDue}
          loading={leads.isPending}
          tone="amber"
          icon={CalendarClock}
        />
      </div>
      <LeadFilters
        filters={filters}
        onChange={(next) => {
          const { project: picked, ...rest } = next
          if ((picked ?? '') !== project) setProject(picked ?? '')
          setFilters(rest)
          setSelectedIds([])
        }}
        months={leads.months}
        projects={projectNames}
        sources={sourceOptions}
        campaigns={campaignOptions}
        month={month}
        onMonthChange={(next) => {
          setMonth(next)
          setSelectedIds([])
        }}
      />

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">
            {pluralize(selectedIds.length, 'lead')} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghostDanger" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const picked = rows.filter((lead) => selectedIds.includes(lead.id))
                if (picked.length > 0) assign(picked)
              }}
            >
              <UserPlus className="h-4 w-4" />
              Assign selected
            </Button>
          </div>
        </div>
      )}

      {leads.isError && (
        <p className="text-sm text-red-600">{(leads.error as Error).message}</p>
      )}

      <LeadTable
        leads={rows}
        isLoading={leads.isPending}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSelect={setSelected}
        onAssign={assignFrom}
        onEdit={setEditing}
      />
      <LeadDrawer
        lead={selected}
        canAssignLead={selected?.canAssign ?? false}
        onAssign={(lead) => assign([lead])}
        onClose={() => setSelected(null)}
      />

      {editing && <EditLeadDialog lead={editing} onClose={() => setEditing(null)} />}

      {uploading && <ImportLeadsDialog onClose={() => setUploading(false)} />}

      {assigning && (
        <AssignLeadDialog
          key={assigning.map((lead) => lead.id).join(',')}
          leads={assigning}
          roster={leads.roster}
          onAssigned={() => setSelectedIds([])}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  )
}
