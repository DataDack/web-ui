import { useState } from "react"

import { css, cx } from "@emotion/css"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, type LucideIcon, Search } from "lucide-react"

import { EmptyState } from "./EmptyState"
import { contentEnter, fontMono, glass2, mix } from "../lib/styles"
import { Input } from "../ui/input"
import { Skeleton } from "../ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

const toolbar = css`
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const searchBox = css`
  position: relative;
  width: 100%;
  max-width: 20rem;
`

const searchIcon = css`
  color: var(--muted-foreground);
  pointer-events: none;
  position: absolute;
  top: 50%;
  left: 10px;
  width: 14px;
  height: 14px;
  transform: translateY(-50%);
`

const searchInput = css`
  height: 32px;
  padding-left: 32px;
  font-size: 13px;
`

const countText = css`
  color: var(--muted-foreground);
  margin-left: auto;
  font-family: ${fontMono};
  font-size: 11px;
  font-variant-numeric: tabular-nums;
`

const panel = css`
  overflow: hidden;
`

const sortButton = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 0.25rem;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &:hover {
    color: var(--foreground);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px ${mix("--ring", 50)};
  }
`

const sortIcon = css`
  width: 12px;
  height: 12px;
`

const sortIconIdle = css`
  opacity: 0.4;
`

const noHover = css`
  &:hover {
    background: transparent;
  }
`

const skeletonCell = css`
  height: 16px;
  width: 100%;
  max-width: 112px;
`

const emptyCell = css`
  padding: 0;
`

const cellTextStyle = css`
  font-size: 13px;
`

const cellMonoStyle = css`
  font-family: ${fontMono};
  font-size: 12px;
`

const missing = css`
  color: var(--muted-foreground);
`

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
  const [globalFilter, setGlobalFilter] = useState("")

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
        <div className={toolbar}>
          <div className={searchBox}>
            <Search className={searchIcon} />
            <Input
              value={globalFilter}
              onChange={(event) => {
                setGlobalFilter(event.target.value)
              }}
              placeholder={searchPlaceholder}
              className={searchInput}
            />
          </div>
          <span className={countText}>
            {rows.length} of {data.length}
          </span>
        </div>
      )}

      <div className={cx(glass2, panel)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className={noHover}>
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
                          className={sortButton}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === "asc" && <ArrowUp className={sortIcon} />}
                          {dir === "desc" && <ArrowDown className={sortIcon} />}
                          {!dir && <ArrowUpDown className={cx(sortIcon, sortIconIdle)} />}
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
                <TableRow key={`skeleton-${String(i)}`} className={noHover}>
                  {table.getAllLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className={skeletonCell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading &&
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={contentEnter}
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
              <TableRow className={noHover}>
                <TableCell colSpan={table.getAllLeafColumns().length} className={emptyCell}>
                  <EmptyState
                    icon={emptyIcon}
                    title={data.length === 0 ? emptyTitle : "No matches"}
                    description={
                      data.length === 0 ? emptyDescription : "No rows match the current filter."
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
  value === undefined || value === null || value === "" ? (
    <span className={missing}>—</span>
  ) : (
    <span className={cx(cellTextStyle, className)}>{value}</span>
  )

export const cellMono = (value?: string | number | null) => cellText(value, cellMonoStyle)
