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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@datadack/common-ui"
import { cn } from "@/lib/utils"

import { useCountries } from "./countries.hooks"
import type { Country } from "./countries.types"

interface CountrySelectProps {
  /** Selected country ISO2 code (e.g. "IN"). */
  value?: string
  onValueChange: (iso2: string) => void
  placeholder?: string
  /** Append the dial code (e.g. "+91") next to each country name. */
  showDialCode?: boolean
  className?: string
  disabled?: boolean
  id?: string
  invalid?: boolean
  portalled?: boolean
}

function CountryRow({
  country,
  showDialCode,
}: Readonly<{ country: Country; showDialCode?: boolean }>) {
  return (
    <>
      <span className="text-base leading-none">{country.flag}</span>
      <span className="truncate">{country.name}</span>
      {showDialCode && country.dial_code ? (
        <span className="text-muted-foreground">+{country.dial_code}</span>
      ) : null}
    </>
  )
}

/**
 * Searchable country picker backed by `GET /api/v1/countries`. Renders a flag,
 * name and (optionally) dial code, with a checkmark on the active item — used
 * for KYC country selection and anywhere a country is chosen.
 */
export function CountrySelect({
  value,
  onValueChange,
  placeholder,
  showDialCode = false,
  className,
  disabled,
  id,
  invalid,
  portalled = true,
}: Readonly<CountrySelectProps>) {
  const { t } = useTranslation()
  const { data: countries = [] } = useCountries()
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => countries.find((c) => c.iso2 === value), [countries, value])

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
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20",
            "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <CountryRow country={selected} showDialCode={showDialCode} />
            ) : (
              <span className="text-muted-foreground">
                {placeholder ?? t("common.selectCountry")}
              </span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        portalled={portalled}
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={t("common.searchPlaceholder")} />
          <CommandList className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overscroll-contain">
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup heading={t("common.allCountries")}>
              {countries.map((country) => (
                <CommandItem
                  key={country.iso2}
                  // Searchable by name, ISO2 and dial code.
                  value={`${country.name} ${country.iso2} ${country.dial_code}`}
                  onSelect={() => {
                    onValueChange(country.iso2)
                    setOpen(false)
                  }}
                >
                  <CountryRow country={country} showDialCode={showDialCode} />
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      country.iso2 === value ? "opacity-100" : "opacity-0",
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
