import { AlertTriangle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CommandGroup, CommandItem, CommandList } from "@/components/ui/command"

import { Skeleton } from "@datadack/common-ui"

import type { SmartSelectOption, SmartSelectProps } from "./smart-select.types"
import { SmartSelectRow } from "./SmartSelectRow"

const SKELETON_KEYS = ["s1", "s2", "s3", "s4"] as const

interface SmartSelectListProps<TItem> {
  options: readonly SmartSelectOption<TItem>[]
  /** Everything loaded, before filtering — tells empty from no-match apart. */
  totalCount: number
  query: string
  value: string | undefined
  onPick: (option: SmartSelectOption<TItem>) => void
  renderRow: SmartSelectProps<TItem>["renderRow"]
  loading: boolean
  /** A background fetch is in flight — only the "Load more" control reacts. */
  fetching: boolean
  error: boolean
  onRefresh?: () => void
  hasMore: boolean
  onLoadMore?: () => void
  truncatedNote?: React.ReactNode
  emptyText?: React.ReactNode
  noMatchText?: (query: string) => React.ReactNode
  errorText?: React.ReactNode
  groupOrder?: readonly string[]
}

/** Stable section order: explicit `groupOrder` first, then first-seen order. */
function groupsOf<TItem>(
  options: readonly SmartSelectOption<TItem>[],
  groupOrder?: readonly string[],
): { name: string; options: SmartSelectOption<TItem>[] }[] {
  const buckets = new Map<string, SmartSelectOption<TItem>[]>()
  for (const option of options) {
    const key = option.group ?? ""
    const existing = buckets.get(key)
    if (existing) existing.push(option)
    else buckets.set(key, [option])
  }
  const names = [...buckets.keys()]
  if (groupOrder) {
    names.sort((a, b) => {
      const ai = groupOrder.indexOf(a)
      const bi = groupOrder.indexOf(b)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }
  return names.map((name) => ({ name, options: buckets.get(name) ?? [] }))
}

/**
 * The body of the picker: grouped rows, or exactly one of the four states a
 * remote list can be in.
 *
 * Empty and no-match are deliberately distinct. "No repositories are visible to
 * this installation" and "nothing matches `foo`" send the user to completely
 * different places, and collapsing them into one "No results" is how a picker
 * ends up feeling broken.
 */
export function SmartSelectList<TItem>({
  options,
  totalCount,
  query,
  value,
  onPick,
  renderRow,
  loading,
  fetching,
  error,
  onRefresh,
  hasMore,
  onLoadMore,
  truncatedNote,
  emptyText,
  noMatchText,
  errorText,
  groupOrder,
}: Readonly<SmartSelectListProps<TItem>>) {
  if (loading) {
    return (
      <div className="space-y-1 p-2" aria-busy>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <AlertTriangle className="size-5 text-status-danger" />
        <p className="text-[13px] text-muted-foreground">
          {errorText ?? "Could not load these options."}
        </p>
        {onRefresh && (
          <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (options.length === 0) {
    const nothingLoaded = totalCount === 0
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[13px] text-muted-foreground">
          {nothingLoaded
            ? (emptyText ?? "Nothing to choose from yet.")
            : (noMatchText?.(query) ?? `Nothing matches “${query}”.`)}
        </p>
        {!nothingLoaded && truncatedNote && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/80">{truncatedNote}</p>
        )}
      </div>
    )
  }

  const sections = groupsOf(options, groupOrder)

  return (
    <CommandList className="max-h-72">
      {sections.map((section) => (
        <CommandGroup key={section.name || "ungrouped"} heading={section.name || undefined}>
          {section.options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              onSelect={() => {
                if (!option.disabled) onPick(option)
              }}
              className="items-start"
            >
              <SmartSelectRow
                {...renderRow(option)}
                selected={option.value === value}
                disabledReason={option.disabledReason}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      ))}

      {truncatedNote && (
        <p className="px-3 py-2 text-[11px] text-muted-foreground/80">{truncatedNote}</p>
      )}

      {hasMore && onLoadMore && (
        <div className="p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-[12px]"
            disabled={fetching}
            onClick={onLoadMore}
          >
            {fetching && <Loader2 className="size-3.5 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </CommandList>
  )
}
