import type * as React from "react"

import { css, cx } from "../lib/emotion"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog"

// cmdk tags the elements it renders with [cmdk-*] attributes, which is the only
// handle a consumer gets on its internals — the Tailwind original reached them
// through [&_[cmdk-item]]-style arbitrary selectors, and they are ordinary
// descendant rules here.
const root = css`
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.375rem;
  background: var(--popover);
  color: var(--popover-foreground);
`

/** Inside the dialog everything is a size larger, and groups lose their gap. */
const dialogRoot = css`
  [data-slot="command-input-wrapper"] {
    height: 48px;
  }

  [cmdk-input] {
    height: 48px;
  }

  [cmdk-input-wrapper] svg {
    width: 20px;
    height: 20px;
  }

  [cmdk-group] {
    padding-left: 8px;
    padding-right: 8px;
  }

  [cmdk-group-heading] {
    padding-left: 8px;
    padding-right: 8px;
    font-weight: 500;
    color: var(--muted-foreground);
  }

  [cmdk-group]:not([hidden]) ~ [cmdk-group] {
    padding-top: 0;
  }

  [cmdk-item] {
    padding: 12px 8px;
  }

  [cmdk-item] svg {
    width: 20px;
    height: 20px;
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

const dialogContent = css`
  overflow: hidden;
  padding: 0;
`

const inputWrapper = css`
  display: flex;
  height: 36px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  padding-left: 12px;
  padding-right: 12px;
`

const searchIcon = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.5;
`

const input = css`
  display: flex;
  height: 40px;
  width: 100%;
  border-radius: 0.375rem;
  background: transparent;
  padding-top: 12px;
  padding-bottom: 12px;
  font-size: 14px;
  line-height: 20px;
  outline: none;

  &::placeholder {
    color: var(--muted-foreground);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const list = css`
  max-height: 300px;
  scroll-padding-block: 4px;
  overflow-x: hidden;
  overflow-y: auto;
`

const empty = css`
  padding-top: 24px;
  padding-bottom: 24px;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
`

const group = css`
  overflow: hidden;
  padding: 4px;
  color: var(--foreground);

  [cmdk-group-heading] {
    padding: 6px 8px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    color: var(--muted-foreground);
  }
`

const separator = css`
  margin-left: -4px;
  margin-right: -4px;
  height: 1px;
  background: var(--border);
`

const item = css`
  position: relative;
  display: flex;
  cursor: default;
  align-items: center;
  gap: 8px;
  border-radius: 0.125rem;
  padding: 6px 8px;
  font-size: 14px;
  line-height: 20px;
  outline: none;
  user-select: none;

  &[data-disabled="true"] {
    pointer-events: none;
    opacity: 0.5;
  }

  &[data-selected="true"] {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--muted-foreground);
  }
`

const shortcut = css`
  margin-left: auto;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.1em;
  color: var(--muted-foreground);
`

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" className={cx(root, className)} {...props} />
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className={srOnly}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cx(dialogContent, className)} showCloseButton={showCloseButton}>
        <Command className={dialogRoot}>{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className={inputWrapper}>
      <SearchIcon className={searchIcon} />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cx(input, className)}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List data-slot="command-list" className={cx(list, className)} {...props} />
  )
}

function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={empty} {...props} />
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group data-slot="command-group" className={cx(group, className)} {...props} />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cx(separator, className)}
      {...props}
    />
  )
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item data-slot="command-item" className={cx(item, className)} {...props} />
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cx(shortcut, className)} {...props} />
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
