import type * as React from 'react'

import { css, cx } from '@emotion/css'
import { Slot } from 'radix-ui'

import { mix } from '../lib/styles'

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
    box-shadow: 0 0 0 3px ${mix('--ring', 50)};
  }

  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
  }

  & svg:not([class*='size-']) {
    width: 16px;
    height: 16px;
  }
`

const variants = {
  default: css`
    background: var(--primary);
    color: var(--primary-foreground);

    &:hover {
      background: ${mix('--primary', 90)};
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
      box-shadow: 0 0 0 3px ${mix('--brand-gold', 40)};
    }
  `,
  destructive: css`
    background: var(--destructive);
    color: #fff;

    &:hover {
      background: ${mix('--destructive', 90)};
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
      background: ${mix('--input', 30)};
    }

    .dark &:hover {
      background: ${mix('--input', 50)};
    }
  `,
  secondary: css`
    background: var(--secondary);
    color: var(--secondary-foreground);

    &:hover {
      background: ${mix('--secondary', 80)};
    }
  `,
  ghost: css`
    &:hover {
      background: var(--accent);
      color: var(--accent-foreground);
    }

    .dark &:hover {
      background: ${mix('--accent', 50)};
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

    & svg:not([class*='size-']) {
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
  'icon-sm': css`
    width: 32px;
    height: 32px;
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
    variants[options?.variant ?? 'default'],
    sizes[options?.size ?? 'default'],
    options?.className,
  )
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
