import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type RowAction,
} from "@datadack/common-ui"
import { MoreHorizontal } from "lucide-react"

/**
 * The table's ellipsis menu, for rows that are not in a table.
 *
 * Same `RowAction` shape as `actionsColumn` so a row's actions read identically
 * here and in every admin DataTable — destructive entries last, behind a rule.
 */
export function RowActionsMenu<T>({
  row,
  actions,
  ariaLabel,
}: Readonly<{ row: T; actions: RowAction<T>[]; ariaLabel: string }>) {
  if (actions.length === 0) return null
  const normal = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  const item = (action: RowAction<T>) => {
    const Icon = action.icon
    return (
      <DropdownMenuItem
        key={action.label}
        variant={action.destructive ? "destructive" : "default"}
        onClick={() => {
          action.onAction(row)
        }}
      >
        {Icon && <Icon className="size-3.5" />}
        {action.label}
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={ariaLabel}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {normal.map(item)}
        {destructive.length > 0 && normal.length > 0 && <DropdownMenuSeparator />}
        {destructive.map(item)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
