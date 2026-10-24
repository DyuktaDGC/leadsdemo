import { ArrowRight, Check, Shuffle, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useShareLeads } from '@hooks/useLeadMutations'
import { useLeads } from '@hooks/useLeads'
import { splitByCounts, splitEvenly } from '@logic/rules/transfer'
import { cn } from '@shared/lib/cn'
import { todayKey } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'
import { Modal } from '@shared/ui/Modal'
import { Skeleton } from '@shared/ui/Skeleton'

const CARD =
  'rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg shadow-brand-900/20 sm:p-6'

const isToday = (iso: string | null, today: string) => iso !== null && todayKey(new Date(iso)) === today

export function MyTodayLeadsCard() {
  const leads = useLeads('all')
  const today = todayKey()

  const mine = leads.leads.filter(
    (lead) =>
      lead.view === 'mine' &&
      (isToday(lead.createdAt, today) || lead.history.some((entry) => isToday(entry.at, today)))
  )
  const open = leads.leads.filter((lead) => lead.view === 'unassigned' && isToday(lead.createdAt, today))

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Today&apos;s leads</h2>
          {leads.isPending ? (
            <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
          ) : (
            <p className="mt-1 text-sm text-white/80">
              <span className="text-4xl font-bold text-white">{mine.length}</span>
              <span className="ml-2">
                assigned to you today
                {open.length > 0 && (
                  <>
                    {' · '}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                      {open.length} new to pick up
                    </span>
                  </>
                )}
              </span>
            </p>
          )}
        </div>
        <Link
          to="/leads?view=mine"
          className="inline-flex items-center gap-2 rounded-xl !bg-white px-4 py-2 text-sm font-semibold !text-brand-700 transition-colors hover:!bg-brand-50"
        >
          Open my leads
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

export function TodayLeadsCard() {
  const leads = useLeads('all')
  const sharing = useShareLeads()
  const [picked, setPicked] = useState<string[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const busy = sharing.isPending

  const today = todayKey()
  const todays = useMemo(
    () => leads.leads.filter((lead) => lead.createdAt && todayKey(new Date(lead.createdAt)) === today),
    [leads.leads, today]
  )
  const waiting = todays.filter((lead) => lead.view === 'unassigned')
  const team = leads.roster.filter((person) => person.role === 'employee')

  const waitingIds = waiting.map((lead) => lead.id)
  const even = splitEvenly(waitingIds, picked)
  const countFor = (id: string) => counts[id] ?? even.find((group) => group.userId === id)?.leadIds.length ?? 0
  const total = picked.reduce((sum, id) => sum + countFor(id), 0)
  const over = total - waiting.length
  const plan = splitByCounts(waitingIds, picked.map((userId) => ({ userId, count: countFor(userId) })))
  const allPicked = team.length > 0 && picked.length === team.length

  const pick = (ids: string[]) => {
    setPicked(ids)
    setCounts({})
  }

  const toggle = (id: string) => pick(picked.includes(id) ? picked.filter((v) => v !== id) : [...picked, id])

  const setCount = (id: string, value: string) => {
    const count = Number(value.replace(/\D/g, '').slice(0, 4)) || 0
    setCounts(Object.fromEntries(picked.map((userId) => [userId, userId === id ? count : countFor(userId)])))
  }

  const close = () => {
    setOpen(false)
    pick([])
  }

  const distribute = () => sharing.mutate(plan, { onSuccess: close })

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Today&apos;s leads</h2>
          {leads.isPending ? (
            <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
          ) : (
            <p className="mt-1 text-sm text-white/80">
              <span className="text-4xl font-bold text-white">{todays.length}</span>
              <span className="ml-2">
                came in today · <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">{waiting.length} unassigned</span>
              </span>
            </p>
          )}
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={leads.isPending || waiting.length === 0}
          className="!bg-white !text-brand-700 hover:!bg-brand-50"
        >
          <Users className="h-4 w-4" />
          Select team
        </Button>
      </div>
      {waiting.length === 0 && !leads.isPending && (
        <p className="mt-3 text-sm text-white/75">
          {todays.length === 0 ? 'No leads have come in today.' : 'Every lead from today is already assigned.'}
        </p>
      )}

      {open && (
        <Modal
          open
          onClose={close}
          title={`Share ${pluralize(waiting.length, 'lead')}`}
          footer={
            <>
              <Button variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={distribute} disabled={busy || plan.length === 0 || over > 0}>
                <Shuffle className="h-4 w-4" />
                {busy ? 'Distributing…' : 'Distribute'}
              </Button>
            </>
          }
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">Pick who gets today&apos;s leads</p>
            {team.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => pick(allPicked ? [] : team.map((person) => person.id))}
                className="text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {allPicked ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
          <ul className="scrollbar-thin max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {team.map((person) => {
              const on = picked.includes(person.id)
              return (
                <li key={person.id} className={cn('flex items-center pr-3', on && 'bg-brand-50')}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={on}
                    onClick={() => toggle(person.id)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                      !on && 'hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{person.name}</span>
                  </button>
                  {on && (
                    <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-700">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={busy}
                        value={countFor(person.id)}
                        onChange={(event) => setCount(person.id, event.target.value)}
                        aria-label={`Leads for ${person.name}`}
                        className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-sm text-ink outline-none focus:border-brand-500"
                      />
                      leads
                    </label>
                  )}
                </li>
              )
            })}
          </ul>
          {picked.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              {over > 0 ? (
                <p role="alert" className="font-medium text-red-600">
                  {pluralize(over, 'lead')} more than the {waiting.length} waiting. Lower a number.
                </p>
              ) : (
                <p className="text-slate-500">
                  {total} of {waiting.length} assigned
                  {total < waiting.length && ` · ${waiting.length - total} stay unassigned`}
                </p>
              )}
              {Object.keys(counts).length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCounts({})}
                  className="shrink-0 font-semibold text-brand-700 hover:text-brand-800"
                >
                  Split equally
                </button>
              )}
            </div>
          )}
        </Modal>
      )}
    </section>
  )
}
