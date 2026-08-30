import type * as React from "react"

import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { buttonVariants } from "./button"
import { css, cx, keyframes } from "../lib/emotion"
import { media, overlayAnimation } from "../lib/styles"

const overlay = css`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.5);
`

// Centred with translate(-50%, -50%), so — exactly as in dialog.tsx — the
// shared popper keyframes cannot be reused: they write a transform of their own
// and would drop the centring mid-animation. These carry the translate through.
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

const header = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;

  ${media.sm} {
    text-align: left;
  }
`

// Reversed so that in the stacked mobile layout the confirming action sits on
// top, while the row layout still reads cancel-then-confirm left to right.
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
  line-height: 28px;
  font-weight: 600;
`

const description = css`
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);
`

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cx(overlay, overlayAnimation, className)}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cx(content, className)}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cx(header, className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cx(footer, className)} {...props} />
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cx(title, className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cx(description, className)}
      {...props}
    />
  )
}

// Action and Cancel are buttons in every respect except that Radix owns their
// click handling, so they take the Button CLASS rather than the component —
// wrapping <Button> in asChild here would fight Radix for the ref.
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action className={buttonVariants({ className })} {...props} />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={buttonVariants({ variant: "outline", className })}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
