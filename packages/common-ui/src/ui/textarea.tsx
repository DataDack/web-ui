import type * as React from "react"

import { css, cx } from "@emotion/css"

import { media, mix } from "../lib/styles"

const textarea = css`
  display: flex;
  field-sizing: content;
  min-height: 4rem;
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background: transparent;
  padding: 8px 12px;
  font-size: 16px;
  line-height: 24px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &::placeholder {
    color: var(--muted-foreground);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &[aria-invalid="true"] {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px ${mix("--destructive", 20)};
  }

  ${media.md} {
    font-size: 14px;
    line-height: 20px;
  }

  .dark & {
    background: ${mix("--input", 30)};
  }

  .dark &[aria-invalid="true"] {
    box-shadow: 0 0 0 3px ${mix("--destructive", 40)};
  }
`

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cx(textarea, className)} {...props} />
}

export { Textarea }
