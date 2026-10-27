export const LEAD_PRIORITIES = ['high', 'medium', 'low'] as const

type Priority = (typeof LEAD_PRIORITIES)[number]

const labels: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export function priorityLabel(priority: string): string {
  return labels[priority as Priority] ?? priority
}
