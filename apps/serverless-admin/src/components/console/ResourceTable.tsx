import { useState } from 'react'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, type LucideIcon, Search } from 'lucide-react'

import { EmptyState } from '@/components/console/EmptyState'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ResourceTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  /** Placeholder for the global filter box; omit to hide the toolbar. */
  searchPlaceholder?: string
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription?: string
  className?: string
}

/**
 * The console's one table. Sorting and global filtering run client-side because
 * every list is already fully materialised in the dashboard snapshot — paging to
 * the server would add a round trip for data the browser is holding anyway.
 */
export function ResourceTable<T>({
  data,
  columns,
  loading = false,
  searchPlaceholder,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  className,
}: Readonly<ResourceTableProps<T>>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <div className={className}>
      {searchPlaceholder && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={globalFilter}
              onChange={(event) => {
                setGlobalFilter(event.target.value)
              }}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-[13px]"
            />
          </div>
          <span className="text-muted-foreground ml-auto font-mono text-[11px] tabular-nums">
            {rows.length} of {data.length}
          </span>
        </div>
      )}

      <div className="glass-2 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const dir = header.column.getIsSorted()
                  if (header.isPlaceholder) {
                    return <TableHead key={header.id} />
                  }

                  return (
                    <TableHead key={header.id}>
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground inline-flex items-center gap-1 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' && <ArrowUp className="size-3" />}
                          {dir === 'desc' && <ArrowDown className="size-3" />}
                          {!dir && <ArrowUpDown className="size-3 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading &&
              // Skeleton rows mirror the real row height so the swap does not jump.
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={`skeleton-${String(i)}`} className="hover:bg-transparent">
                  {table.getAllLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full max-w-28" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading &&
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className="animate-content-enter"
                  // Capped stagger: a long list should not crawl in.
                  style={{ animationDelay: `${String(Math.min(index, 8) * 30)}ms` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={table.getAllLeafColumns().length} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={data.length === 0 ? emptyTitle : 'No matches'}
                    description={
                      data.length === 0 ? emptyDescription : 'No rows match the current filter.'
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/** Shared cell helpers so every list renders the same value the same way. */
export const cellText = (value?: string | number | null, className?: string) =>
  value === undefined || value === null || value === '' ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className={cn('text-[13px]', className)}>{value}</span>
  )

export const cellMono = (value?: string | number | null) => cellText(value, 'font-mono text-[12px]')
