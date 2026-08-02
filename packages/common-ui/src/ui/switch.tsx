import type * as React from "react"

import { css, cx } from "../lib/emotion"
import { Switch as SwitchPrimitive } from "radix-ui"

import { mix } from "../lib/styles"

// `peer` is kept as a class alongside the emotion one: Label's peer-disabled rule
// selects on it, and dropping it would silently break that pairing.
const root = css`
  display: inline-flex;
  height: 20px;
  width: 36px;
  flex-shrink: 0;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  outline: none;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &[data-state="checked"] {
    background: var(--primary);
  }

  &[data-state="unchecked"] {
    background: var(--input);
  }
`

const thumb = css`
  pointer-events: none;
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background: var(--background);
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &[data-state="checked"] {
    transform: translateX(calc(100% + 2px));
  }

  &[data-state="unchecked"] {
    transform: translateX(2px);
  }
`

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root data-slot="switch" className={cx("peer", root, className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={thumb} />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
