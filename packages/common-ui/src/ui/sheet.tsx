import type * as React from "react"

import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { css, cx, keyframes } from "../lib/emotion"
import { media, overlayAnimation } from "../lib/styles"

const overlay = css`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.5);
`

// A sheet slides fully off its own edge, so each side needs its own pair of
// keyframes — the shared popper helper only nudges a surface a few pixels.
// Durations match the original: 500ms in, 300ms out.
const slide = (from: string, to: string) => ({
  in: keyframes`from { transform: ${from}; } to { transform: ${to}; }`,
  out: keyframes`from { transform: ${to}; } to { transform: ${from}; }`,
})

const frames = {
  right: slide("translateX(100%)", "translateX(0)"),
  left: slide("translateX(-100%)", "translateX(0)"),
  top: slide("translateY(-100%)", "translateY(0)"),
  bottom: slide("translateY(100%)", "translateY(0)"),
} as const

const contentBase = css`
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--background);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
`

const sides = {
  right: css`
    inset-block: 0;
    right: 0;
    height: 100%;
    width: 75%;
    border-left: 1px solid var(--border);

    ${media.sm} {
      max-width: 24rem;
    }

    &[data-state="open"] {
      animation: ${frames.right.in} 500ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    &[data-state="closed"] {
      animation: ${frames.right.out} 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
  left: css`
    inset-block: 0;
    left: 0;
    height: 100%;
    width: 75%;
    border-right: 1px solid var(--border);

    ${media.sm} {
      max-width: 24rem;
    }

    &[data-state="open"] {
      animation: ${frames.left.in} 500ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    &[data-state="closed"] {
      animation: ${frames.left.out} 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
  top: css`
    inset-inline: 0;
    top: 0;
    height: auto;
    border-bottom: 1px solid var(--border);

    &[data-state="open"] {
      animation: ${frames.top.in} 500ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    &[data-state="closed"] {
      animation: ${frames.top.out} 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
  bottom: css`
    inset-inline: 0;
    bottom: 0;
    height: auto;
    border-top: 1px solid var(--border);

    &[data-state="open"] {
      animation: ${frames.bottom.in} 500ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    &[data-state="closed"] {
      animation: ${frames.bottom.out} 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
} as const

const close = css`
  position: absolute;
  top: 16px;
  right: 16px;
  border-radius: 0.125rem;
  opacity: 0.7;
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: none;
    box-shadow:
      0 0 0 2px var(--background),
      0 0 0 4px var(--ring);
  }

  &:disabled {
    pointer-events: none;
  }

  &[data-state="open"] {
    background: var(--secondary);
  }

  & svg {
    width: 16px;
    height: 16px;
  }
`

const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border-width: 0;
`

const header = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
`

const footer = css`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
`

const title = css`
  font-weight: 600;
  color: var(--foreground);
`

const description = css`
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);
`

function Sheet({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Root>>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Portal>>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cx(overlay, overlayAnimation, className)}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cx(contentBase, sides[side], className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className={close}>
            <XIcon />
            <span className={srOnly}>Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cx(header, className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cx(footer, className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title data-slot="sheet-title" className={cx(title, className)} {...props} />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cx(description, className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
