import type * as React from "react"

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { css, cx } from "../lib/emotion"
import { mix } from "../lib/styles"

const root = css`
  position: relative;
`

// The two !important rules override inline styles Radix puts on its inner
// wrapper, which is why they were `!block` / `!min-w-full` in the original.
const viewport = css`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
    outline: 1px solid var(--ring);
  }

  & > div {
    display: block !important;
    min-width: 100% !important;
  }
`

const scrollbar = css`
  display: flex;
  touch-action: none;
  padding: 1px;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  &[data-orientation="vertical"] {
    height: 100%;
    width: 10px;
    border-left: 1px solid transparent;
  }

  &[data-orientation="horizontal"] {
    height: 10px;
    flex-direction: column;
    border-top: 1px solid transparent;
  }
`

const thumb = css`
  position: relative;
  flex: 1;
  border-radius: 9999px;
  background: var(--border);
`

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cx(root, className)} {...props}>
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className={viewport}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cx(scrollbar, className)}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className={thumb} />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
