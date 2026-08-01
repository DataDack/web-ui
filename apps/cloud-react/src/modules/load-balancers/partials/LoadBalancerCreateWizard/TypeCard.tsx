import type { Layers } from "lucide-react"

import { cn } from "@/lib/utils"

export function TypeCard({
  icon: Icon,
  selected,
  title,
  description,
  onSelect,
}: Readonly<{
  icon: typeof Layers
  selected: boolean
  title: string
  description: string
  onSelect: () => void
}>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "glass-1 rounded-lg border p-3.5 text-left transition-colors",
        selected
          ? "border-status-info/60 ring-1 ring-status-info/30"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", selected ? "text-status-info" : "text-muted-foreground")} />
        <span className="text-[13px] font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
    </button>
  )
}
