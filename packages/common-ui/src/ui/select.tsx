import type * as React from "react"

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"

import { css, cx } from "../lib/emotion"
import { mix, popperAnimation } from "../lib/styles"

const trigger = css`
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background: transparent;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  outline: none;

  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &[aria-invalid="true"] {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px ${mix("--destructive", 20)};
  }

  &[data-placeholder] {
    color: var(--muted-foreground);
  }

  &[data-size="default"] {
    height: 36px;
  }

  &[data-size="sm"] {
    height: 32px;
  }

  & > [data-slot="select-value"] {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-line-clamp: 1;
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--muted-foreground);
  }

  .dark & {
    background: ${mix("--input", 30)};
  }

  .dark &:hover {
    background: ${mix("--input", 50)};
  }

  .dark &[aria-invalid="true"] {
    box-shadow: 0 0 0 3px ${mix("--destructive", 40)};
  }
`

const chevron = css`
  width: 16px;
  height: 16px;
  opacity: 0.5;
`

const content = css`
  position: relative;
  z-index: 50;
  max-height: var(--radix-select-content-available-height);
  min-width: 8rem;
  transform-origin: var(--radix-select-content-transform-origin);
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--popover);
  color: var(--popover-foreground);
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
`

// popper mode offsets the surface off the trigger. The shared popperAnimation
// already slides on data-side, so this only adds the resting nudge.
const popperOffset = css`
  &[data-side="bottom"] {
    transform: translateY(4px);
  }

  &[data-side="top"] {
    transform: translateY(-4px);
  }

  &[data-side="left"] {
    transform: translateX(-4px);
  }

  &[data-side="right"] {
    transform: translateX(4px);
  }
`

const viewport = css`
  padding: 4px;
`

const viewportPopper = css`
  height: var(--radix-select-trigger-height);
  width: 100%;
  min-width: var(--radix-select-trigger-width);
  scroll-margin-block: 4px;
`

const label = css`
  padding: 6px 8px;
  font-size: 12px;
  line-height: 16px;
  color: var(--muted-foreground);
`

const item = css`
  position: relative;
  display: flex;
  width: 100%;
  cursor: default;
  align-items: center;
  gap: 8px;
  border-radius: 0.125rem;
  padding: 6px 32px 6px 8px;
  font-size: 14px;
  line-height: 20px;
  outline: none;
  user-select: none;

  &:focus {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  &[data-disabled] {
    pointer-events: none;
    opacity: 0.5;
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--muted-foreground);
  }

  & > span:last-child {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`

const itemIndicator = css`
  position: absolute;
  right: 8px;
  display: flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
`

const separator = css`
  pointer-events: none;
  margin: 4px -4px;
  height: 1px;
  background: var(--border);
`

const scrollButton = css`
  display: flex;
  cursor: default;
  align-items: center;
  justify-content: center;
  padding-top: 4px;
  padding-bottom: 4px;

  & svg {
    width: 16px;
    height: 16px;
  }
`

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cx(trigger, className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className={chevron} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cx(content, popperAnimation, position === "popper" && popperOffset, className)}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className={cx(viewport, position === "popper" && viewportPopper)}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label data-slot="select-label" className={cx(label, className)} {...props} />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cx(item, className)} {...props}>
      <span data-slot="select-item-indicator" className={itemIndicator}>
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cx(separator, className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cx(scrollButton, className)}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cx(scrollButton, className)}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
