import type * as React from "react"

import { ChevronDown } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { css, cx } from "../lib/emotion"
import { accordionAnimation, mix } from "../lib/styles"

const item = css`
  border-bottom: 1px solid var(--border-glass);

  &:last-child {
    border-bottom: 0;
  }
`

const header = css`
  display: flex;
`

const trigger = css`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
  padding-bottom: 16px;
  text-align: left;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  outline: none;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  &[data-state="open"] > svg {
    transform: rotate(180deg);
  }
`

const chevron = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--muted-foreground);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
`

const content = css`
  overflow: hidden;
  font-size: 14px;
  line-height: 20px;
`

const contentInner = css`
  padding-top: 0;
  padding-bottom: 16px;
`

function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cx(item, className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className={header}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cx(trigger, className)}
        {...props}
      >
        {children}
        <ChevronDown className={chevron} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cx(content, accordionAnimation)}
      {...props}
    >
      <div className={cx(contentInner, className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
