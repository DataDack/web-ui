import { useId, useMemo, useRef, useState } from "react"

import { Check, ChevronDown, Loader2 } from "lucide-react"

import { css, cx } from "../lib/emotion"

import { animateSpin, fontMono, mix } from "../lib/styles"
import { Popover, PopoverAnchor, PopoverContent } from "./popover"

// Matches Input's box, but the focus ring lives on the wrapper (focus-within)
// because the chevron button sits inside the same field.
const field = css`
  position: relative;
  display: flex;
  height: 36px;
  width: 100%;
  align-items: center;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background: transparent;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: color, box-shadow;
  transition-duration: 150ms;

  &:focus-within {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  .dark & {
    background: ${mix("--input", 30)};
  }
`

const fieldInvalid = css`
  border-color: var(--destructive);
  box-shadow: 0 0 0 3px ${mix("--destructive", 20)};

  .dark & {
    box-shadow: 0 0 0 3px ${mix("--destructive", 40)};
  }
`

const fieldDisabled = css`
  pointer-events: none;
  opacity: 0.5;
`

const textInput = css`
  height: 100%;
  width: 100%;
  min-width: 0;
  border-radius: 0.375rem;
  background: transparent;
  padding-left: 12px;
  padding-right: 32px;
  font-size: 14px;
  line-height: 20px;
  outline: none;

  &::placeholder {
    color: var(--muted-foreground);
  }

  &:disabled {
    cursor: not-allowed;
  }
`

const toggle = css`
  position: absolute;
  right: 0;
  display: flex;
  height: 100%;
  align-items: center;
  padding-left: 8px;
  padding-right: 8px;
  color: ${mix("--muted-foreground", 70)};

  &:hover {
    color: var(--foreground);
  }
`

const chevron = css`
  width: 16px;
  height: 16px;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
`

const chevronOpen = css`
  transform: rotate(180deg);
`

const list = css`
  max-height: 16rem;
  width: var(--radix-popover-trigger-width);
  overflow-y: auto;
  padding: 4px;
`

const status = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);
`

const spinner = css`
  width: 14px;
  height: 14px;
`

const row = css`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  border-radius: 0.125rem;
  padding: 6px 8px;
  text-align: left;
  font-size: 14px;
  line-height: 20px;
  outline: none;
  color: var(--foreground);
`

const rowActive = css`
  background: var(--accent);
  color: var(--accent-foreground);
`

const rowLabel = css`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const rowHint = css`
  flex-shrink: 0;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

const check = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
`

const checkHidden = css`
  opacity: 0;
`

export interface ComboboxInputOption {
  /** The value written into the field when the row is picked. */
  value: string
  /** Primary label shown in the row — defaults to `value`. */
  label?: string
  /** Secondary muted text aligned to the right of the row. */
  hint?: string
}

interface ComboboxInputProps {
  value: string
  onValueChange: (value: string) => void
  options: readonly ComboboxInputOption[]
  placeholder?: string
  emptyText?: string
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  className?: string
  /** Normalise free text before it is committed (e.g. uppercase keys). */
  transform?: (raw: string) => string
  autoComplete?: string
}

/**
 * Editable combobox: a themed text input with a filtered suggestion popover.
 * Unlike {@link Combobox} it accepts free text, so it is the drop-in
 * replacement for a native `<datalist>` that ignores the app theme. Focus
 * stays in the input while the list is open, with arrow/enter/escape support.
 */
export function ComboboxInput({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "No matches",
  loading = false,
  loadingText = "Loading…",
  disabled,
  invalid,
  id,
  className,
  transform,
  autoComplete = "off",
}: Readonly<ComboboxInputProps>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => {
      const haystack = `${option.value} ${option.label ?? ""} ${option.hint ?? ""}`
      return haystack.toLowerCase().includes(q)
    })
  }, [options, value])

  const commit = (next: string) => {
    onValueChange(transform ? transform(next) : next)
    setOpen(false)
  }

  const showList = open && !disabled && (loading || options.length > 0)

  return (
    <Popover open={showList} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cx(field, invalid && fieldInvalid, disabled && fieldDisabled, className)}>
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid ? true : undefined}
            autoComplete={autoComplete}
            disabled={disabled}
            value={value}
            placeholder={placeholder}
            className={textInput}
            onChange={(event) => {
              const next = event.target.value
              onValueChange(transform ? transform(next) : next)
              setActive(0)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setOpen(true)
                setActive((i) => Math.min(i + 1, filtered.length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (event.key === "Enter" && showList && filtered[active]) {
                event.preventDefault()
                commit(filtered[active].value)
              } else if (event.key === "Escape") {
                setOpen(false)
              }
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle suggestions"
            disabled={disabled}
            className={toggle}
            onClick={() => {
              setOpen((prev) => !prev)
              inputRef.current?.focus()
            }}
          >
            <ChevronDown className={cx(chevron, showList && chevronOpen)} />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id={listId}
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => {
          // Keep the caret in the input; the list is navigated by keyboard.
          event.preventDefault()
        }}
        className={list}
      >
        {loading && (
          <div className={status}>
            <Loader2 className={cx(spinner, animateSpin)} />
            {loadingText}
          </div>
        )}
        {!loading && filtered.length === 0 && <div className={status}>{emptyText}</div>}
        {!loading &&
          filtered.map((option, index) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cx(row, index === active && rowActive)}
                onMouseEnter={() => {
                  setActive(index)
                }}
                onMouseDown={(event) => {
                  // Prevent the input blur that would close the list first.
                  event.preventDefault()
                }}
                onClick={() => {
                  commit(option.value)
                  inputRef.current?.focus()
                }}
              >
                <span className={rowLabel}>{option.label ?? option.value}</span>
                {option.hint && <span className={rowHint}>{option.hint}</span>}
                <Check className={cx(check, !selected && checkHidden)} />
              </button>
            )
          })}
      </PopoverContent>
    </Popover>
  )
}
