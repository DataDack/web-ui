import type * as React from "react"

import { Tabs as TabsPrimitive } from "radix-ui"

import { css, cx } from "../lib/emotion"
import { contentEnter, mix } from "../lib/styles"

const root = css`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;

  &[data-orientation="vertical"] {
    flex-direction: row;
  }
`

/* Underline tabs rather than a pill group: this is page-level navigation, and
   it needs to read as part of the page chrome. */
const list = css`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  border-bottom: 1px solid ${mix("--border", 60)};

  &[data-orientation="vertical"] {
    width: fit-content;
    flex-direction: column;
    align-items: stretch;
    overflow: visible;
    border-right: 1px solid ${mix("--border", 60)};
    border-bottom: 0;
  }
`

const trigger = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 0.375rem 0.375rem 0 0;
  padding: 8px 12px;
  color: var(--muted-foreground);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &:hover {
    color: var(--foreground);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px ${mix("--ring", 50)};
  }

  &[data-state="active"] {
    color: var(--foreground);
  }

  &[data-state="active"]::after {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    border-radius: 9999px;
    background: var(--brand-gold);
  }

  [data-orientation="vertical"] > &::after {
    inset: 8px -1px 8px auto;
    width: 2px;
    height: auto;
  }

  & svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`

const content = css`
  outline: none;
`

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cx(root, className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cx(list, className)} {...props} />
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cx(trigger, className)} {...props} />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cx(contentEnter, content, className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
