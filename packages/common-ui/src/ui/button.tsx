import type * as React from "react"

import { Slot } from "radix-ui"

import { css, cx, keyframes } from "../lib/emotion"
import { mix } from "../lib/styles"

const base = css`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
  }

  & svg:not([class*="size-"]) {
    width: 16px;
    height: 16px;
  }

  /* The spinner stands in for the button's icons rather than joining them, so
     the button keeps its width and an icon-only button stays square. It also
     means a caller that renders its own spinner alongside \`loading\` shows one
     spinner, not two. */
  &[data-loading] > svg {
    display: none;
  }
`

const variants = {
  default: css`
    background: var(--primary);
    color: var(--primary-foreground);

    &:hover {
      background: ${mix("--primary", 90)};
    }
  `,
  gold: css`
    background: var(--brand-gold);
    color: var(--brand-gold-foreground);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);

    &:hover {
      background: var(--brand-gold-hover);
    }

    &:focus-visible {
      box-shadow: 0 0 0 3px ${mix("--brand-gold", 40)};
    }
  `,
  destructive: css`
    background: var(--destructive);
    color: #fff;

    &:hover {
      background: ${mix("--destructive", 90)};
    }
  `,
  outline: css`
    border-color: var(--border);
    background: var(--background);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);

    &:hover {
      background: var(--accent);
      color: var(--accent-foreground);
    }

    .dark & {
      border-color: var(--input);
      background: ${mix("--input", 30)};
    }

    .dark &:hover {
      background: ${mix("--input", 50)};
    }
  `,
  secondary: css`
    background: var(--secondary);
    color: var(--secondary-foreground);

    &:hover {
      background: ${mix("--secondary", 80)};
    }
  `,
  ghost: css`
    &:hover {
      background: var(--accent);
      color: var(--accent-foreground);
    }

    .dark &:hover {
      background: ${mix("--accent", 50)};
    }
  `,
  link: css`
    color: var(--primary);
    text-underline-offset: 4px;

    &:hover {
      text-decoration-line: underline;
    }
  `,
} as const

const sizes = {
  default: css`
    height: 36px;
    padding: 8px 16px;

    &:has(> svg) {
      padding-left: 12px;
      padding-right: 12px;
    }
  `,
  xs: css`
    height: 24px;
    gap: 4px;
    padding-left: 8px;
    padding-right: 8px;
    font-size: 12px;
    line-height: 16px;

    &:has(> svg) {
      padding-left: 6px;
      padding-right: 6px;
    }

    & svg:not([class*="size-"]) {
      width: 12px;
      height: 12px;
    }
  `,
  sm: css`
    height: 32px;
    gap: 6px;
    padding-left: 12px;
    padding-right: 12px;

    &:has(> svg) {
      padding-left: 10px;
      padding-right: 10px;
    }
  `,
  lg: css`
    height: 40px;
    padding-left: 24px;
    padding-right: 24px;

    &:has(> svg) {
      padding-left: 16px;
      padding-right: 16px;
    }
  `,
  icon: css`
    width: 36px;
    height: 36px;
  `,
  "icon-xs": css`
    width: 24px;
    height: 24px;

    & svg:not([class*="size-"]) {
      width: 12px;
      height: 12px;
    }
  `,
  "icon-sm": css`
    width: 32px;
    height: 32px;
  `,
  "icon-lg": css`
    width: 40px;
    height: 40px;
  `,
} as const

type ButtonVariant = keyof typeof variants
type ButtonSize = keyof typeof sizes

/** Class-string form, kept for consumers that composed `buttonVariants()`. */
function buttonVariants(options?: {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  className?: string
}) {
  return cx(
    base,
    variants[options?.variant ?? "default"],
    sizes[options?.size ?? "default"],
    options?.className,
  )
}

const spinFrames = keyframes`
  to { transform: rotate(360deg); }
`

/* The spinner replaces the leading icon rather than joining it, so the button
   does not change width mid-action and shift the layout around it. */
const spinner = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: ${spinFrames} 700ms linear infinite;
`

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  asChild?: boolean
  /**
   * Shows a spinner and stops the button responding while an action is in
   * flight. Disables as well as spins: a mutation that takes a second is a
   * second in which an impatient user will click again, and most of these
   * actions are not idempotent.
   *
   * Ignored under `asChild`, where the rendered child owns its own content.
   */
  loading?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // Not set under `asChild`: no spinner is rendered there, and the styling
      // keyed off this attribute hides the icons the spinner would stand in for.
      data-loading={(!asChild && loading) || undefined}
      // aria-busy tells a screen reader the press was received and is being
      // worked on, which the visual spinner alone does not convey.
      aria-busy={loading || undefined}
      disabled={disabled ?? (asChild ? undefined : loading)}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {/* Slot accepts exactly one child, so under asChild the children are
          passed through untouched rather than wrapped alongside a spinner. */}
      {asChild ? (
        children
      ) : (
        <>
          {loading && <span className={spinner} aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
