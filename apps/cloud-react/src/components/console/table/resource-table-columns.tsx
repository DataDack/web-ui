import type { ColumnDef } from "@tanstack/react-table"
import { type LucideIcon, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parseTags } from "@/lib/tags"

import type { ColumnMeta } from "./ResourceTable"
import { CopyButton } from "../CopyButton"
import { StatusBadge } from "../StatusBadge"
import { TagList } from "../TagList"

// Column factories for ResourceTable. Headers are plain strings — call these
// inside a useMemo with t() so labels are translated at render time.

interface BaseColumnOptions {
    header: string
    responsive?: ColumnMeta["responsive"]
}

export function nameColumn<TData>(
    options: BaseColumnOptions & { accessor: (row: TData) => string }
): ColumnDef<TData> {
    return {
        id: "name",
        accessorFn: (row) => options.accessor(row),
        header: () => options.header,
        meta: { responsive: options.responsive } satisfies ColumnMeta,
        cell: ({ row }) => (
            <span className="font-mono text-[13px] font-medium text-foreground">
                {options.accessor(row.original)}
            </span>
        ),
    }
}

export function statusColumn<TData>(
    options: BaseColumnOptions & { accessor: (row: TData) => string; pulse?: (row: TData) => boolean }
): ColumnDef<TData> {
    return {
        id: "status",
        accessorFn: (row) => options.accessor(row),
        header: () => options.header,
        meta: { responsive: options.responsive } satisfies ColumnMeta,
        cell: ({ row }) => (
            <StatusBadge
                status={options.accessor(row.original)}
                pulse={options.pulse?.(row.original)}
            />
        ),
    }
}

export function textColumn<TData>(
    options: BaseColumnOptions & {
        id: string
        accessor: (row: TData) => string | number | null | undefined
        mono?: boolean
        muted?: boolean
    }
): ColumnDef<TData> {
    return {
        id: options.id,
        accessorFn: (row) => options.accessor(row) ?? "",
        header: () => options.header,
        meta: { responsive: options.responsive } satisfies ColumnMeta,
        cell: ({ row }) => {
            const value = options.accessor(row.original)
            if (value === null || value === undefined || value === "") {
                return <span className="text-muted-foreground">—</span>
            }
            return (
                <span
                    className={
                        (options.mono ? "font-mono text-[13px] " : "text-sm ") +
                        (options.muted ? "text-muted-foreground" : "text-foreground")
                    }
                >
                    {value}
                </span>
            )
        },
    }
}

export function dateColumn<TData>(
    options: BaseColumnOptions & { id?: string; accessor: (row: TData) => string }
): ColumnDef<TData> {
    return {
        id: options.id ?? "created",
        accessorFn: (row) => options.accessor(row),
        header: () => options.header,
        meta: { responsive: options.responsive } satisfies ColumnMeta,
        cell: ({ row }) => {
            const raw = options.accessor(row.original)
            const date = new Date(raw)
            return (
                <span className="font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                    {Number.isNaN(date.getTime())
                        ? "—"
                        : date.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                          })}
                </span>
            )
        },
    }
}

export function copyColumn<TData>(
    options: BaseColumnOptions & { id: string; accessor: (row: TData) => string }
): ColumnDef<TData> {
    return {
        id: options.id,
        accessorFn: (row) => options.accessor(row),
        header: () => options.header,
        enableSorting: false,
        meta: { responsive: options.responsive, interactive: true } satisfies ColumnMeta,
        cell: ({ row }) => {
            const value = options.accessor(row.original)
            if (!value) return <span className="text-muted-foreground">—</span>
            return <CopyButton value={value} />
        },
    }
}

/** Renders the backend JSONB tag string as chips */
export function tagsColumn<TData>(
    options: BaseColumnOptions & { accessor: (row: TData) => string }
): ColumnDef<TData> {
    return {
        id: "tags",
        enableSorting: false,
        header: () => options.header,
        meta: { responsive: options.responsive ?? "xl" } satisfies ColumnMeta,
        cell: ({ row }) => (
            <TagList tags={parseTags(options.accessor(row.original))} max={2} truncate />
        ),
    }
}

export interface RowAction<TData> {
    label: string
    icon?: LucideIcon
    destructive?: boolean
    onAction: (row: TData) => void
}

export function actionsColumn<TData>(options: {
    actions: (row: TData) => RowAction<TData>[]
    ariaLabel: string
}): ColumnDef<TData> {
    return {
        id: "__actions",
        enableSorting: false,
        enableHiding: false,
        header: () => null,
        meta: { interactive: true } satisfies ColumnMeta,
        cell: ({ row }) => {
            const actions = options.actions(row.original)
            const destructiveActions = actions.filter((a) => a.destructive)
            const normalActions = actions.filter((a) => !a.destructive)
            return (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground"
                                aria-label={options.ariaLabel}
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {normalActions.map((action) => {
                                const Icon = action.icon
                                return (
                                    <DropdownMenuItem
                                        key={action.label}
                                        onClick={() => { action.onAction(row.original); }}
                                    >
                                        {Icon && <Icon className="size-3.5" />}
                                        {action.label}
                                    </DropdownMenuItem>
                                )
                            })}
                            {destructiveActions.length > 0 && normalActions.length > 0 && (
                                <DropdownMenuSeparator />
                            )}
                            {destructiveActions.map((action) => {
                                const Icon = action.icon
                                return (
                                    <DropdownMenuItem
                                        key={action.label}
                                        variant="destructive"
                                        onClick={() => { action.onAction(row.original); }}
                                    >
                                        {Icon && <Icon className="size-3.5" />}
                                        {action.label}
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    }
}
