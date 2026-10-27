const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

export const formatMoney = (amount: number) => money.format(amount)

export const compactMoney = (amount: number) => `₹${compact.format(amount)}`

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function niceTop(max: number, empty: number): number {
  if (max <= 0) return empty
  const step = Math.max(1, 10 ** Math.floor(Math.log10(max)) / 2)
  return Math.ceil(max / (2 * step)) * 2 * step
}
