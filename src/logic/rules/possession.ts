import type { Priority } from './priority.ts'

export const POSSESSION_BANDS: readonly { value: string; priority: Priority }[] = [
  { value: 'Under 6 months', priority: 'high' },
  { value: '6 months to 1 year', priority: 'medium' },
  { value: 'More than 1 year', priority: 'low' }
]
