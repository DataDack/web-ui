import { useMemo, useState } from "react"

import { Check, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { useCountries } from "./countries.hooks"

// Resolve a human-readable name for an ISO 4217 code (e.g. "INR" → "Indian
// Rupee"). Built once and guarded so unsupported runtimes/codes fall back to
// the bare code instead of throwing.
const currencyName = (() => {
    try {
        const display = new Intl.DisplayNames(["en"], { type: "currency" })
        return (code: string) => {
            try {
                return display.of(code) ?? code
            } catch {
                return code
            }
        }
    } catch {
        return (code: string) => code
    }
})()

// Resolve the narrow symbol for an ISO 4217 code (e.g. "INR" → "₹", "USD" →
// "$"). Falls back to an empty string when the runtime has no symbol for the
// code (it would otherwise echo the bare code, which we already show), so the
// fixed-width slot stays aligned without duplicating the code.
const currencySymbol = (code: string) => {
    try {
        const symbol = new Intl.NumberFormat("en", {
            style: "currency",
            currency: code,
            currencyDisplay: "narrowSymbol",
        })
            .formatToParts(0)
            .find((part) => part.type === "currency")?.value
        return symbol && symbol !== code ? symbol : ""
    } catch {
        return ""
    }
}

interface CurrencySelectProps {
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    id?: string
    invalid?: boolean
}

/**
 * Searchable currency picker. Options are the distinct ISO 4217 currency codes
 * advertised by `GET /api/v1/countries`, so the list stays in sync with the
 * backend rather than being hardcoded per form.
 */
export function CurrencySelect({
    value,
    onValueChange,
    placeholder,
    className,
    disabled,
    id,
    invalid,
}: Readonly<CurrencySelectProps>) {
    const { t } = useTranslation()
    const { data: countries = [] } = useCountries()
    const [open, setOpen] = useState(false)

    const codes = useMemo(() => {
        const set = new Set<string>()
        for (const c of countries) {
            if (c.currency_code) set.add(c.currency_code)
        }
        // Keep a previously-saved value selectable even if the catalog drops it.
        if (value) set.add(value)
        return [...set].sort((a, b) => a.localeCompare(b))
    }, [countries, value])

    // Symbols are a property of the currency, so any country advertising a code
    // yields the same symbol; index them by code. Prefer the backend-provided
    // symbol and fall back to the runtime's Intl symbol when absent.
    const symbolByCode = useMemo(() => {
        const map = new Map<string, string>()
        for (const c of countries) {
            if (c.currency_code && c.currency_symbol && !map.has(c.currency_code)) {
                map.set(c.currency_code, c.currency_symbol)
            }
        }
        return map
    }, [countries])

    const symbolFor = (code: string) => {
        const symbol = symbolByCode.get(code) ?? currencySymbol(code)
        // Suppress symbol-less currencies (their "symbol" is just the code,
        // already shown beside the icon slot) to avoid a duplicated label.
        return symbol === code ? "" : symbol
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    aria-expanded={open}
                    data-invalid={invalid ? "true" : undefined}
                    disabled={disabled}
                    data-empty={!value}
                    className={cn(
                        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
                        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        "data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20",
                        "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
                        className
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {value ? (
                            <>
                                <span className="w-4 shrink-0 text-center">{symbolFor(value)}</span>
                                <span className="font-mono">{value}</span>
                                <span className="truncate text-muted-foreground">
                                    {currencyName(value)}
                                </span>
                            </>
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder ?? t("common.selectCurrency")}
                            </span>
                        )}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command
                    filter={(itemValue, search) =>
                        itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                >
                    <CommandInput placeholder={t("common.searchPlaceholder")} />
                    <CommandList>
                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                        <CommandGroup heading={t("common.allCurrencies")}>
                            {codes.map((code) => (
                                <CommandItem
                                    key={code}
                                    value={`${code} ${currencyName(code)}`}
                                    onSelect={() => {
                                        onValueChange(code)
                                        setOpen(false)
                                    }}
                                >
                                    <span className="w-4 shrink-0 text-center">
                                        {symbolFor(code)}
                                    </span>
                                    <span className="font-mono">{code}</span>
                                    <span className="truncate text-muted-foreground">
                                        {currencyName(code)}
                                    </span>
                                    <Check
                                        className={cn(
                                            "ml-auto size-4",
                                            code === value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
