import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '@shared/lib/cn'
import { Checkbox } from '@shared/ui/Checkbox'

export type Column<Row> = {
  key: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  className?: string
  mobile?: 'title' | 'bare'
}

type TableProps<Row> = {
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  onRowClick?: (row: Row) => void
  isLoading?: boolean
  emptyMessage?: string
  pageSize?: number
  selection?: {
    selectedKeys: string[]
    onChange: (keys: string[]) => void
    isSelectable?: (row: Row) => boolean
  }
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading = false,
  emptyMessage = 'Nothing here yet.',
  pageSize,
  selection
}: TableProps<Row>) {
  const [page, setPage] = useState(0)

  const pageCount = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1

  const current = Math.min(page, pageCount - 1)
  const visible = pageSize ? rows.slice(current * pageSize, current * pageSize + pageSize) : rows

  const selectableRows = selection
    ? visible.filter((row) => selection.isSelectable?.(row) ?? true)
    : []
  const selectedSet = new Set(selection?.selectedKeys ?? [])
  const selectedCount = selectableRows.filter((row) => selectedSet.has(rowKey(row))).length
  const allSelected = selectableRows.length > 0 && selectedCount === selectableRows.length

  const toggleAll = () => {
    if (!selection) return
    const next = new Set(selectedSet)
    for (const row of selectableRows) {
      if (allSelected) next.delete(rowKey(row))
      else next.add(rowKey(row))
    }
    selection.onChange([...next])
  }

  const toggleRow = (key: string) => {
    if (!selection) return
    const next = new Set(selectedSet)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selection.onChange([...next])
  }

  const first = rows.length === 0 ? 0 : current * (pageSize ?? rows.length) + 1
  const last = Math.min(first + (pageSize ?? rows.length) - 1, rows.length)

  if (isLoading || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-600" aria-label="Loading" />
        ) : (
          emptyMessage
        )}
      </div>
    )
  }

  const titled = columns.some((column) => column.mobile === 'title')
  const isTitle = (column: Column<Row>, index: number) => (titled ? column.mobile === 'title' : index === 0)
  const head = columns.filter(isTitle)
  const rest = columns.filter((column, index) => !isTitle(column, index))

  const rowClick = (row: Row) =>
    onRowClick &&
    ((event: React.MouseEvent) => {
      if (!(event.target as Element).closest('a, button, input, label')) onRowClick(row)
    })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-300 xl:hidden">
        {visible.map((row) => {
          const key = rowKey(row)
          return (
            <li
              key={key}
              onClick={rowClick(row)}
              className={cn(
                'space-y-3 border-l-[3px] p-4 first:rounded-t-2xl',
                onRowClick && 'cursor-pointer active:bg-slate-50',
                selectedSet.has(key) ? 'border-l-brand-600 bg-brand-50/60' : 'border-l-transparent'
              )}
            >
              <div className="flex items-start gap-3">
                {selection && (selection.isSelectable?.(row) ?? true) && (
                  <div className="pt-0.5">
                    <Checkbox
                      label={`Select row ${key}`}
                      checked={selectedSet.has(key)}
                      onChange={() => toggleRow(key)}
                    />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 items-center gap-3 text-sm text-slate-700">
                  {head.map((column, index) => (
                    <div key={column.key} className={cn(index === head.length - 1 && 'min-w-0 flex-1')}>
                      {column.cell(row)}
                    </div>
                  ))}
                </div>
              </div>
              {rest.length > 0 && (
                <dl className="space-y-2 text-sm">
                  {rest.map((column) =>
                    column.mobile === 'bare' ? (
                      <div key={column.key} className="pt-1 [&>div]:justify-between">
                        {column.cell(row)}
                      </div>
                    ) : (
                      <div key={column.key} className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-2xs font-semibold uppercase tracking-wide text-slate-500">
                          {column.header}
                        </dt>
                        <dd className="min-w-0 wrap-break-word text-right text-slate-700">{column.cell(row)}</dd>
                      </div>
                    )
                  )}
                </dl>
              )}
            </li>
          )
        })}
      </ul>
      <div
        className="scrollbar-thin hidden overflow-auto rounded-t-2xl xl:block"
        style={pageSize ? { maxHeight: '32rem' } : undefined}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              {selection && (
                <th scope="col" className="w-10 px-4 py-3.5">
                  <Checkbox
                    label="Select all rows"
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    disabled={selectableRows.length === 0}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3.5 text-2xs font-semibold uppercase tracking-wide text-slate-500',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={rowClick(row)}
                className={cn(
                  'border-b border-slate-200 transition-colors last:border-0',
                  '[&>td:first-child]:border-l-[3px]',
                  onRowClick && 'cursor-pointer hover:bg-slate-50/70',
                  selectedSet.has(rowKey(row))
                    ? 'bg-brand-50/60 [&>td:first-child]:border-l-brand-600'
                    : '[&>td:first-child]:border-l-transparent'
                )}
              >
                {selection && (
                  <td className="px-4 py-4">
                    {(selection.isSelectable?.(row) ?? true) && (
                      <Checkbox
                        label={`Select row ${rowKey(row)}`}
                        checked={selectedSet.has(rowKey(row))}
                        onChange={() => toggleRow(rowKey(row))}
                      />
                    )}
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-4 align-middle text-slate-700', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize !== undefined && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            Showing {first} to {last} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
            <PageButton
              label="Previous page"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </PageButton>
            <p className="text-xs font-semibold text-slate-600">
              {current + 1} / {pageCount}
            </p>
            <PageButton
              label="Next page"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </PageButton>
          </div>
        </div>
      )}
    </div>
  )
}

function PageButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
