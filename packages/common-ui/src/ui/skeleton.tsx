import type * as React from "react"

import { css, cx } from "../lib/emotion"

import { animatePulse } from "../lib/styles"

const skeleton = css`
  background: var(--muted);
  border-radius: 0.375rem;
`

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cx(skeleton, animatePulse, className)} {...props} />
}

export { Skeleton }
