import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { css, cx } from "../lib/emotion"

// The group needs no rules of its own: react-resizable-panels writes the flex
// container INLINE (display, flex-direction, size, overflow, touch-action) from
// its `orientation` prop, and an inline style beats any class this package
// could add. Only the separator is left to style.

// The separator's aria-orientation is the axis of the LINE, so it is the
// opposite of the group's: a horizontal group is divided by a vertical rule.
// That attribute is the only orientation signal in the DOM — v4 dropped the
// data-panel-group-direction attribute the Tailwind version keyed on.
const handle = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--border);

  &[aria-orientation="vertical"] {
    width: 1px;
  }

  &[aria-orientation="horizontal"] {
    height: 1px;
  }

  /* A 1px line is far too small a hit target, so ::after widens the grab area
     to 4px centred on it — without widening the line or moving the panels. */
  &::after {
    content: "";
    position: absolute;
  }

  &[aria-orientation="vertical"]::after {
    inset-block: 0;
    left: 50%;
    width: 4px;
    transform: translateX(-50%);
  }

  &[aria-orientation="horizontal"]::after {
    inset-inline: 0;
    top: 50%;
    height: 4px;
    transform: translateY(-50%);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 1px var(--background),
      0 0 0 2px var(--ring);
  }

  /* The grip glyph is drawn for a vertical rule, so a horizontal one turns it a
     quarter turn rather than shipping a second icon. */
  &[aria-orientation="horizontal"] > div {
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

function ResizablePanelGroup({ ...props }: ResizablePrimitive.GroupProps) {
  return <ResizablePrimitive.Group data-slot="resizable-panel-group" {...props} />
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & { withHandle?: boolean }) {
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
