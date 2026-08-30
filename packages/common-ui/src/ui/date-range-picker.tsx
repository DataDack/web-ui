import type * as React from "react"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { css, cx } from "../lib/emotion"

export interface DateRange {
  /** Inclusive start, as `YYYY-MM-DD`. Empty string when nothing is selected. */
  from: string
  /** Inclusive end, as `YYYY-MM-DD`. Equal to `from` for a single-day range. */
  to: string
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange: (value: DateRange) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const trigger = css`
  justify-content: flex-start;
  text-align: left;
  font-weight: 400;
`

/** No selection yet — the placeholder reads as a prompt, not as a value. */
const empty = css`
  color: var(--muted-foreground);
`

const icon = css`
  margin-right: 8px;
  width: 16px;
  height: 16px;
`

const popover = css`
  width: auto;
  padding: 0;
`

/**
 * The picker speaks `YYYY-MM-DD` strings, not Date objects.
 *
 * That is deliberate: the value goes straight into query parameters and API
 * filters, and a Date would drag the browser's timezone into a range the user
 * picked off a calendar — selecting the 1st in UTC+5:30 and sending the 30th.
 * Formatting from the local Y/M/D fields keeps the day the user clicked.
 */
function toDateString(day: Date) {
  const year = day.getFullYear()
  const month = String(day.getMonth() + 1).padStart(2, "0")
  const date = String(day.getDate()).padStart(2, "0")
  return `${String(year)}-${month}-${date}`
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled,
  ...props
}: DateRangePickerProps & Omit<React.ComponentProps<typeof Button>, "value" | "onChange">) {
  const from = value?.from ? new Date(value.from) : undefined
  const to = value?.to ? new Date(value.to) : undefined
  const selected = from ? { from, to: to ?? from } : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-slot="date-range-picker"
          variant="outline"
          disabled={disabled}
          className={cx(trigger, !from && empty, className)}
          {...props}
        >
          <CalendarIcon className={icon} />
          {from ? (
            // A range whose ends are the same day reads as one date, not as
            // "Jan 05 - Jan 05".
            to && to.getTime() !== from.getTime() ? (
              <span>
                {format(from, "MMM dd")} - {format(to, "MMM dd")}
              </span>
            ) : (
              <span>{format(from, "PPP")}</span>
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={popover} align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            if (range?.from) {
              onChange({
                from: toDateString(range.from),
                // Mid-drag the user has only picked a start. Mirroring it into
                // `to` keeps the value a valid range at every moment rather
                // than emitting a half-open one downstream.
                to: toDateString(range.to ?? range.from),
              })
            } else {
              onChange({ from: "", to: "" })
            }
          }}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker }
