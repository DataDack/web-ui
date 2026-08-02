import { useState } from "react"

import { CalendarIcon } from "lucide-react"

import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { css, cx } from "../lib/emotion"

/** Parse an ISO `yyyy-mm-dd` string into a local Date (no timezone shift). */
function parseISO(value?: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Format a Date back into an ISO `yyyy-mm-dd` string. */
function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const DISPLAY = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const trigger = css`
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  font-weight: 400;

  &[data-empty="true"] {
    color: var(--muted-foreground);
  }
`

const icon = css`
  width: 16px;
  height: 16px;
  opacity: 0.6;
`

const content = css`
  width: auto;
  padding: 0;
`

export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  id,
  invalid,
  fromYear = 1900,
  toDate = new Date(),
}: Readonly<{
  /** ISO `yyyy-mm-dd` string (or empty). */
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  invalid?: boolean
  fromYear?: number
  /** Latest selectable date — defaults to today (no future dates). */
  toDate?: Date
}>) {
  const [open, setOpen] = useState(false)
  const selected = parseISO(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          data-empty={!selected}
          className={cx(trigger)}
        >
          <CalendarIcon className={icon} />
          {selected ? DISPLAY.format(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={content} align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={toDate}
          disabled={{ after: toDate }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- popover focus management: the calendar must receive focus when it opens or keyboard users are stranded on the trigger
          autoFocus
          onSelect={(date) => {
            if (date) {
              onChange(toISO(date))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
