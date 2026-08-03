import type * as React from "react"

import { css, cx } from "../lib/emotion"

const card = css`
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-radius: var(--radius-xl, 0.75rem);
  border: 1px solid var(--border);
  background: var(--card);
  padding-top: 24px;
  padding-bottom: 24px;
  color: var(--card-foreground);
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
`

// The Tailwind original carried a `@container/card-header` name that nothing
// queried, so only container-type is kept — that is what the query would need
// anyway, and an unused name is misleading.
//
// `[.border-b]:pb-6` there was ambiguous: Tailwind compiles a bare `[.selector]:`
// to a descendant rule, while shadcn's intent is "the consumer added border-b to
// this element". Implemented as the self-match that intent describes.
const header = css`
  container-type: inline-size;
  display: grid;
  grid-auto-rows: min-content;
  grid-template-rows: auto auto;
  align-items: start;
  gap: 8px;
  padding-left: 24px;
  padding-right: 24px;

  &:has([data-slot="card-action"]) {
    grid-template-columns: 1fr auto;
  }

  &.border-b {
    padding-bottom: 24px;
  }
`

const title = css`
  line-height: 1;
  font-weight: 600;
`

const description = css`
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);
`

const action = css`
  grid-column-start: 2;
  grid-row: 1 / span 2;
  align-self: start;
  justify-self: end;
`

const content = css`
  padding-left: 24px;
  padding-right: 24px;
`

const footer = css`
  display: flex;
  align-items: center;
  padding-left: 24px;
  padding-right: 24px;

  &.border-t {
    padding-top: 24px;
  }
`

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cx(card, className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cx(header, className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cx(title, className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cx(description, className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cx(action, className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cx(content, className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cx(footer, className)} {...props} />
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
