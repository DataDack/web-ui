import type * as React from "react"

import { css, cx } from "@emotion/css"
import { Label as LabelPrimitive } from "radix-ui"

// The two disabled rules were Tailwind group-*/peer-* variants, which compile to
// ancestor and sibling selectors keyed on those marker classes. Kept literally so
// existing markup — a .group wrapper carrying data-disabled, or a .peer control
// preceding the label — keeps behaving the same.
const label = css`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 1;
  font-weight: 500;
  user-select: none;

  .group[data-disabled="true"] & {
    pointer-events: none;
    opacity: 0.5;
  }

  .peer:disabled ~ & {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cx(label, className)} {...props} />
}

export { Label }
