import type * as React from "react"

import { css, cx, keyframes } from "@emotion/css"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { media, overlayAnimation } from "../lib/styles"
import { Button } from "./button"

const overlay = css`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.5);
`

// The content is centred with translate(-50%, -50%), so it cannot reuse the
// shared popper keyframes: those write a transform of their own and would drop
// the centring for the duration of the animation. These keyframes carry the
// translate through instead.
const contentEnterFrames = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`

const contentExitFrames = keyframes`
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
`

const content = css`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 50;
  display: grid;
  width: 100%;
  max-width: calc(100% - 2rem);
  transform: translate(-50%, -50%);
  gap: 16px;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--background);
  padding: 24px;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  outline: none;

  &[data-state="open"] {
    animation: ${contentEnterFrames} 200ms cubic-bezier(0, 0, 0.2, 1);
  }

  &[data-state="closed"] {
    animation: ${contentExitFrames} 200ms cubic-bezier(0.4, 0, 1, 1);
  }

  ${media.sm} {
    max-width: 32rem;
  }
`

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
    background: var(--accent);
    color: var(--muted-foreground);
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }
`

/** Visually hidden but still announced, the way Tailwind's sr-only is. */
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
  gap: 8px;
  text-align: center;

  ${media.sm} {
    text-align: left;
  }
`

const footer = css`
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;

  ${media.sm} {
    flex-direction: row;
    justify-content: flex-end;
  }
`

const title = css`
  font-size: 18px;
  line-height: 1;
  font-weight: 600;
`

const description = css`
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);
`

function Dialog({ ...props }: Readonly<React.ComponentProps<typeof DialogPrimitive.Root>>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: Readonly<React.ComponentProps<typeof DialogPrimitive.Portal>>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cx(overlay, overlayAnimation, className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cx(content, className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" className={close}>
            <XIcon />
            <span className={srOnly}>Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cx(header, className)} {...props} />
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div data-slot="dialog-footer" className={cx(footer, className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title data-slot="dialog-title" className={cx(title, className)} {...props} />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cx(description, className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
