import { TONE_CLASSES, TONE_DOT_CLASSES } from "@/components/console/status-config"
import { Button } from "@datadack/common-ui"
import { cn } from "@/lib/utils"

import type { StateChip, StateFilter } from "./project-list"

interface StateFilterChipsProps {
  chips: StateChip[]
  total: number
  value: StateFilter
  onChange: (value: StateFilter) => void
}

/**
 * The account's states, as counts you can click.
 *
 * This is the page's navigation, and it replaces the stat tiles that used to sit
 * here reporting numbers nobody could act on. Labels and tones come straight from
 * PROJECT_STATE_META, so the chip for a state always reads exactly like that
 * state's chip on a card — no second vocabulary to keep in sync.
 *
 * Single-select, because that is what the question actually is ("show me the
 * failed ones"), and because it means the choice fits in one validated query
 * param and can therefore be linked to — the attention banner deep-links straight
 * into a filter. Clicking the active chip, or All, clears it.
 *
 * Only states actually present get a chip: a chip reading "0" is not a filter, it
 * is a dead end.
 */
export function StateFilterChips({
  chips,
  total,
  value,
  onChange,
}: Readonly<StateFilterChipsProps>) {
  // One state, one chip, and it is already selected — the filter would be a
  // no-op control that only ever narrows to what is already on screen.
  if (chips.length < 2) return null

  return (
    <div
      role="group"
      aria-label="Filter by state"
      className="-mx-0.5 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-0.5 py-0.5"
    >
      <Chip
        label="All"
        count={total}
        selected={value === "all"}
        onClick={() => {
          onChange("all")
        }}
      />
      {chips.map((chip) => (
        <Chip
          key={chip.kind}
          label={chip.label}
          count={chip.count}
          selected={value === chip.kind}
          toneClass={TONE_CLASSES[chip.tone]}
          dotClass={TONE_DOT_CLASSES[chip.tone]}
          onClick={() => {
            // Clicking the active chip is how you get back to everything,
            // so the control never becomes a trap.
            onChange(value === chip.kind ? "all" : chip.kind)
          }}
        />
      ))}
    </div>
  )
}

interface ChipProps {
  label: string
  count: number
  selected: boolean
  onClick: () => void
  toneClass?: string
  dotClass?: string
}

function Chip({ label, count, selected, onClick, toneClass, dotClass }: Readonly<ChipProps>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "shrink-0 gap-1.5 border border-transparent text-[11px] font-medium",
        selected
          ? (toneClass ?? "border-border bg-muted text-foreground")
          : "text-muted-foreground",
      )}
    >
      {dotClass && <span className={cn("size-1.5 rounded-full", dotClass)} />}
      {label}
      <span className="font-mono tabular-nums opacity-70">{String(count)}</span>
    </Button>
  )
}
