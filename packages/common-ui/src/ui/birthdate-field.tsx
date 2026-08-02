import { useState } from "react"

import { Cake } from "lucide-react"

import { css, cx } from "@emotion/css"

import { media, mix } from "../lib/styles"
import { DayGridPicker } from "./day-grid-picker"
import { MONTHS, MonthYearPicker } from "./month-year-picker"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const trigger = css`
  display: flex;
  height: 36px;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background: transparent;
  padding: 4px 12px;
  font-size: 16px;
  line-height: 24px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  outline: none;

  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &[data-invalid="true"] {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px ${mix("--destructive", 20)};
  }

  ${media.md} {
    font-size: 14px;
    line-height: 20px;
  }

  .dark & {
    background: ${mix("--input", 30)};
  }

  .dark &[data-invalid="true"] {
    box-shadow: 0 0 0 3px ${mix("--destructive", 40)};
  }
`

const valueRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
`

const cakeIcon = css`
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
`

/* The pickers sit inside the popover, so they drop their own frame. */
const framelessPicker = css`
  border: 0;
  box-shadow: none;
`

const footerButton = css`
  width: 100%;
  border-top: 1px solid var(--border);
  border-bottom-left-radius: 0.375rem;
  border-bottom-right-radius: 0.375rem;
  padding: 8px 16px;
  text-align: center;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  color: var(--muted-foreground);
  outline: none;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }
`

const popoverBody = css`
  width: auto;
  padding: 0;
`

const muted = css`
  color: var(--muted-foreground);
`

const placeholderText = css`
  color: ${mix("--muted-foreground", 50)};
`

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
          className={cx(trigger, className)}
        >
          <span className={valueRow}>
            <Segment empty={!parts}>{parts ? String(parts.day).padStart(2, "0") : "DD"}</Segment>
            <Divider />
            <Segment empty={!parts}>{parts ? MONTHS[parts.month] : "Mon"}</Segment>
            <Divider />
            <Segment empty={!parts}>{parts ? parts.year : "YYYY"}</Segment>
          </span>
          <Cake className={cakeIcon} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={popoverBody} align="start">
        {view === "monthYear" ? (
          <MonthYearPicker
            className={framelessPicker}
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
            className={framelessPicker}
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
            className={footerButton}
          >
            Change month &amp; year
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function Segment({ children, empty }: Readonly<{ children: React.ReactNode; empty?: boolean }>) {
  return <span className={cx("font-medium", empty && muted)}>{children}</span>
}

function Divider() {
  return <span className={placeholderText}>/</span>
}
