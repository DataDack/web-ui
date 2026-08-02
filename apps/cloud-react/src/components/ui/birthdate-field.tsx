import { useState } from "react"

import { Cake } from "lucide-react"

import { DayGridPicker, Popover, PopoverContent, PopoverTrigger } from "@datadack/common-ui"
import { MONTHS, MonthYearPicker } from "@/components/ui/month-year-picker"
import { cn } from "@/lib/utils"

/** Parse an ISO `yyyy-mm-dd` string into parts (no timezone shift). */
function parseISO(value?: string) {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return { year: y, month: m - 1, day: d }
}

/** Build an ISO `yyyy-mm-dd` string from parts. */
function toISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${String(year)}-${m}-${d}`
}

/** Days in a given month, accounting for leap years. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * A segmented `DD / Mon / YYYY` birthdate field. The trigger opens a popover
 * where the month/year are chosen first, then the day — composed from
 * {@link MonthYearPicker} and {@link DayGridPicker}.
 *
 * Value is an ISO `yyyy-mm-dd` string, matching the rest of the form stack.
 */
export function BirthdateField({
  value,
  onChange,
  id,
  invalid,
  fromYear = 1900,
  toYear = new Date().getFullYear(),
  className,
}: Readonly<{
  /** ISO `yyyy-mm-dd` string (or empty). */
  value?: string
  onChange: (value: string) => void
  id?: string
  invalid?: boolean
  fromYear?: number
  toYear?: number
  className?: string
}>) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"calendar" | "monthYear">("monthYear")
  const parts = parseISO(value)

  // Draft parts let the user pick month/year before a day exists yet.
  const [draftYear, setDraftYear] = useState<number | undefined>(parts?.year)
  const [draftMonth, setDraftMonth] = useState<number | undefined>(parts?.month)

  const year = parts?.year ?? draftYear
  const month = parts?.month ?? draftMonth

  const commit = (y?: number, m?: number, d?: number) => {
    if (y === undefined || m === undefined || d === undefined) return
    // Clamp the day if the new month is shorter (e.g. 31 → Feb).
    const clamped = Math.min(d, daysInMonth(y, m))
    onChange(toISO(y, m, clamped))
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setView(parts ? "calendar" : "monthYear")
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid ? "true" : undefined}
          data-empty={!parts}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40",
            className,
          )}
        >
          <span className="flex items-center gap-2 tabular-nums">
            <Segment empty={!parts}>{parts ? String(parts.day).padStart(2, "0") : "DD"}</Segment>
            <Divider />
            <Segment empty={!parts}>{parts ? MONTHS[parts.month] : "Mon"}</Segment>
            <Divider />
            <Segment empty={!parts}>{parts ? parts.year : "YYYY"}</Segment>
          </span>
          <Cake className="size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {view === "monthYear" ? (
          <MonthYearPicker
            className="border-0 shadow-none"
            month={month}
            year={year}
            fromYear={fromYear}
            toYear={toYear}
            onMonthChange={(m) => {
              setDraftMonth(m)
              if (year !== undefined && parts?.day !== undefined) commit(year, m, parts.day)
              if (year !== undefined) setView("calendar")
            }}
            onYearChange={(y) => {
              setDraftYear(y)
              if (month !== undefined && parts?.day !== undefined) commit(y, month, parts.day)
              if (month !== undefined) setView("calendar")
            }}
          />
        ) : (
          <DayGridPicker
            className="border-0 shadow-none"
            label={
              month !== undefined && year !== undefined ? `${MONTHS[month]} ${String(year)}` : "Day"
            }
            value={parts?.day}
            daysInMonth={year !== undefined && month !== undefined ? daysInMonth(year, month) : 31}
            onChange={(day) => {
              commit(year, month, day)
              setOpen(false)
            }}
          />
        )}
        {view === "calendar" ? (
          <button
            type="button"
            onClick={() => {
              setView("monthYear")
            }}
            className="w-full rounded-b-md border-t px-4 py-2 text-center text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Change month &amp; year
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function Segment({ children, empty }: Readonly<{ children: React.ReactNode; empty?: boolean }>) {
  return <span className={cn("font-medium", empty && "text-muted-foreground")}>{children}</span>
}

function Divider() {
  return <span className="text-muted-foreground/50">/</span>
}
