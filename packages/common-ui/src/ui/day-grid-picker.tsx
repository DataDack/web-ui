import { css, cx } from "../lib/emotion"
import { mix } from "../lib/styles"

const wrap = css`
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 16px;
  color: var(--card-foreground);
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
`

const heading = css`
  margin-bottom: 12px;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--muted-foreground);
`

const grid = css`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  justify-items: center;
  row-gap: 4px;
`

const day = css`
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
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

// Selected wins over the hover rule above, so it repeats hover explicitly.
const daySelected = css`
  background: var(--primary);
  font-weight: 500;
  color: var(--primary-foreground);

  &:hover {
    background: ${mix("--primary", 90)};
    color: var(--primary-foreground);
  }
`

/**
 * A standalone day-of-month grid (1–`daysInMonth`) laid out 7 columns wide.
 * Controlled via `value` (the selected day number) / `onChange`.
 */
export function DayGridPicker({
  value,
  onChange,
  daysInMonth = 31,
  label = "Day",
  className,
}: Readonly<{
  /** Currently selected day (1–31), or undefined for none. */
  value?: number
  onChange: (day: number) => void
  /** Number of days to render — clamp to a real month when known. */
  daysInMonth?: number
  label?: string
  className?: string
}>) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className={cx(wrap, className)}>
      {label ? <div className={heading}>{label}</div> : null}
      <div role="group" className={grid} aria-label={label || "Day"}>
        {days.map((d) => {
          const selected = value === d
          return (
            <button
              key={d}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                onChange(d)
              }}
              className={cx(day, selected && daySelected)}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
