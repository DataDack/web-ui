import { css, cx } from "@emotion/css"
import { ChevronLeft } from "lucide-react"

import { mix } from "../lib/styles"
import { ScrollArea } from "./scroll-area"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const wrap = css`
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
`

const header = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--muted-foreground);
`

const headerLeft = css`
  display: flex;
  align-items: center;
  gap: 4px;
`

const backButton = css`
  margin-left: -4px;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  color: var(--primary);
  outline: none;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: var(--accent);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  & svg {
    width: 16px;
    height: 16px;
  }
`

const columns = css`
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 8px;
  padding: 0 16px 16px;
`

const column = css`
  height: 14rem;
`

const yearColumn = css`
  height: 14rem;
  border-left: 1px solid var(--border);
  padding-left: 8px;
`

const monthList = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 12px;
`

const yearGrid = css`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding-right: 12px;
`

// Shared by both columns; `selected` repeats hover so the selected background is
// darkened rather than replaced when the pointer is over it.
const cellBase = css`
  border-radius: 0.375rem;
  font-size: 14px;
  line-height: 20px;
  outline: none;
  transition:
    color 150ms cubic-bezier(0.4, 0, 0.2, 1),
    background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:hover {
    background: var(--accent);
    color: var(--accent-foreground);
  }
`

const monthCell = css`
  padding: 8px 12px;
  text-align: left;
`

const yearCell = css`
  padding: 8px;
  text-align: center;
`

const cellSelected = css`
  background: var(--primary);
  font-weight: 500;
  color: var(--primary-foreground);

  &:hover {
    background: ${mix("--primary", 90)};
    color: var(--primary-foreground);
  }
`

/**
 * Split month + year selector: a scrollable month column beside a scrollable
 * year grid. Both halves are controlled independently.
 */
export function MonthYearPicker({
  month,
  year,
  onMonthChange,
  onYearChange,
  onBack,
  fromYear = 1900,
  toYear = new Date().getFullYear(),
  className,
}: Readonly<{
  /** Selected month index (0–11), or undefined for none. */
  month?: number
  /** Selected full year, or undefined for none. */
  year?: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  /** Optional back action — renders the header chevron when provided. */
  onBack?: () => void
  fromYear?: number
  toYear?: number
  className?: string
}>) {
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)

  return (
    <div className={cx(wrap, className)}>
      <div className={header}>
        <div className={headerLeft}>
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Back" className={backButton}>
              <ChevronLeft />
            </button>
          ) : null}
          <span>Month</span>
        </div>
        <span>Year</span>
      </div>
      <div className={columns}>
        <ScrollArea className={column}>
          <div className={monthList}>
            {MONTHS.map((name, index) => {
              const selected = month === index
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onMonthChange(index)
                  }}
                  className={cx(cellBase, monthCell, selected && cellSelected)}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </ScrollArea>
        <ScrollArea className={yearColumn}>
          <div className={yearGrid}>
            {years.map((value) => {
              const selected = year === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onYearChange(value)
                  }}
                  className={cx(cellBase, yearCell, selected && cellSelected)}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export { MONTHS }
