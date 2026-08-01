import * as React from "react"

import { css, cx } from "@emotion/css"
import { OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "lucide-react"

import { caretBlink, mix } from "../lib/styles"

// input-otp takes plain class strings for its wrapper and input, so emotion's
// generated names drop straight in — the only library-specific part is reading
// slot state off OTPInputContext.
const container = css`
  display: flex;
  align-items: center;
  gap: 8px;

  &:has(:disabled) {
    opacity: 0.5;
  }
`

const input = css`
  &:disabled {
    cursor: not-allowed;
  }
`

const group = css`
  display: flex;
  align-items: center;
`

// Slots sit flush in a row: each carries the top, bottom and right border, the
// first adds the left one, and only the outer corners are rounded.
const slot = css`
  position: relative;
  display: flex;
  height: 36px;
  width: 36px;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--input);
  border-bottom: 1px solid var(--input);
  border-right: 1px solid var(--input);
  font-size: 14px;
  line-height: 20px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &:first-of-type {
    border-left: 1px solid var(--input);
    border-top-left-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
  }

  &:last-of-type {
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }

  &[aria-invalid="true"] {
    border-color: var(--destructive);
  }

  &[data-active="true"] {
    z-index: 10;
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &[data-active="true"][aria-invalid="true"] {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px ${mix("--destructive", 20)};
  }

  .dark & {
    background: ${mix("--input", 30)};
  }

  .dark &[data-active="true"][aria-invalid="true"] {
    box-shadow: 0 0 0 3px ${mix("--destructive", 40)};
  }
`

const caretWrap = css`
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

const caret = css`
  height: 16px;
  width: 1px;
  background: var(--foreground);
`

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cx(container, containerClassName)}
      className={cx(input, className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="input-otp-group" className={cx(group, className)} {...props} />
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  // .at() is honest about an out-of-range index (undefined), which is exactly
  // what the `?? {}` fallback absorbs when a slot renders past maxLength.
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots.at(index) ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cx(slot, className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className={caretWrap}>
          <div className={cx(caret, caretBlink)} />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
