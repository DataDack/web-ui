import type * as React from "react"

import { Tooltip as TooltipPrimitive } from "radix-ui"

import { css, cx } from "../lib/emotion"
import { popperAnimation } from "../lib/styles"

const content = css`
  z-index: 50;
  width: fit-content;
  transform-origin: var(--radix-tooltip-content-transform-origin);
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--popover);
  padding: 6px 12px;
  font-size: 12px;
  line-height: 16px;
  text-wrap: balance;
  color: var(--popover-foreground);
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
`

const arrow = css`
  z-index: 50;
  fill: var(--popover);
`

function TooltipProvider({
  delayDuration = 0,
  ...props
}: Readonly<React.ComponentProps<typeof TooltipPrimitive.Provider>>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({ ...props }: Readonly<React.ComponentProps<typeof TooltipPrimitive.Root>>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cx(content, popperAnimation, className)}
        {...props}
      >
        {children}
        {/* Radix auto-orients and positions the arrow flush per side, so it
            stays visible whether the tooltip opens above or below the trigger. */}
        <TooltipPrimitive.Arrow width={12} height={6} className={arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
