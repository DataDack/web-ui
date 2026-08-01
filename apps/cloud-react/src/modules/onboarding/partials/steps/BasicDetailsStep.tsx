import { useState } from "react"

import { Label } from "@datadack/common-ui"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button, Input, InputOTP, InputOTPGroup, InputOTPSlot } from "@datadack/common-ui"
import { useAuth } from "@/modules/auth/auth.context"
import { useUpdateProfile } from "@/modules/auth/auth.hooks"
import { PhoneField } from "@/modules/auth/components/PhoneField"
import { usePhoneInput } from "@/modules/auth/phone"
import { extractError } from "@/services/api/client"

import { ONBOARDING_QUERY_KEYS, useConfirmPhoneOTP, useSendPhoneOTP } from "../../onboarding.hooks"

/**
 * Basic details — always the first onboarding step. Confirms the display name
 * (signup auto-derives one from the email, so the user should correct it) and
 * collects the required mobile number: sending the code SAVES the number (that
 * alone satisfies the backend's complete gate), so confirming the OTP stays
 * optional — the user can verify now or continue and verify later. An already
 * saved, unchanged number needs no re-send.
 */
export function BasicDetailsStep({ onNext }: Readonly<{ onNext: () => void }>) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const qc = useQueryClient()
  const updateProfile = useUpdateProfile()
  const send = useSendPhoneOTP()
  const confirm = useConfirmPhoneOTP()

  const [stage, setStage] = useState<"form" | "code">("form")
  const [name, setName] = useState(() => user?.name ?? "")
  const [nameError, setNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [otp, setOtp] = useState("")

  // Prefilled from the stored E.164 number, so an unchanged phone re-derives
  // the exact same value and no re-send is needed.
  const phone = usePhoneInput(user?.country ?? "IN", user?.phone ?? "")

  // Editing a field clears its stale validation message.
  const phoneField = {
    ...phone,
    setRaw: (v: string) => {
      phone.setRaw(v)
      if (phoneError) setPhoneError(null)
    },
    setCountryIso: (v: string) => {
      phone.setCountryIso(v)
      if (phoneError) setPhoneError(null)
    },
  }

  const trimmed = name.trim()
  const busy = updateProfile.isPending || send.isPending
  const canContinue = trimmed.length >= 2 && !!phone.e164 && !busy

  const onContinue = async () => {
    let valid = true
    if (trimmed.length < 2) {
      setNameError(t("onboarding.details.nameError"))
      valid = false
    }
    if (!phone.e164) {
      setPhoneError(t("auth.mobilePrompt.invalid"))
      valid = false
    }
    if (!valid) return

    // Persist the name first (only when changed) so a phone failure never
    // loses it; the hook refreshes the session cache itself.
    if (trimmed !== user?.name) {
      try {
        await updateProfile.mutateAsync(trimmed)
        void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEYS.status })
      } catch (e) {
        setNameError(extractError(e, t("onboarding.details.nameFailed")))
        return
      }
    }

    // Unchanged saved number → nothing to send, move on.
    if (phone.e164 === user?.phone) {
      onNext()
      return
    }
    try {
      await send.mutateAsync(phone.e164)
      toast.success(t("onboarding.details.sent"))
      setOtp("")
      setStage("code")
    } catch (e) {
      setPhoneError(extractError(e, t("onboarding.details.sendFailed")))
    }
  }

  const verify = async () => {
    try {
      await confirm.mutateAsync(otp)
      toast.success(t("onboarding.details.verified"))
      onNext()
    } catch (e) {
      setOtp("")
      toast.error(extractError(e, t("onboarding.details.invalid")))
    }
  }

  if (stage === "code") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {t("onboarding.details.enterCode", {
            number: phone.formattedPreview || phone.e164,
          })}
        </p>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center">
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => void verify()}
            disabled={otp.length !== 6 || confirm.isPending}
            className="btn-gold rounded-full font-bold"
          >
            {confirm.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("onboarding.details.verify")}
          </Button>
          {/* The number is already saved — verifying it can wait. */}
          <Button variant="ghost" onClick={onNext} disabled={confirm.isPending}>
            {t("onboarding.details.skipVerify")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("onboarding.details.intro")}</p>

      <div className="space-y-2">
        <Label htmlFor="details-name">{t("onboarding.details.name")}</Label>
        <Input
          id="details-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (nameError) setNameError(null)
          }}
          placeholder={t("onboarding.details.namePlaceholder")}
          maxLength={100}
          autoComplete="name"
          aria-invalid={!!nameError}
          disabled={busy}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      <PhoneField
        input={phoneField}
        error={phoneError}
        disabled={busy}
        onEnter={() => void onContinue()}
        idPrefix="details-phone"
      />

      <Button
        onClick={() => void onContinue()}
        // Both details are required: no skipping past this step.
        disabled={!canContinue}
        className="btn-gold rounded-full font-bold"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {t("onboarding.continue")}
      </Button>
    </div>
  )
}
