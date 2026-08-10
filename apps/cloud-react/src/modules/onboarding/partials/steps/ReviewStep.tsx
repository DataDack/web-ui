import { useState } from "react"

import { AlertCircle, CheckCircle2, Loader2, Rocket, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/modules/auth/auth.context"
import { PolicyConsent } from "@/modules/auth/components/PolicyConsent"

import { Button } from "@datadack/common-ui"

import type { OnboardingStatusResponse } from "../../onboarding.types"

export function ReviewStep({
  status,
  accountType,
  orgName,
  isCompleting,
  requireConsent = false,
  error,
  onBack,
  onComplete,
}: Readonly<{
  status: OnboardingStatusResponse
  accountType: "individual" | "business"
  orgName: string
  isCompleting: boolean
  /** When set, the owner must accept the Privacy Policy + Terms before the
   *  account is created (used for the "create a new account/organization"
   *  flow; initial signup already captured consent at sign-up). */
  requireConsent?: boolean
  /** Why the last provisioning attempt was refused, verbatim from the API.
   *  Rendered inline and persistently: this is the last step of signup, and a
   *  toast that fades takes the only explanation of "nothing happened" with
   *  it — the reasons are all actionable ("mobile number is required",
   *  "no regions are available yet") and the user cannot act on one they
   *  never saw. */
  error?: string | null
  onBack: () => void
  onComplete: () => void
}>) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [consent, setConsent] = useState(false)
  const isBusiness = accountType === "business"
  const blocked = requireConsent && !consent

  // Onboarding provisions only the tenancy basics — networking is created on
  // demand, and KYC verification happens later (skippable).
  const provisions = [
    ...(isBusiness ? ["onboarding.review.org"] : []),
    "onboarding.review.account",
    "onboarding.review.rg",
  ]

  return (
    <div className="space-y-6">
      {/* Preview: the profile the account is created from (Google /
                Microsoft basic profile, or the name + email entered at signup). */}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Summary label={t("onboarding.review.name")} value={status.name || "—"} />
        <Summary
          label={t("onboarding.review.email")}
          value={status.email || "—"}
          ok={status.email_verified}
        />
        <Summary
          label={t("onboarding.review.phone")}
          value={user?.phone ? user.phone : "—"}
          ok={status.phone_verified}
        />
        <Summary label={t("onboarding.review.type")} value={t(`onboarding.type.${accountType}`)} />
        {isBusiness && <Summary label={t("onboarding.review.orgName")} value={orgName} />}
      </dl>

      <div className="rounded-xl border border-border-glass bg-accent/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("onboarding.review.willCreate")}
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {provisions.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-brand-gold" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border-glass bg-accent/10 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-gold" />
        {t("onboarding.review.kycLater")}
      </div>

      {requireConsent && (
        <PolicyConsent checked={consent} onCheckedChange={setConsent} disabled={isCompleting} />
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">{t("onboarding.review.failed")}</p>
            <p className="mt-0.5 text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={onComplete}
          disabled={isCompleting || blocked}
          className="btn-gold rounded-full font-bold"
        >
          {isCompleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          {t("onboarding.review.create")}
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={isCompleting}>
          {t("onboarding.back")}
        </Button>
      </div>
    </div>
  )
}

function Summary({ label, value, ok }: Readonly<{ label: string; value: string; ok?: boolean }>) {
  return (
    <div className="rounded-lg border border-border-glass p-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
        {ok && <CheckCircle2 className="size-3.5 shrink-0 text-status-success" />}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  )
}
