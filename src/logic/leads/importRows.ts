import type { SheetData } from 'read-excel-file/browser'

export type ImportRow = { name: string | null; phone: string | null }

export type ImportResult = { added: number; repeats: number; rejected: number }

const NAME = /name/i
const PHONE = /phone|mobile|contact|number|whatsapp/i

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim())
const isPhone = (cell: string) => PHONE.test(cell) && !NAME.test(cell)

const headerIndex = (data: SheetData) => data.slice(0, 10).findIndex((row) => row.some((cell) => isPhone(text(cell))))

export const hasPhoneColumn = (data: SheetData) => headerIndex(data) >= 0

export function leadRows(data: SheetData): ImportRow[] {
  const headerAt = headerIndex(data)
  if (headerAt < 0) throw new Error('No Phone column found. Name the column "Phone" or "Mobile".')
  const header = data[headerAt].map(text)
  const phone = header.findIndex(isPhone)
  const exact = header.findIndex((cell) => /^(full\s*)?name$/i.test(cell))
  const name = exact >= 0 ? exact : header.findIndex((cell) => NAME.test(cell))
  return data
    .slice(headerAt + 1)
    .map((row) => ({ name: name < 0 ? null : text(row[name]) || null, phone: text(row[phone]) || null }))
    .filter((row) => row.name || row.phone)
}
