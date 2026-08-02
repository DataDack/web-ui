import type * as React from "react"

import { Popover as PopoverPrimitive } from "radix-ui"

import { css, cx } from "../lib/emotion"
import { popperAnimation } from "../lib/styles"

const content = css`
  z-index: 50;
  width: 18rem;
  transform-origin: var(--radix-popover-content-transform-origin);
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--popover);
  padding: 16px;
  color: var(--popover-foreground);
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
  outline: none;
`

function Popover({ ...props }: Readonly<React.ComponentProps<typeof PopoverPrimitive.Root>>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portalled = true,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalled?: boolean
}) {
  const node = (
    <PopoverPrimitive.Content
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      className={cx(content, popperAnimation, className)}
      {...props}
    />
  )

  if (!portalled) return node

  return <PopoverPrimitive.Portal>{node}</PopoverPrimitive.Portal>
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
