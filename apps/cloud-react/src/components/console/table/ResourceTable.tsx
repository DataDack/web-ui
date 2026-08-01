import { type ReactNode, useMemo, useState } from "react"

import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type Header,
    type Row,
    type RowSelectionState,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from "@tanstack/react-table"
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RotateCw,
    Settings2,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { type BulkAction, BulkActionsBar } from "./BulkActionsBar"
import { staggerDelay } from "../motion/motion-config"

/** Per-column responsive visibility, set via column `meta: { responsive: "md" }` */
export interface ColumnMeta {
    responsive?: "md" | "lg" | "xl"
    /** Cells that contain their own interactive controls (skip row onClick) */
    interactive?: boolean
}

const RESPONSIVE_CLASSES: Record<NonNullable<ColumnMeta["responsive"]>, string> = {
    md: "hidden md:table-cell",
    lg: "hidden lg:table-cell",
    xl: "hidden xl:table-cell",
}

function responsiveClass(responsive: ColumnMeta["responsive"]): string | undefined {
    return responsive ? RESPONSIVE_CLASSES[responsive] : undefined
}

/** TanStack's ColumnMeta is untyped here — single cast point for console meta */
function getMeta(columnDef: { meta?: unknown }): ColumnMeta | undefined {
    return columnDef.meta as ColumnMeta | undefined
}

function HeaderCell<TData>({ header }: Readonly<{ header: Header<TData, unknown> }>) {
    const canSort = header.column.getCanSort()
    const sortDir = header.column.getIsSorted()

    let content: ReactNode = null
    if (!header.isPlaceholder) {
        const label = flexRender(header.column.columnDef.header, header.getContext())
        content = canSort ? (
            <button
                type="button"
                onClick={header.column.getToggleSortingHandler()}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
            >
                {label}
                {sortDir === "asc" && <ArrowUp className="size-3" />}
                {sortDir === "desc" && <ArrowDown className="size-3" />}
                {!sortDir && <ArrowUpDown className="size-3 opacity-40" />}
            </button>
        ) : (
            label
        )
    }

    return (
        <TableHead
            className={cn(
                "px-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground",
                responsiveClass(getMeta(header.column.columnDef)?.responsive)
            )}
        >
            {content}
        </TableHead>
    )
}

function DataRow<TData>({
    row,
    index,
    onRowClick,
}: Readonly<{ row: Row<TData>; index: number; onRowClick?: (row: TData) => void }>) {
    return (
        <TableRow
            data-state={row.getIsSelected() ? "selected" : undefined}
            onClick={
                onRowClick
                    ? () => {
                          onRowClick(row.original)
                      }
                    : undefined
            }
            className={cn("animate-content-enter", onRowClick && "cursor-pointer")}
            style={staggerDelay(index)}
        >
            {row.getVisibleCells().map((cell) => {
                const meta = getMeta(cell.column.columnDef)
                return (
                    <TableCell
                        key={cell.id}
                        className={cn("py-2.5", responsiveClass(meta?.responsive))}
                        onClick={
                            meta?.interactive
                                ? (e) => {
                                      e.stopPropagation()
                                  }
                                : undefined
                        }
                    >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                )
            })}
        </TableRow>
    )
}

/**
 * Server-driven paging. The table renders the page it was handed — it never
 * slices `data` itself — so `total` is the count across all pages, not
 * `data.length`. Omit the prop for tables that fetch everything at once.
 */
export interface TablePagination {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
}

/**
 * Range + prev/next for a server-paged table. Hidden while there's nothing to
 * page through (one page or fewer), so single-page tables keep a clean footer.
 */
function TablePaginationBar({
    pagination,
    isLoading,
}: Readonly<{ pagination: TablePagination; isLoading: boolean }>) {
    const { t } = useTranslation()
    const { page, pageSize, total, onPageChange } = pagination
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    if (pageCount <= 1) return null

    // The last page is short, so clamp the upper bound to the total.
    const first = (page - 1) * pageSize + 1
    const last = Math.min(page * pageSize, total)

    return (
        <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {t("console.table.range", {
                    first,
                    last,
                    total,
                    defaultValue: `${String(first)}–${String(last)} of ${String(total)}`,
                })}
            </span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={page <= 1 || isLoading}
                    onClick={() => {
                        onPageChange(page - 1)
                    }}
                >
                    <ChevronLeft className="size-3.5" />
                    {t("console.table.previous", { defaultValue: "Previous" })}
                </Button>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {t("console.table.pageOf", {
                        page,
                        pageCount,
                        defaultValue: `${String(page)} / ${String(pageCount)}`,
                    })}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={page >= pageCount || isLoading}
                    onClick={() => {
                        onPageChange(page + 1)
                    }}
                >
                    {t("console.table.next", { defaultValue: "Next" })}
                    <ChevronRight className="size-3.5" />
                </Button>
            </div>
        </div>
    )
}

interface ResourceTableProps<TData> {
    data: TData[]
    columns: ColumnDef<TData>[]
    pagination?: TablePagination
    isLoading?: boolean
    isError?: boolean
    onRetry?: () => void
    getRowId?: (row: TData) => string
    onRowClick?: (row: TData) => void
    enableSelection?: boolean
    bulkActions?: (rows: TData[]) => BulkAction[]
    /** Left slot above the table (search input, filters, ...) */
    toolbar?: ReactNode
    emptyState?: ReactNode
    enableColumnVisibility?: boolean
    initialSorting?: SortingState
    className?: string
}

export function ResourceTable<TData>({
    data,
    columns,
    pagination,
    isLoading = false,
    isError = false,
    onRetry,
    getRowId,
    onRowClick,
    enableSelection = false,
    bulkActions,
    toolbar,
    emptyState,
    enableColumnVisibility = false,
    initialSorting = [],
    className,
}: Readonly<ResourceTableProps<TData>>) {
    const { t } = useTranslation()
    const [sorting, setSorting] = useState<SortingState>(initialSorting)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

    const allColumns = useMemo<ColumnDef<TData>[]>(() => {
        if (!enableSelection) return columns
        const selectColumn: ColumnDef<TData> = {
            id: "__select",
            enableSorting: false,
            enableHiding: false,
            meta: { interactive: true },
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllRowsSelected() ||
                        (table.getIsSomeRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(checked) => {
                        table.toggleAllRowsSelected(!!checked)
                    }}
                    aria-label={t("console.table.selectAll")}
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(checked) => {
                        row.toggleSelected(!!checked)
                    }}
                    aria-label={t("console.table.selectRow")}
                />
            ),
        }
        return [selectColumn, ...columns]
    }, [columns, enableSelection, t])

    // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is compiler-incompatible by design
    const table = useReactTable({
        data,
        columns: allColumns,
        state: { sorting, rowSelection, columnVisibility },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: enableSelection,
        ...(getRowId ? { getRowId } : {}),
    })

    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
    const visibleColumnCount = table.getVisibleLeafColumns().length

    const renderBody = (): ReactNode => {
        if (isLoading) {
            // Vary bar widths and wave the pulse downward so it reads as one
            // organism instead of a flat grid of identical bars
            const skeletonWidths = ["max-w-28", "max-w-16", "max-w-24", "max-w-32", "max-w-20"]
            return (
                <>
                    {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((key, rowIndex) => (
                        <TableRow key={key} className="hover:bg-transparent">
                            {table.getVisibleLeafColumns().map((column, columnIndex) => (
                                <TableCell
                                    key={column.id}
                                    className={cn(
                                        "py-2.5",
                                        responsiveClass(getMeta(column.columnDef)?.responsive)
                                    )}
                                >
                                    <Skeleton
                                        className={cn(
                                            "h-5 w-full",
                                            skeletonWidths[
                                                (rowIndex + columnIndex) % skeletonWidths.length
                                            ]
                                        )}
                                        style={{ animationDelay: `${String(rowIndex * 120)}ms` }}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </>
            )
        }

        if (isError) {
            return (
                <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumnCount} className="py-12 text-center">
                        <div className="animate-content-enter">
                            <p className="text-sm text-muted-foreground mb-3">
                                {t("console.table.error")}
                            </p>
                            {onRetry && (
                                <Button size="sm" variant="outline" onClick={onRetry}>
                                    <RotateCw className="size-3.5" />
                                    {t("console.table.retry")}
                                </Button>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )
        }

        if (table.getRowModel().rows.length === 0) {
            return (
                <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumnCount} className="p-0">
                        <div className="animate-content-enter">
                            {emptyState ?? (
                                <p className="py-12 text-center text-sm text-muted-foreground">
                                    {t("console.table.noResults")}
                                </p>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )
        }

        return (
            <>
                {table.getRowModel().rows.map((row, index) => (
                    <DataRow key={row.id} row={row} index={index} onRowClick={onRowClick} />
                ))}
            </>
        )
    }

    return (
        <div className={className}>
            {(toolbar ?? enableColumnVisibility) && (
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex-1 flex items-center gap-2">{toolbar}</div>
                    {enableColumnVisibility && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-muted-foreground"
                                >
                                    <Settings2 className="size-3.5" />
                                    {t("console.table.columns")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-48 p-2">
                                <div className="flex flex-col gap-1">
                                    {table
                                        .getAllLeafColumns()
                                        .filter((column) => column.getCanHide())
                                        .map((column) => (
                                            <label
                                                key={column.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={column.getIsVisible()}
                                                    onCheckedChange={(checked) => {
                                                        column.toggleVisibility(!!checked)
                                                    }}
                                                />
                                                <span className="capitalize">{column.id}</span>
                                            </label>
                                        ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            )}

            <div className="glass-1 overflow-hidden">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <HeaderCell key={header.id} header={header} />
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="[&_td]:px-3">{renderBody()}</TableBody>
                </Table>
            </div>

            {pagination && !isError && (
                <TablePaginationBar pagination={pagination} isLoading={isLoading} />
            )}

            {enableSelection && bulkActions && (
                <BulkActionsBar
                    count={selectedRows.length}
                    actions={bulkActions(selectedRows)}
                    onClear={() => {
                        table.resetRowSelection()
                    }}
                />
            )}
        </div>
    )
}
