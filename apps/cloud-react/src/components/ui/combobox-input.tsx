import { useId, useMemo, useRef, useState } from "react"

import { Check, ChevronDown, Loader2 } from "lucide-react"

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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
                <div
                    className={cn(
                        "relative flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30",
                        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                        invalid && "border-destructive ring-destructive/20 dark:ring-destructive/40",
                        disabled && "pointer-events-none opacity-50",
                        className
                    )}
                >
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
                        className="h-full w-full min-w-0 rounded-md bg-transparent pr-8 pl-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
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
                        className="absolute right-0 flex h-full items-center px-2 text-muted-foreground/70 hover:text-foreground"
                        onClick={() => {
                            setOpen((prev) => !prev)
                            inputRef.current?.focus()
                        }}
                    >
                        <ChevronDown
                            className={cn(
                                "size-4 transition-transform",
                                showList && "rotate-180"
                            )}
                        />
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
                className="max-h-64 w-(--radix-popover-trigger-width) overflow-y-auto p-1"
            >
                {loading && (
                    <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        {loadingText}
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">{emptyText}</div>
                )}
                {!loading &&
                    filtered.map((option, index) => {
                        const selected = option.value === value
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                                    index === active
                                        ? "bg-accent text-accent-foreground"
                                        : "text-foreground"
                                )}
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
                                <span className="min-w-0 flex-1 truncate">
                                    {option.label ?? option.value}
                                </span>
                                {option.hint && (
                                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                        {option.hint}
                                    </span>
                                )}
                                <Check
                                    className={cn(
                                        "size-4 shrink-0",
                                        selected ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </button>
                        )
                    })}
            </PopoverContent>
        </Popover>
    )
}
