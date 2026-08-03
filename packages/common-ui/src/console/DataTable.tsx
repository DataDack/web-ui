import { Fragment, useMemo, useState, type ReactNode } from "react"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  AlertTriangle,
  Inbox,
  Search,
  SearchX,
  RotateCw,
  SortAsc,
  SortDesc,
  X,
  type LucideIcon,
} from "lucide-react"

import { EmptyState } from "./EmptyState"
import { css, cx, keyframes } from "../lib/emotion"
import { contentEnter, fontMono, media, mix } from "../lib/styles"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Skeleton } from "../ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

const wrap = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

/* The frame every list page was drawing by hand with `glass-1 overflow-hidden`.
   Built in so a table looks like a table without the caller wrapping it, and so
   the two consoles cannot drift on the surface treatment. */
const borderedFrame = css`
  border: 1px solid var(--border-glass, var(--border));
  border-radius: var(--radius-xl, 0.75rem);
  overflow: hidden;
  background: ${mix("--card", 60)};
`

const toolbar = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const search = css`
  position: relative;
  min-width: 0;
  flex: 1 1 14rem;
  max-width: 22rem;
`

const searchIcon = css`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
  pointer-events: none;
`

const searchInput = css`
  padding-left: 32px;
`

const toolbarRight = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
`

/* Sticky needs a positioning context that scrolls, which Table's own container
   already provides. */
const stickyHead = css`
  & th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--background);
  }
`

const sortableHead = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  outline: none;

  &:hover {
    color: var(--foreground);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
    border-radius: 0.125rem;
  }

  & svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.6;
  }
`

/* Columns declared `meta: { responsive: "md" }` are hidden until that width.
   Written as display:none → table-cell rather than a utility class so the
   behaviour travels with the package instead of relying on the consuming app
   generating `hidden md:table-cell`. */
const hiddenBelow = {
  md: css`
    display: none;

    ${media.md} {
      display: table-cell;
    }
  `,
  lg: css`
    display: none;

    ${media.lg} {
      display: table-cell;
    }
  `,
  xl: css`
    display: none;

    ${media.xl} {
      display: table-cell;
    }
  `,
} as const

const compactCell = css`
  padding-top: 4px;
  padding-bottom: 4px;
`

const clickableRow = css`
  cursor: pointer;
`

/* Rows fade in with a short, capped stagger. Capped because a 50-row page with
   an uncapped stagger finishes animating long after the user has started
   reading, which reads as lag rather than polish. */
const ROW_STAGGER_MS = 30
const MAX_STAGGERED_ROWS = 8

function rowStagger(index: number): { animationDelay: string } {
  return { animationDelay: `${String(Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_MS)}ms` }
}

const selectedRow = css`
  background: ${mix("--muted", 60)};
`

const selectCell = css`
  width: 36px;
  padding-right: 0;
`

const expanderButton = css`
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 0.125rem;
  color: var(--muted-foreground);
  outline: none;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: var(--foreground);
  }

  & svg {
    width: 14px;
    height: 14px;
  }
`

const expanderOpen = css`
  transform: rotate(90deg);
`

const subRowCell = css`
  background: ${mix("--muted", 30)};
`

const footer = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

const footerInfo = css`
  font-family: ${fontMono};
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
`

const pager = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
`

const pageSize = css`
  width: 5rem;
`

const spinFrames = keyframes`
  to { transform: rotate(360deg); }
`

const spinning = css`
  animation: ${spinFrames} 1s linear infinite;
`

/* The three body states have to be told apart at a glance, because they mean
   very different things: a failure the user can retry, a genuinely empty
   account, and data on its way. Error is the only one that carries the
   destructive tone — an empty list is not a problem. */
const stateCell = css`
  padding: 48px 24px;
  text-align: center;
`

const stateBlock = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`

const errorTile = css`
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border-radius: var(--radius-xl, 0.75rem);
  border: 1px solid ${mix("--destructive", 25)};
  background: ${mix("--destructive", 10)};
  color: var(--destructive);

  & svg {
    width: 20px;
    height: 20px;
  }
`

const errorTitle = css`
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: var(--foreground);
`

const errorDetail = css`
  max-width: 26rem;
  font-size: 13px;
  color: var(--muted-foreground);
`

const retryButton = css`
  margin-top: 16px;
`

/* Skeleton widths vary per column so a loading table reads like a table of
   content rather than a block of identical bars. */
const SKELETON_WIDTHS = ["72%", "44%", "58%", "36%", "64%", "48%"] as const

const skeletonBar = css`
  height: 12px;
`

const bulkBar = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: ${mix("--muted", 60)};
  padding: 8px 12px;
`

const bulkCount = css`
  font-family: ${fontMono};
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
`

const bulkSpacer = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
`

/** Tri-state for the select-all box: all, some, or none of the page selected. */
function headerCheckedState<T>(table: TanstackTable<T>): boolean | "indeterminate" {
  if (table.getIsAllPageRowsSelected()) return true
  if (table.getIsSomePageRowsSelected()) return "indeterminate"
  return false
}

type SortDirection = false | "asc" | "desc"

function ariaSort(direction: SortDirection): "ascending" | "descending" | undefined {
  if (direction === "asc") return "ascending"
  if (direction === "desc") return "descending"
  return undefined
}

function SortIcon({ direction }: Readonly<{ direction: SortDirection }>) {
  if (direction === "asc") return <SortAsc />
  if (direction === "desc") return <SortDesc />
  return <ChevronsUpDown />
}

/**
 * A header cell's content: nothing for a placeholder, a sort button when the
 * column is sortable, and the bare label otherwise.
 */
function HeaderContent<T>({ header }: Readonly<{ header: Header<T, unknown> }>) {
  if (header.isPlaceholder) return null

  const label = flexRender(header.column.columnDef.header, header.getContext())
  if (!header.column.getCanSort()) return label

  return (
    <button
      type="button"
      className={sortableHead}
      onClick={header.column.getToggleSortingHandler()}
    >
      {label}
      <SortIcon direction={header.column.getIsSorted()} />
    </button>
  )
}

/**
 * Per-column options, set through TanStack's `meta`:
 *
 *   { accessorKey: "region", header: "Region", meta: { responsive: "md" } }
 */
export interface DataTableColumnMeta {
  /** Hide the column below this breakpoint, to keep narrow screens readable. */
  responsive?: "md" | "lg" | "xl"
  /**
   * The cell holds its own controls — a menu, a switch, a link. Clicks inside it
   * must not also trigger `onRowClick`.
   */
  interactive?: boolean
}

/** TanStack types `meta` as unknown-ish, so this is the single cast point. */
function columnMeta<T>(column: ColumnDef<T>): DataTableColumnMeta | undefined {
  return column.meta
}

function responsiveClass(meta: DataTableColumnMeta | undefined): string | undefined {
  return meta?.responsive ? hiddenBelow[meta.responsive] : undefined
}

/** One entry in the bar that appears while rows are selected. */
export interface DataTableBulkAction {
  label: string
  icon?: LucideIcon
  /** Renders in the destructive tone — deletes, terminations, revocations. */
  destructive?: boolean
  onAction: () => void
}

/**
 * Server-driven paging: the table renders exactly the rows it is given and
 * reports the page the user asked for, rather than slicing locally.
 */
export interface DataTableServerPagination {
  /** 1-based, matching the page number a user sees and an API expects. */
  page: number
  pageSize: number
  /** Row count across all pages, used to work out how many pages there are. */
  total: number
  onPageChange: (page: number) => void
}

/** Client-side paging, with the page size the user can change. */
export interface DataTableClientPagination {
  pageSize?: number
  pageSizeOptions?: readonly number[]
}

export type DataTablePagination = boolean | DataTableClientPagination | DataTableServerPagination

function isServerPagination(
  pagination: DataTablePagination,
): pagination is DataTableServerPagination {
  return typeof pagination === "object" && "total" in pagination
}

/**
 * The client-paging config, or undefined when paging is off or handed to the
 * server. `pagination: true` means "page it, with the defaults".
 */
function resolveClientPaging(
  pagination: DataTablePagination,
  isServer: boolean,
): DataTableClientPagination | undefined {
  if (isServer || !pagination) return undefined
  return typeof pagination === "object" ? pagination : {}
}

export interface DataTableProps<T> {
  data: readonly T[]
  columns: ColumnDef<T>[]

  /** Swaps the body for skeleton rows without unmounting the header. */
  loading?: boolean
  skeletonRows?: number

  /**
   * Replaces the body with a failure message and, when `onRetry` is given, a
   * retry button. Takes precedence over every other body state — a failed fetch
   * must never be reported as "nothing here yet".
   */
  error?: ReactNode
  /** Headline above the message. Defaults to "Could not load this list". */
  errorTitle?: string
  onRetry?: () => void
  retryLabel?: string

  /** Shown when there are no rows at all, as opposed to none matching a filter. */
  empty?: ReactNode
  /** Shown when filters exclude everything — falls back to `empty`. */
  noResults?: ReactNode

  /** Free-text filter across every visible column. */
  searchable?: boolean
  searchPlaceholder?: string
  /** Lift the search value out to drive server-side filtering instead. */
  globalFilter?: string
  onGlobalFilterChange?: OnChangeFn<string>

  defaultSorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void

  /**
   * Paging. On by default and client-side, because that is right for almost
   * every list here: the data arrives whole, so paging in the browser costs
   * nothing and a long list stays navigable. Pass an object to set the page size
   * and its options, a `{ page, pageSize, total, onPageChange }` object to hand
   * paging to the server, or `false` for a short fixed list that should never
   * paginate.
   *
   * Either way the footer hides itself when everything fits on one page, so a
   * three-row table shows no controls.
   */
  pagination?: DataTablePagination

  /**
   * Rendered at the LEFT of the toolbar, beside the search box — filters and
   * scope switches. `actions` is the right-hand slot.
   */
  toolbar?: ReactNode

  /**
   * Bar shown while rows are selected, built from the current selection.
   * Requires `selectable`.
   */
  bulkActions?: (rows: T[]) => DataTableBulkAction[]

  /** Adds a leading checkbox column and reports the selection. */
  selectable?: boolean
  onSelectionChange?: (rows: T[]) => void
  /** Stable identity for selection across refetches — defaults to row index. */
  getRowId?: (row: T, index: number) => string

  /** Adds a menu for hiding columns. */
  columnToolbar?: boolean
  columnToolbarLabel?: string

  /**
   * Draw the table's own frame. On by default: a list is a bounded surface, and
   * every page was otherwise wrapping it in the same two utility classes.
   */
  bordered?: boolean

  /**
   * Refetch handler. Given one, the toolbar grows a refresh button — so every
   * list offers the same way to reload without each page building its own.
   */
  onRefresh?: () => void
  /** Spins the refresh icon and disables the button while a refetch is in flight. */
  refreshing?: boolean
  refreshLabel?: string

  density?: "default" | "compact"
  stickyHeader?: boolean

  /**
   * Fade rows in with a short staggered delay as they mount. On by default,
   * which is how the console has always rendered a list; pass `false` for a
   * table that re-renders often enough that the entrance becomes a flicker.
   */
  animateRows?: boolean

  /**
   * Renders an expandable detail panel under a row. Adds a chevron column, and
   * the panel spans the full width so it can hold anything.
   */
  renderSubRow?: (row: T) => ReactNode
  /** Gate expansion per row — rows that cannot expand get no chevron. */
  rowCanExpand?: (row: T) => boolean

  /**
   * Render something else in place of a row — an inline edit form, typically.
   * Return null to render the row normally. The replacement supplies its own
   * TableRow and cells, so it can span or reshape the grid however it needs.
   */
  renderRow?: (row: T) => ReactNode | null

  /**
   * A row rendered inside the table body, after the data. For an inline "add"
   * form that belongs in the grid rather than above it — it must render its own
   * TableRow and cells, and it stays visible through the empty and loading
   * states so the way to add the first entry never disappears.
   */
  footerRow?: ReactNode

  onRowClick?: (row: T) => void
  /**
   * Extra classes for every body row, or per row when given a function. The way
   * to attach a hover group (`group/row`) so a cell can reveal a control only
   * while its own row is hovered.
   */
  rowClassName?: string | ((row: T) => string | undefined)
  /** Rendered at the right of the toolbar — bulk actions, filters, buttons. */
  actions?: ReactNode
  className?: string
}

/**
 * The console's data table: one component covering the behaviour every list page
 * re-implemented by hand — sorting, free-text filtering, pagination, row
 * selection, column visibility, sticky headers, density, and distinct loading,
 * empty and no-results states.
 *
 * It is a thin, opinionated layer over TanStack Table: state lives here so the
 * common case is `<DataTable data columns />`, and every piece can be lifted out
 * through its callback when a page needs to drive it from the server instead.
 * Rendering goes through this package's own Table primitives, so a DataTable and
 * a hand-built table read identically.
 */
export function DataTable<T>({
  data,
  columns,
  loading = false,
  skeletonRows = 5,
  error,
  errorTitle: errorTitleText = "Could not load this list",
  onRetry,
  retryLabel = "Retry",
  empty,
  noResults,
  searchable = false,
  searchPlaceholder = "Search…",
  globalFilter,
  onGlobalFilterChange,
  defaultSorting = [],
  onSortingChange,
  pagination = true,
  toolbar: toolbarSlot,
  bulkActions,
  selectable = false,
  onSelectionChange,
  getRowId,
  columnToolbar = false,
  columnToolbarLabel = "Columns",
  bordered = true,
  onRefresh,
  refreshing = false,
  refreshLabel = "Refresh",
  density = "default",
  stickyHeader = false,
  animateRows = true,
  renderSubRow,
  rowCanExpand,
  renderRow,
  footerRow,
  onRowClick,
  rowClassName,
  actions,
  className,
}: Readonly<DataTableProps<T>>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [internalFilter, setInternalFilter] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filterValue = globalFilter ?? internalFilter

  // Server paging means the table must not slice again: it already holds one
  // page of rows, and the row model has to leave them alone.
  const serverPaging = isServerPagination(pagination) ? pagination : undefined
  const clientPaging = resolveClientPaging(pagination, serverPaging !== undefined)
  const pageSizeOptions: readonly number[] = clientPaging?.pageSizeOptions ?? [10, 25, 50, 100]

  // The checkbox column is prepended rather than asked for, so callers never
  // hand-roll select-all/indeterminate logic.
  const allColumns = useMemo<ColumnDef<T>[]>(() => {
    if (!selectable) return columns
    const selectColumn: ColumnDef<T> = {
      id: "__select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows"
          checked={headerCheckedState(table)}
          onCheckedChange={(v) => {
            table.toggleAllPageRowsSelected(v === true)
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => {
            row.toggleSelected(v === true)
          }}
          // Stop the row's own click handler firing when only the box was hit.
          onClick={(event) => {
            event.stopPropagation()
          }}
        />
      ),
    }
    return [selectColumn, ...columns]
  }, [columns, selectable])

  const finalColumns = useMemo<ColumnDef<T>[]>(() => {
    if (!renderSubRow) return allColumns
    const expander: ColumnDef<T> = {
      id: "__expander",
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        if (rowCanExpand && !rowCanExpand(row.original)) return null
        const open = expanded[row.id] ?? false
        return (
          <button
            type="button"
            className={cx(expanderButton, open && expanderOpen)}
            aria-label={open ? "Collapse row" : "Expand row"}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation()
              setExpanded((prev) => ({ ...prev, [row.id]: !open }))
            }}
          >
            <ChevronRightIcon />
          </button>
        )
      },
    }
    return [expander, ...allColumns]
  }, [allColumns, expanded, renderSubRow, rowCanExpand])

  const table = useReactTable({
    data: data as T[],
    columns: finalColumns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter: filterValue },
    getRowId,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      setSorting(next)
      onSortingChange?.(next)
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater
      setRowSelection(next)
      if (onSelectionChange) {
        const picked = table
          .getCoreRowModel()
          .rows.filter((r) => next[r.id])
          .map((r) => r.original)
        onSelectionChange(picked)
      }
    },
    onGlobalFilterChange: onGlobalFilterChange ?? setInternalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(clientPaging ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    initialState: clientPaging
      ? { pagination: { pageSize: clientPaging.pageSize ?? 25 } }
      : undefined,
  })

  const rows = table.getRowModel().rows
  const hasRows = data.length > 0
  const hasError = error !== undefined && error !== null
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const hideableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide())

  return (
    <div className={cx(wrap, className)}>
      {(searchable || columnToolbar || actions || toolbarSlot || onRefresh) && (
        <div className={toolbar}>
          {searchable && (
            <div className={search}>
              <Search className={searchIcon} />
              <Input
                type="search"
                // A placeholder is not an accessible name: it disappears on
                // input and screen readers may skip it entirely, leaving an
                // unlabelled box. The visible affordance is the magnifier icon,
                // which is decorative, so the name has to be supplied here.
                aria-label={searchPlaceholder}
                className={searchInput}
                value={filterValue}
                placeholder={searchPlaceholder}
                onChange={(event) => {
                  table.setGlobalFilter(event.target.value)
                }}
              />
            </div>
          )}
          {toolbarSlot}
          <div className={toolbarRight}>
            {actions}
            {onRefresh && (
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={refreshLabel}
                title={refreshLabel}
                disabled={refreshing}
                onClick={onRefresh}
              >
                <RotateCw className={refreshing ? spinning : undefined} />
              </Button>
            )}
            {columnToolbar && hideableColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 />
                    {columnToolbarLabel}
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{columnToolbarLabel}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(v) => {
                        column.toggleVisibility(v)
                      }}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {bulkActions && selectedRows.length > 0 && (
        <div className={bulkBar}>
          <span className={bulkCount}>{selectedRows.length} selected</span>
          {bulkActions(selectedRows).map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.destructive ? "destructive" : "outline"}
              onClick={action.onAction}
            >
              {action.icon && <action.icon />}
              {action.label}
            </Button>
          ))}
          <div className={bulkSpacer}>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Clear selection"
              onClick={() => {
                table.resetRowSelection()
              }}
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <Table containerClassName={bordered ? borderedFrame : undefined}>
        <TableHeader className={stickyHeader ? stickyHead : undefined}>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    className={cx(
                      header.column.id === "__select" && selectCell,
                      responsiveClass(columnMeta(header.column.columnDef)),
                    )}
                    aria-sort={ariaSort(sorted)}
                  >
                    <HeaderContent header={header} />
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {/* A failed fetch is reported as a failure. Falling through to the
              empty state here would tell the user their account is empty when
              in fact nothing is known about it. */}
          {hasError && !loading && (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className={stateCell}>
                <div className={stateBlock}>
                  <span className={errorTile}>
                    <AlertTriangle />
                  </span>
                  <span className={errorTitle}>{errorTitleText}</span>
                  {/* The caller's message is the detail, not the headline: an API
                      error string is rarely a good title. */}
                  <span className={errorDetail}>{error}</span>
                  {onRetry && (
                    <Button size="sm" variant="outline" className={retryButton} onClick={onRetry}>
                      <RotateCw />
                      {retryLabel}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}

          {loading &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={`skeleton-${String(i)}`}>
                {Array.from({ length: visibleColumnCount }, (_, c) => (
                  <TableCell key={`skeleton-${String(i)}-${String(c)}`}>
                    <Skeleton
                      className={skeletonBar}
                      // Stagger the widths across rows and columns so the
                      // placeholder does not look like a grid of equal blocks.
                      style={{
                        width: SKELETON_WIDTHS[(c + i) % SKELETON_WIDTHS.length],
                      }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading &&
            !hasError &&
            rows.map((row: Row<T>, rowIndex: number) => {
              const replacement = renderRow?.(row.original)
              if (replacement) return <Fragment key={row.id}>{replacement}</Fragment>
              return (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cx(
                      animateRows && contentEnter,
                      row.getIsSelected() && selectedRow,
                      onRowClick && clickableRow,
                      typeof rowClassName === "function"
                        ? rowClassName(row.original)
                        : rowClassName,
                    )}
                    style={animateRows ? rowStagger(rowIndex) : undefined}
                    onClick={
                      onRowClick
                        ? () => {
                            onRowClick(row.original)
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = columnMeta(cell.column.columnDef)
                      return (
                        <TableCell
                          key={cell.id}
                          className={cx(
                            density === "compact" && compactCell,
                            (cell.column.id === "__select" || cell.column.id === "__expander") &&
                              selectCell,
                            responsiveClass(meta),
                          )}
                          // A cell holding its own controls must not also fire the
                          // row's click handler — hitting a row menu would navigate.
                          onClick={
                            meta?.interactive
                              ? (event) => {
                                  event.stopPropagation()
                                }
                              : undefined
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                  {renderSubRow && (expanded[row.id] ?? false) && (
                    <TableRow key={`${row.id}-detail`}>
                      <TableCell colSpan={visibleColumnCount} className={subRowCell}>
                        {renderSubRow(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}

          {!loading && !hasError && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumnCount}>
                {hasRows
                  ? (noResults ?? (
                      <EmptyState
                        icon={SearchX}
                        title="No matching rows"
                        description="Adjust the search or filters to widen the result."
                      />
                    ))
                  : (empty ?? <EmptyState icon={Inbox} title="Nothing here yet" />)}
              </TableCell>
            </TableRow>
          )}
          {footerRow}
        </TableBody>
      </Table>

      {serverPaging && !loading && !hasError && rows.length > 0 && (
        <ServerPager pagination={serverPaging} selectedCount={selectedRows.length} />
      )}

      {clientPaging && !loading && !hasError && rows.length > 0 && table.getPageCount() > 1 && (
        <div className={footer}>
          <span className={footerInfo}>
            {selectable && Object.keys(rowSelection).length > 0
              ? `${String(Object.keys(rowSelection).length)} selected · `
              : ""}
            {`page ${String(table.getState().pagination.pageIndex + 1)} of ${String(table.getPageCount())} · ${String(table.getFilteredRowModel().rows.length)} rows`}
          </span>
          <div className={pager}>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v))
              }}
            >
              <SelectTrigger size="sm" className={pageSize}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.setPageIndex(0)
              }}
            >
              <ChevronFirst />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.previousPage()
              }}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => {
                table.nextPage()
              }}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => {
                table.setPageIndex(table.getPageCount() - 1)
              }}
            >
              <ChevronLast />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Footer for a server-paged table: a range readout and page controls that
 * report the requested page rather than slicing rows locally. Hidden when there
 * is only one page, so short tables keep a clean footer.
 */
function ServerPager({
  pagination,
  selectedCount,
}: Readonly<{ pagination: DataTableServerPagination; selectedCount: number }>) {
  const { page, pageSize: size, total, onPageChange } = pagination
  const pageCount = Math.max(1, Math.ceil(total / size))
  if (pageCount <= 1) return null

  // The last page is short, so clamp the upper bound to the total.
  const first = (page - 1) * size + 1
  const last = Math.min(page * size, total)

  return (
    <div className={footer}>
      <span className={footerInfo}>
        {selectedCount > 0 ? `${String(selectedCount)} selected · ` : ""}
        {`${String(first)}–${String(last)} of ${String(total)}`}
      </span>
      <div className={pager}>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="First page"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(1)
          }}
        >
          <ChevronFirst />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1)
          }}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => {
            onPageChange(page + 1)
          }}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Last page"
          disabled={page >= pageCount}
          onClick={() => {
            onPageChange(pageCount)
          }}
        >
          <ChevronLast />
        </Button>
      </div>
    </div>
  )
}
