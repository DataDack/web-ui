import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, type LucideIcon } from "lucide-react"

import { CopyButton } from "./CopyButton"
import type { DataTableColumnMeta } from "./DataTable"
import { StatusBadge } from "./StatusBadge"
import { TagList } from "./TagList"
import { css } from "../lib/emotion"
import { fontMono } from "../lib/styles"
import { parseTags } from "../lib/tags"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

// The column shapes every console list repeats: a mono name, a status badge, a
// date, a copyable identifier, tag chips, a row menu. Built as factories rather
// than components so they compose into a `columns` array for DataTable.
//
// Headers are plain strings, and every label is a prop — call these inside a
// useMemo with `t()` if the consuming app translates. The design system stays
// free of any i18n dependency.

const name = css`
  font-family: ${fontMono};
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground);
`

const dash = css`
  color: var(--muted-foreground);
`

const textMono = css`
  font-family: ${fontMono};
  font-size: 13px;
`

const textPlain = css`
  font-size: 14px;
  line-height: 20px;
`

const muted = css`
  color: var(--muted-foreground);
`

const strong = css`
  color: var(--foreground);
`

const date = css`
  font-family: ${fontMono};
  font-size: 12px;
  color: var(--muted-foreground);
  white-space: nowrap;
`

const actionsCell = css`
  display: flex;
  justify-content: flex-end;
`

const actionsTrigger = css`
  width: 28px;
  height: 28px;
  color: var(--muted-foreground);
`

const actionsMenu = css`
  width: 11rem;
`

const actionIcon = css`
  width: 14px;
  height: 14px;
`

interface BaseColumnOptions {
  header: string
  /** Hide the column below this breakpoint. */
  responsive?: NonNullable<DataTableColumnMeta["responsive"]>
}

export function nameColumn<TData>(
  options: BaseColumnOptions & { accessor: (row: TData) => string },
): ColumnDef<TData> {
  return {
    id: "name",
    accessorFn: (row) => options.accessor(row),
    header: () => options.header,
    meta: { responsive: options.responsive } satisfies DataTableColumnMeta,
    cell: ({ row }) => <span className={name}>{options.accessor(row.original)}</span>,
  }
}

export function statusColumn<TData>(
  options: BaseColumnOptions & {
    accessor: (row: TData) => string
    pulse?: (row: TData) => boolean
  },
): ColumnDef<TData> {
  return {
    id: "status",
    accessorFn: (row) => options.accessor(row),
    header: () => options.header,
    meta: { responsive: options.responsive } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <StatusBadge status={options.accessor(row.original)} pulse={options.pulse?.(row.original)} />
    ),
  }
}

export function textColumn<TData>(
  options: BaseColumnOptions & {
    id: string
    accessor: (row: TData) => string | number | null | undefined
    mono?: boolean
    muted?: boolean
  },
): ColumnDef<TData> {
  return {
    id: options.id,
    accessorFn: (row) => options.accessor(row) ?? "",
    header: () => options.header,
    meta: { responsive: options.responsive } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const value = options.accessor(row.original)
      if (value === null || value === undefined || value === "") {
        return <span className={dash}>—</span>
      }
      return (
        <span
          className={`${options.mono ? textMono : textPlain} ${options.muted ? muted : strong}`}
        >
          {value}
        </span>
      )
    },
  }
}

export function dateColumn<TData>(
  options: BaseColumnOptions & { id?: string; accessor: (row: TData) => string },
): ColumnDef<TData> {
  return {
    id: options.id ?? "created",
    accessorFn: (row) => options.accessor(row),
    header: () => options.header,
    meta: { responsive: options.responsive } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const parsed = new Date(options.accessor(row.original))
      return (
        <span className={date}>
          {Number.isNaN(parsed.getTime())
            ? "—"
            : parsed.toLocaleDateString(undefined, {
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
  options: BaseColumnOptions & {
    id: string
    accessor: (row: TData) => string
    /** Toast text on copy; passed through to CopyButton. */
    copiedLabel?: string
  },
): ColumnDef<TData> {
  return {
    id: options.id,
    accessorFn: (row) => options.accessor(row),
    header: () => options.header,
    enableSorting: false,
    // interactive: the copy button lives here, and clicking it must not also
    // trigger the row's own click handler.
    meta: { responsive: options.responsive, interactive: true } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const value = options.accessor(row.original)
      if (!value) return <span className={dash}>—</span>
      return <CopyButton value={value} copiedLabel={options.copiedLabel} />
    },
  }
}

/** Renders the backend's tag map — object or legacy JSON string — as chips. */
export function tagsColumn<TData>(
  options: BaseColumnOptions & { accessor: (row: TData) => string },
): ColumnDef<TData> {
  return {
    id: "tags",
    enableSorting: false,
    header: () => options.header,
    // Tags are the first thing worth dropping on a narrow screen.
    meta: { responsive: options.responsive ?? "xl" } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <TagList tags={parseTags(options.accessor(row.original))} max={2} truncate />
    ),
  }
}

export interface RowAction<TData> {
  label: string
  icon?: LucideIcon
  /** Grouped below a separator and rendered in the destructive tone. */
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
    meta: { interactive: true } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const actions = options.actions(row.original)
      const destructive = actions.filter((action) => action.destructive)
      const normal = actions.filter((action) => !action.destructive)

      const item = (action: RowAction<TData>) => {
        const Icon = action.icon
        return (
          <DropdownMenuItem
            key={action.label}
            variant={action.destructive ? "destructive" : "default"}
            onClick={() => {
              action.onAction(row.original)
            }}
          >
            {Icon && <Icon className={actionIcon} />}
            {action.label}
          </DropdownMenuItem>
        )
      }

      return (
        <div className={actionsCell}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={actionsTrigger}
                aria-label={options.ariaLabel}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={actionsMenu}>
              {normal.map(item)}
              {destructive.length > 0 && normal.length > 0 && <DropdownMenuSeparator />}
              {destructive.map(item)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  }
}
