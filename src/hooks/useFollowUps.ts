import { useMemo } from 'react'

import { useLeads } from '@hooks/useLeads'
import { useSession } from '@hooks/useSession'
import type { Lead } from '@logic/leads/leadTypes'
import { isOwner } from '@logic/rules/session'
import { daysUntil } from '@shared/lib/date'

export function useFollowUps() {
  const { session } = useSession()
  const owner = isOwner(session)
  const leads = useLeads('all')

  const groups = useMemo(() => {
    const overdue: Lead[] = []
    const today: Lead[] = []
    const upcoming: Lead[] = []
    for (const lead of leads.leads) {
      if (!lead.nextFollowUpAt || lead.isTerminal) continue
      if (!owner && lead.view !== 'mine') continue
      const days = daysUntil(lead.nextFollowUpAt)
      if (days < 0) overdue.push(lead)
      else if (days === 0) today.push(lead)
      else upcoming.push(lead)
    }
    const byDate = (a: Lead, b: Lead) => Date.parse(a.nextFollowUpAt!) - Date.parse(b.nextFollowUpAt!)
    return { overdue: overdue.sort(byDate), today: today.sort(byDate), upcoming: upcoming.sort(byDate) }
  }, [leads.leads, owner])

  return { ...groups, owner, isPending: leads.isPending, error: leads.error }
}
