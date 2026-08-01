import type * as React from "react"

import { css, cx } from "@emotion/css"

import { mix } from "../lib/styles"

const input = css`
  display: flex;
  height: 36px;
  width: 100%;
  min-width: 0;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background: transparent;
  padding: 4px 12px;
  font-size: 14px;
  line-height: 20px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &::file-selector-button {
    color: var(--foreground);
  }

  &::placeholder {
    color: var(--muted-foreground);
  }

  &::selection {
    background: var(--primary);
    color: var(--primary-foreground);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }
`

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cx(input, className)} {...props} />
}

export { Input }
