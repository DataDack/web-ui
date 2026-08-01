import type * as React from "react"

import { css, cx } from "@emotion/css"
import { CheckIcon, MinusIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { mix } from "../lib/styles"

// `peer` stays alongside the emotion class: Label's peer-disabled rule pairs with
// it, and a checkbox is the usual thing it pairs with.
const root = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1px solid var(--input);
  background: ${mix("--input", 30)};
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  outline: none;
  transition: box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &[data-state="checked"],
  &[data-state="indeterminate"] {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
  }

  &[aria-invalid="true"] {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px ${mix("--destructive", 20)};
  }
`

const indicator = css`
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  transition: none;

  & > svg {
    width: 12px;
    height: 12px;
  }
`

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cx("peer", root, className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={indicator}>
        {props.checked === "indeterminate" ? <MinusIcon /> : <CheckIcon />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
