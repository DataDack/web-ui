import type * as React from "react"

import { css, cx } from "../lib/emotion"
import { Slot } from "radix-ui"

const base = css`
  display: inline-flex;
  width: fit-content;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
  border-radius: 9999px;
  border: 1px solid transparent;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  white-space: nowrap;
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

  & > svg {
    pointer-events: none;
    width: 12px;
    height: 12px;
  }
`

const variants = {
  default: css`
    background: var(--primary);
    color: var(--primary-foreground);
  `,
  secondary: css`
    background: var(--secondary);
    color: var(--secondary-foreground);
  `,
  destructive: css`
    background: var(--destructive);
    color: #fff;
  `,
  outline: css`
    border-color: var(--border);
    color: var(--foreground);
  `,
} as const

type BadgeVariant = keyof typeof variants

/** Class-string form, kept for consumers that composed `badgeVariants()`. */
function badgeVariants(options?: { variant?: BadgeVariant | null; className?: string }) {
  return cx(base, variants[options?.variant ?? "default"], options?.className)
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant | null; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" className={badgeVariants({ variant, className })} {...props} />
}

export { Badge, badgeVariants }
