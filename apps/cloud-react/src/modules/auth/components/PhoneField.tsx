import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CountrySelect } from "@/modules/countries/CountrySelect"

import { type PhoneInputState, placeholderForCountry } from "../phone"

/**
 * Dial-code + national-number entry. State lives in `usePhoneInput` so the
 * caller owns the value (and its E.164 form); this component only renders it.
 * Used by the legacy MobileNumberPrompt dialog and the OAuth account-creation
 * step, which must collect a number before the account can be created.
 */
export function PhoneField({
  input,
  error,
  disabled = false,
  onEnter,
  idPrefix = "phone",
  portalled = false,
}: Readonly<{
  input: PhoneInputState
  error?: string | null
  disabled?: boolean
  onEnter?: () => void
  idPrefix?: string
  portalled?: boolean
}>) {
  const { t } = useTranslation()
  const numberId = `${idPrefix}-number`
  const countryId = `${idPrefix}-country`
  const { countriesFailed, countriesLoading, formattedPreview } = input

  return (
    <div className="space-y-2">
      <Label htmlFor={numberId}>{t("auth.mobilePrompt.number")}</Label>
      <Label htmlFor={countryId} className="sr-only">
        {t("auth.mobilePrompt.country")}
      </Label>
      <div className="grid grid-cols-[minmax(8.5rem,0.9fr)_minmax(0,1.15fr)] gap-2">
        <CountrySelect
          id={countryId}
          value={input.selectedCountry?.iso2 ?? input.countryIso}
          onValueChange={input.setCountryIso}
          placeholder={t("auth.mobilePrompt.countryPlaceholder")}
          showDialCode
          disabled={disabled || countriesLoading}
          invalid={!!error || countriesFailed}
          className="h-10"
          portalled={portalled}
        />
        <div
          className={cn(
            "flex h-10 min-w-0 items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            error && "border-destructive ring-destructive/20",
          )}
        >
          <Input
            id={numberId}
            value={input.raw}
            onChange={(e) => {
              input.setRaw(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter?.()
            }}
            placeholder={placeholderForCountry(
              input.selectedCountry,
              t("auth.mobilePrompt.placeholder"),
            )}
            inputMode="tel"
            autoComplete="tel-national"
            aria-invalid={!!error}
            disabled={disabled}
            className="h-full border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
      </div>
      {countriesFailed && (
        <p className="text-xs text-destructive">{t("auth.mobilePrompt.countriesUnavailable")}</p>
      )}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {formattedPreview
            ? t("auth.mobilePrompt.preview", { number: formattedPreview })
            : t("auth.mobilePrompt.helper")}
        </p>
      )}
    </div>
  )
}
