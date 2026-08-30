import type * as React from "react"

import { css, cx } from "../lib/emotion"

const kbd = css`
  pointer-events: none;
  display: inline-flex;
  height: 20px;
  width: fit-content;
  min-width: 20px;
  user-select: none;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 0.125rem;
  background: var(--muted);
  padding-left: 4px;
  padding-right: 4px;
  font-family: inherit;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  color: var(--muted-foreground);

  & svg:not([class*="size-"]) {
    width: 12px;
    height: 12px;
  }

  /* Inside a tooltip the surface is inverted, so the key cap has to invert with
     it — on the dark bubble the default muted grey on grey is unreadable. */
  [data-slot="tooltip-content"] & {
    background: color-mix(in oklab, var(--background) 20%, transparent);
    color: var(--background);
  }
`

const group = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd" className={cx(kbd, className)} {...props} />
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cx(group, className)} {...props} />
}

export { Kbd, KbdGroup }
