import { cn } from "@datadack/common-ui"
import { Check } from "lucide-react"

import type { SmartSelectRowProps } from "./smart-select.types"

/**
 * One row on the shared grid: leading slot, a primary line with an optional
 * muted second line, a trailing slot, then the check mark.
 *
 * A disabled row states its reason inline rather than relying on a tooltip —
 * an option you cannot pick and cannot find out why is worse than one that is
 * simply absent.
 */
export function SmartSelectRow({
  leading,
  primary,
  secondary,
  trailing,
  selected = false,
  disabledReason,
  className,
}: Readonly<SmartSelectRowProps>) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", className)}>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-foreground">{primary}</span>
        {secondary && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {secondary}
          </span>
        )}
        {disabledReason && (
          <span className="mt-0.5 block truncate text-[11px] text-status-warning">
            {disabledReason}
          </span>
        )}
      </span>

      {trailing && <span className="flex shrink-0 items-center gap-1.5">{trailing}</span>}
      <Check className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
    </div>
  )
}
