import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ImportRow } from '@logic/leads/importRows'
import { assignLeads, importLeads, shareLeads, writeLead } from '@logic/leads/leadsApi'
import type { Lead, LeadWriteInput, RosterMember } from '@logic/leads/leadTypes'
import { pluralize } from '@shared/lib/format'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LeadWriteInput) => writeLead(input),
    onSuccess: () => toast('Lead updated'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

export function useShareLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: shareLeads,
    onSuccess: (people, groups) =>
      toast(
        `${pluralize(groups.reduce((sum, group) => sum + group.leadIds.length, 0), 'lead')} shared between ${pluralize(people, 'person', 'people')}`
      ),
    onError: (error) => toast(error.message, 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ rows, fileName }: { rows: ImportRow[]; fileName: string }) => importLeads(rows, fileName),
    onSuccess: ({ added, repeats, rejected }) =>
      toast(
        [
          `${pluralize(added, 'lead')} added`,
          repeats > 0 && `${pluralize(repeats, 'repeat')}`,
          rejected > 0 && `${rejected} without a valid phone`
        ]
          .filter(Boolean)
          .join(' · ')
      ),
    onError: (error) => toast(error.message, 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

export function useAssignLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leads, people }: { leads: Lead[]; people: RosterMember[] }) =>
      assignLeads(leads, people),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}
