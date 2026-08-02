import type * as React from "react"

import { css, cx } from "../lib/emotion"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { media, mix } from "../lib/styles"
import { buttonVariants } from "./button"

// react-day-picker styles through a classNames map keyed by part name, merged
// over getDefaultClassNames() so its own layout rules survive. Each part below is
// the emotion equivalent of what the Tailwind version passed for that key.
const parts = {
  wrapper: css`
    padding: 12px;
  `,
  root: css`
    width: fit-content;
  `,
  months: css`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 16px;

    ${media.sm} {
      flex-direction: row;
    }
  `,
  month: css`
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 16px;
  `,
  nav: css`
    position: absolute;
    inset-inline: 0;
    top: 0;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
  `,
  navButton: css`
    width: 28px;
    height: 28px;
    padding: 0;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  `,
  monthCaption: css`
    display: flex;
    height: 28px;
    align-items: center;
    justify-content: center;
    padding-left: 32px;
    padding-right: 32px;
  `,
  captionLabel: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;

    & > svg {
      width: 14px;
      height: 14px;
      color: var(--muted-foreground);
    }
  `,
  dropdowns: css`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
  `,
  dropdownRoot: css`
    position: relative;
    border-radius: 0.375rem;
    border: 1px solid var(--input);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);

    &:has(:focus) {
      border-color: var(--ring);
      box-shadow: 0 0 0 3px ${mix("--ring", 50)};
    }
  `,
  /* The real <select> sits invisible over the label so it stays operable. */
  dropdown: css`
    position: absolute;
    inset: 0;
    background: var(--popover);
    opacity: 0;
  `,
  monthGrid: css`
    width: 100%;
    border-collapse: collapse;
  `,
  weekdays: css`
    display: flex;
  `,
  weekday: css`
    width: 36px;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted-foreground);
  `,
  week: css`
    margin-top: 8px;
    display: flex;
    width: 100%;
  `,
  day: css`
    position: relative;
    width: 36px;
    height: 36px;
    padding: 0;
    text-align: center;
    font-size: 14px;
    line-height: 20px;

    &:focus-within {
      position: relative;
      z-index: 20;
    }

    &:has([aria-selected]) {
      border-radius: 0.375rem;
      background: var(--accent);
    }
  `,
  dayButton: css`
    width: 36px;
    height: 36px;
    padding: 0;
    font-weight: 400;

    &[aria-selected="true"] {
      opacity: 1;
    }
  `,
  selected: css`
    border-radius: 0.375rem;
    background: var(--primary);
    color: var(--primary-foreground);

    &:hover,
    &:focus {
      background: var(--primary);
      color: var(--primary-foreground);
    }
  `,
  today: css`
    border-radius: 0.375rem;
    background: var(--accent);
    color: var(--accent-foreground);
  `,
  outside: css`
    color: var(--muted-foreground);

    &[aria-selected="true"] {
      color: var(--muted-foreground);
    }
  `,
  disabled: css`
    color: var(--muted-foreground);
    opacity: 0.5;
  `,
  hidden: css`
    visibility: hidden;
  `,
  chevron: css`
    width: 16px;
    height: 16px;
  `,
} as const

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()
  const ghost = buttonVariants({ variant: "ghost" })

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cx(parts.wrapper, className)}
      classNames={{
        root: cx(parts.root, defaultClassNames.root),
        months: cx(parts.months, defaultClassNames.months),
        month: cx(parts.month, defaultClassNames.month),
        nav: cx(parts.nav, defaultClassNames.nav),
        button_previous: cx(ghost, parts.navButton, defaultClassNames.button_previous),
        button_next: cx(ghost, parts.navButton, defaultClassNames.button_next),
        month_caption: cx(parts.monthCaption, defaultClassNames.month_caption),
        caption_label: cx(parts.captionLabel, defaultClassNames.caption_label),
        dropdowns: cx(parts.dropdowns, defaultClassNames.dropdowns),
        dropdown_root: cx(parts.dropdownRoot, defaultClassNames.dropdown_root),
        dropdown: cx(parts.dropdown, defaultClassNames.dropdown),
        month_grid: cx(parts.monthGrid, defaultClassNames.month_grid),
        weekdays: cx(parts.weekdays, defaultClassNames.weekdays),
        weekday: cx(parts.weekday, defaultClassNames.weekday),
        week: cx(parts.week, defaultClassNames.week),
        day: cx(parts.day, defaultClassNames.day),
        day_button: cx(ghost, parts.dayButton, defaultClassNames.day_button),
        selected: cx(parts.selected, defaultClassNames.selected),
        today: cx(parts.today, defaultClassNames.today),
        outside: cx(parts.outside, defaultClassNames.outside),
        disabled: cx(parts.disabled, defaultClassNames.disabled),
        hidden: cx(parts.hidden, defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        // eslint-disable-next-line react/prop-types -- props are fully typed by react-day-picker's CustomComponents contract; the rule cannot see through the inline render-prop
        Chevron: ({ orientation, className: chevClassName, ...chevProps }) => {
          let Icon = ChevronDown
          if (orientation === "left") Icon = ChevronLeft
          else if (orientation === "right") Icon = ChevronRight
          return <Icon className={cx(parts.chevron, chevClassName)} {...chevProps} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
