import { useState } from "react"

import { ChevronLeft, Loader2, MailCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@datadack/common-ui"

import type { OAuthPreview } from "../auth.types"
import { usePhoneInput } from "../phone"
import { PhoneField } from "./PhoneField"
import { PolicyConsent } from "./PolicyConsent"

const providerLabel: Record<OAuthPreview["provider"], string> = {
  google: "Google",
  microsoft: "Microsoft",
}

/**
 * Confirmation step shown before a Google / Microsoft signup creates the
 * account: previews the profile fetched from the provider (avatar, name, email)
 * so the user can confirm the details before the account is created.
 *
 * The provider profile carries no mobile number, and the API requires one to
 * create an account, so it is collected here and passed back with the
 * confirmation. `requireConsent` additionally captures the Privacy Policy +
 * Terms acceptance on surfaces that have not already taken it (the login panel,
 * where a first-time provider sign-in still creates an account).
 */
export function OAuthConfirm({
  preview,
  isPending,
  requireConsent = false,
  onConfirm,
  onCancel,
}: Readonly<{
  preview: OAuthPreview
  isPending: boolean
  requireConsent?: boolean
  onConfirm: (details: { phone: string; acceptPolicies: boolean }) => void
  onCancel: () => void
}>) {
  const { t } = useTranslation()
  const initial = (preview.name || preview.email).trim().charAt(0).toUpperCase()

  const phone = usePhoneInput()
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!phone.selectedCountry) {
      setError(t("auth.mobilePrompt.countriesUnavailable"))
      return
    }
    if (!phone.e164) {
      setError(t("auth.mobilePrompt.invalid"))
      return
    }
    setError(null)
    onConfirm({ phone: phone.e164, acceptPolicies: requireConsent ? consent : true })
  }

  // Editing the number clears a stale validation message.
  const field = {
    ...phone,
    setRaw: (v: string) => {
      phone.setRaw(v)
      if (error) setError(null)
    },
    setCountryIso: (v: string) => {
      phone.setCountryIso(v)
      if (error) setError(null)
    },
  }

  const blocked = isPending || !phone.e164 || (requireConsent && !consent)

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="-ml-1 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ChevronLeft className="size-4" />
        {t("auth.otp.back")}
      </button>

      <p className="text-sm text-muted-foreground">
        {t("auth.confirm.intro", { provider: providerLabel[preview.provider] })}
      </p>

      <div className="flex items-center gap-4 rounded-xl border border-border-glass bg-accent/20 p-4">
        {preview.picture ? (
          <img
            src={preview.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gold text-lg font-semibold text-brand-gold-foreground">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{preview.name}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <MailCheck className="size-3.5 shrink-0 text-status-success" />
            {preview.email}
          </p>
        </div>
      </div>

      <PhoneField
        input={field}
        error={error}
        disabled={isPending}
        onEnter={submit}
        idPrefix="oauth-signup"
      />

      {requireConsent && (
        <PolicyConsent
          checked={consent}
          onCheckedChange={setConsent}
          disabled={isPending}
          id="oauth-confirm-consent"
        />
      )}

      <Button
        onClick={submit}
        disabled={blocked}
        className="btn-gold w-full rounded-full font-bold"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {t("auth.confirm.create")}
      </Button>
    </div>
  )
}
