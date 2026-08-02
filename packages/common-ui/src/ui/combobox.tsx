import { useState } from "react"

import { css, cx } from "@emotion/css"
import { Check, ChevronDown } from "lucide-react"

import { mix } from "../lib/styles"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: readonly ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  id?: string
  invalid?: boolean
}

// Matches Input's box so a combobox sits flush beside plain inputs and selects.
const trigger = css`
  display: flex;
  height: 36px;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background: transparent;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 20px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: color, box-shadow;
  transition-duration: 150ms;
  outline: none;

  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &[data-invalid="true"] {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px ${mix("--destructive", 20)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .dark & {
    background: ${mix("--input", 30)};
  }
`

const value = css`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const placeholderText = css`
  color: var(--muted-foreground);
`

const chevron = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.5;
`

const content = css`
  width: var(--radix-popover-trigger-width);
  padding: 0;
`

const itemLabel = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const check = css`
  margin-left: auto;
  width: 16px;
  height: 16px;
`

const checkHidden = css`
  opacity: 0;
`

/**
 * Generic searchable single-select: a button trigger that opens a Popover with
 * a type-to-filter Command list and a checkmark on the active option. Shares
 * the input styling so it slots in next to plain inputs and selects.
 *
 * Labels are props rather than translated here: this package is consumed by apps
 * that do not all set up i18n.
 */
export function Combobox({
  options,
  value: selectedValue,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  disabled,
  id,
  invalid,
}: Readonly<ComboboxProps>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === selectedValue)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-expanded={open}
          data-invalid={invalid ? "true" : undefined}
          disabled={disabled}
          data-empty={!selected}
          className={cx(trigger, className)}
        >
          <span className={cx(value, !selected && placeholderText)}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className={chevron} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={content} align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className={itemLabel}>{option.label}</span>
                  <Check className={cx(check, option.value !== selectedValue && checkHidden)} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
