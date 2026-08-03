import { type KeyboardEvent, useRef } from "react"

import { cn } from "@datadack/common-ui"
import type { LucideIcon } from "lucide-react"

export interface SegmentedOption<T extends string> {
  value: T
  /** Always the accessible name, and the visible one when `showLabels`. */
  label: string
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  /** Names the group as a whole, e.g. "View layout". */
  ariaLabel: string
  /** Icon-only when false; the label still reaches assistive tech. */
  showLabels?: boolean
  className?: string
}

/**
 * A radio group that looks like a switch — for choosing between mutually
 * exclusive views of the same data.
 *
 * Radio semantics, not `aria-pressed` buttons: these options are one choice with
 * several answers, not several independent toggles, and the difference is
 * audible. That commits us to the radio keyboard contract, which two toggle
 * buttons would not have provided: one Tab stop for the whole group, arrows to
 * move between options, and selection following focus.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  showLabels = false,
  className,
}: Readonly<SegmentedControlProps<T>>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        move(index, 1)
        break
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        move(index, -1)
        break
      case "Home":
        event.preventDefault()
        move(0, 0)
        break
      case "End":
        event.preventDefault()
        move(options.length - 1, 0)
        break
      default:
        break
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border/60 bg-muted/40 p-0.5",
        className,
      )}
    >
      {options.map((option, index) => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={showLabels ? undefined : option.label}
            // One Tab stop for the group: only the selected option is
            // reachable by Tab, the arrows do the rest.
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(option.value)
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index)
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[12px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {showLabels && option.label}
          </button>
        )
      })}
    </div>
  )
}
