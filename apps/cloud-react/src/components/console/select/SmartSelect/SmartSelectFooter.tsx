import type { ReactNode } from "react"

import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SmartSelectFooterProps {
  /** Escape hatches — "Adjust GitHub App access", "Create a new one". */
  children?: ReactNode
  onRefresh?: () => void
  fetching?: boolean
}

/**
 * Sticky footer under the list.
 *
 * Every remote picker eventually shows someone a list without the thing they
 * are looking for, and the answer is almost never inside the picker. This is
 * where the way out lives, permanently visible rather than below a scroll.
 */
export function SmartSelectFooter({
  children,
  onRefresh,
  fetching = false,
}: Readonly<SmartSelectFooterProps>) {
  if (!children && !onRefresh) return null

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/95 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1">{children}</div>
      {onRefresh && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2 text-[12px] text-muted-foreground"
          disabled={fetching}
          onClick={onRefresh}
        >
          <RefreshCw className={cn("size-3.5", fetching && "animate-spin")} />
          Refresh
        </Button>
      )}
    </div>
  )
}
