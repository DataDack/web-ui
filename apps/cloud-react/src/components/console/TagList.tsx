import { cn } from "@/lib/utils"

interface TagListProps {
  tags: Record<string, string>
  max?: number
  className?: string
  /**
   * Keep all chips on a single line and truncate long values per chip. Use in
   * dense contexts like table cells, where wrapping (uneven row height) or a
   * long value (e.g. a UUID) would otherwise blow the column out of shape.
   */
  truncate?: boolean
}

export function TagList({ tags, max, className, truncate }: Readonly<TagListProps>) {
  const entries = Object.entries(tags)
  if (entries.length === 0) return <span className="text-muted-foreground text-sm">—</span>

  const visible = max ? entries.slice(0, max) : entries
  const hidden = entries.length - visible.length

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        truncate ? "overflow-hidden" : "flex-wrap",
        className,
      )}
    >
      {visible.map(([key, value]) => (
        <span
          key={key}
          className={cn(
            "font-mono text-[11px] px-1.5 py-0.5 rounded border border-border-glass bg-muted/50 text-muted-foreground",
            truncate
              ? "inline-block max-w-[150px] truncate align-middle"
              : "inline-flex items-center",
          )}
        >
          {key}
          {value && <span className="opacity-60">={value}</span>}
        </span>
      ))}
      {hidden > 0 && (
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">+{hidden}</span>
      )}
    </div>
  )
}
