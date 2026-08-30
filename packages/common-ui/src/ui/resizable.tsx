import type * as React from "react"

import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { css, cx } from "../lib/emotion"

const group = css`
  display: flex;
  height: 100%;
  width: 100%;

  &[data-panel-group-direction="vertical"] {
    flex-direction: column;
  }
`

// The separator is a 1px line, which is far too small a hit target. `::after`
// widens the grab area to 4px, centred on the line, without widening the line
// itself or shifting the panels either side of it.
const handle = css`
  position: relative;
  display: flex;
  width: 1px;
  align-items: center;
  justify-content: center;
  background: var(--border);

  &::after {
    content: "";
    position: absolute;
    inset-block: 0;
    left: 50%;
    width: 4px;
    transform: translateX(-50%);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 1px var(--background),
      0 0 0 2px var(--ring);
  }

  &[data-panel-group-direction="vertical"] {
    height: 1px;
    width: 100%;
  }

  &[data-panel-group-direction="vertical"]::after {
    left: 0;
    height: 4px;
    width: 100%;
    transform: translateY(-50%);
  }

  /* The grip glyph is drawn for a vertical divider, so a horizontal one turns
     it a quarter turn rather than swapping in a second icon. */
  &[data-panel-group-direction="vertical"] > div {
    transform: rotate(90deg);
  }
`

const grip = css`
  z-index: 10;
  display: flex;
  height: 16px;
  width: 12px;
  align-items: center;
  justify-content: center;
  border-radius: 0.125rem;
  border: 1px solid var(--border);
  background: var(--border);

  & svg {
    width: 10px;
    height: 10px;
  }
`

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cx(group, className)}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cx(handle, className)}
      {...props}
    >
      {withHandle && (
        <div className={grip}>
          <GripVerticalIcon />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
