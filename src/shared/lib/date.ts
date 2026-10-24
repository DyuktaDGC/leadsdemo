import { env } from '@shared/lib/env'

const APP_TIME_ZONE = env.timeZone

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

function toDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | number | Date | null | undefined): string {
  if (value == null) return 'N/A'
  const date = toDate(value)
  return date ? dateFormatter.format(date) : 'N/A'
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null) return 'N/A'
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : 'N/A'
}

function parsePeriod(period: string): { year: number; month: number } {
  const [year, month] = period.split('-').map(Number)
  return { year, month }
}

function periodLabel(period: string, monthStyle: 'long' | 'short' = 'long'): string {
  const { year, month } = parsePeriod(period)
  if (!year || !month) return period

  return new Intl.DateTimeFormat('en-IN', { month: monthStyle, year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
}

export function periodOptions(periods: readonly string[] = []): { label: string; value: string }[] {
  return periods.map((value) => ({ label: periodLabel(value, 'short'), value }))
}

export function toKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function todayKey(now: Date = new Date()): string {
  return keyFormatter.format(now)
}

export function daysUntil(value: string | number | Date, now: Date = new Date()): number {
  const target = toDate(value)
  if (!target) return 0
  const midnight = (key: string) => Date.parse(`${key}T00:00:00Z`)
  return Math.round((midnight(todayKey(target)) - midnight(todayKey(now))) / 86_400_000)
}

export function fromKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function monthGrid(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setDate(1 - start.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}
