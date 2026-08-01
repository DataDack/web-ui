import type * as React from "react"

import { css, cx } from "@emotion/css"
import { Separator as SeparatorPrimitive } from "radix-ui"

// Radix sets data-orientation, so the two axes are attribute selectors rather
// than a prop-driven variant — same as the Tailwind data-[orientation=*] rules.
const separator = css`
  flex-shrink: 0;
  background: var(--border);

  &[data-orientation="horizontal"] {
    height: 1px;
    width: 100%;
  }

  &[data-orientation="vertical"] {
    height: 100%;
    width: 1px;
  }
`

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cx(separator, className)}
      {...props}
    />
  )
}

export { Separator }
