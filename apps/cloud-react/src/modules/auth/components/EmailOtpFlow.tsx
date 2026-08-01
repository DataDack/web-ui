import { useEffect, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { AtSign, ChevronLeft, Loader2, User } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

import { Button, Input } from "@datadack/common-ui"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

import { extractError, useSendLoginOtp, useUpdateProfile, useVerifyLoginOtp } from "../auth.hooks"
import type { UserProfile } from "../auth.types"
import { usePhoneInput } from "../phone"
import { PhoneField } from "./PhoneField"

const RESEND_SECONDS = 30

// Backend gate messages on POST /auth/users/otp/verify for a NEW email: the OTP
// is validated FIRST and is NOT consumed on these errors, so the same email +
// code can be resubmitted with a phone attached (see users service constants).
const PHONE_REQUIRED_MSG = "mobile number is required to sign up"
const PHONE_INVALID_MSG = "enter a valid mobile number"

// Pill shape shared with the OAuth provider buttons. Color stays token-driven
// (gold variant); only the rounded-full / h-12 shape is overridden here.
const pillButton = "h-12 w-full rounded-full text-sm"
const pillInput =
  "h-12 rounded-full border-border bg-card pl-11 pr-5 shadow-none focus-visible:border-brand-gold/60 focus-visible:ring-brand-gold/30"

// Gold-accented OTP slot — square, prominent active ring, filled-state tint.
const otpSlot =
  "size-12 rounded-xl border-y border-r border-border bg-input/40 font-mono text-lg font-semibold tabular-nums text-foreground transition-all duration-150 first:rounded-l-xl first:border-l last:rounded-r-xl data-[active=true]:z-10 data-[active=true]:border-brand-gold data-[active=true]:ring-2 data-[active=true]:ring-brand-gold/40"

/**
 * Passwordless email sign-in. Takes over the auth panel: email → segmented code
 * → (first-time) display name, one focused field at a time. Each step is a
 * react-hook-form + zod form rendered with shadcn Form/Input/Button. `onBack`
 * returns to the provider list.
 */
export function EmailOtpFlow({
  onAuthed,
  onBack,
  acceptPolicies = false,
}: Readonly<{
  onAuthed: (user: UserProfile) => void
  onBack: () => void
  /** Signup surface: records Privacy Policy + Terms consent when the OTP
   *  verification creates a new account. */
  acceptPolicies?: boolean
}>) {
  const { t } = useTranslation()
  const send = useSendLoginOtp()
  const verify = useVerifyLoginOtp()
  const updateProfile = useUpdateProfile()

  const [stage, setStage] = useState<"email" | "code" | "name">("email")
  const [email, setEmail] = useState("")
  const [resendIn, setResendIn] = useState(0)
  // Bumped to remount (and thus clear) the uncontrolled OTP input on resend/error.
  const [otpKey, setOtpKey] = useState(0)

  // Signup-only phone gate: revealed when a CORRECT code answers with the
  // backend's phone-required error. The code stays put — the same email +
  // code are resubmitted together with the number.
  const [needsPhone, setNeedsPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const phone = usePhoneInput()

  // Editing the number clears a stale validation message.
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

  const schemas = useMemo(
    () => ({
      email: z.object({ email: z.email({ message: t("auth.errors.email") }) }),
      otp: z.object({ otp: z.string().length(6, { message: t("auth.otp.incomplete") }) }),
      name: z.object({
        name: z
          .string()
          .trim()
          .min(2, { message: t("auth.otp.nameRequired") }),
      }),
    }),
    [t],
  )

  const emailForm = useForm({
    resolver: zodResolver(schemas.email),
    defaultValues: { email: "" },
  })
  const otpForm = useForm({ resolver: zodResolver(schemas.otp), defaultValues: { otp: "" } })
  const nameForm = useForm({ resolver: zodResolver(schemas.name), defaultValues: { name: "" } })

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return
    const id = setTimeout(() => {
      setResendIn((s) => s - 1)
    }, 1000)
    return () => {
      clearTimeout(id)
    }
  }, [resendIn])

  // Focus the active step's field (RHF-native, no autofocus prop).
  useEffect(() => {
    if (stage === "email") emailForm.setFocus("email")
    if (stage === "name") nameForm.setFocus("name")
  }, [stage, emailForm, nameForm])

  const doVerify = async (emailValue: string, otp: string) => {
    if (needsPhone && !phone.e164) {
      setPhoneError(t("auth.otp.phoneInvalid"))
      return
    }
    try {
      const res = await verify.mutateAsync({
        email: emailValue,
        otp,
        acceptPolicies,
        phone: needsPhone ? phone.e164 : undefined,
      })
      // New OTP signups come back with name defaulting to the email — ask
      // for a real display name before continuing. Returning users skip it.
      const needsName = !res.user.name || res.user.name === res.user.email
      if (needsName) {
        setStage("name")
        return
      }
      onAuthed(res.user)
    } catch (e) {
      // The signup phone gate: the code was CORRECT (and not consumed) —
      // don't clear it, just collect the number and resubmit as-is.
      const message = extractError(e, "")
      if (message === PHONE_REQUIRED_MSG) {
        setNeedsPhone(true)
        return
      }
      if (message === PHONE_INVALID_MSG) {
        setNeedsPhone(true)
        setPhoneError(t("auth.otp.phoneInvalid"))
        return
      }
      otpForm.reset({ otp: "" })
      setOtpKey((k) => k + 1)
      setStage("code")
      toast.error(extractError(e, t("auth.otp.invalid")))
    }
  }

  const requestCode = async (emailValue: string) => {
    try {
      await send.mutateAsync(emailValue)
      setEmail(emailValue)
      setResendIn(RESEND_SECONDS)
      otpForm.reset({ otp: "" })
      setOtpKey((k) => k + 1)
      // A fresh code (possibly for another email) restarts the phone gate.
      setNeedsPhone(false)
      setPhoneError(null)
      setStage("code")
    } catch (e) {
      toast.error(extractError(e, t("auth.otp.sendFailed")))
    }
  }

  const saveName = async ({ name }: { name: string }) => {
    try {
      const updated = await updateProfile.mutateAsync(name.trim())
      onAuthed(updated)
    } catch (e) {
      toast.error(extractError(e, t("auth.otp.nameFailed")))
    }
  }

  if (stage === "email") {
    return (
      <Form {...emailForm}>
        <form
          className="space-y-3"
          onSubmit={(e) => void emailForm.handleSubmit(({ email: value }) => requestCode(value))(e)}
        >
          <BackLink label={t("auth.otp.back")} onClick={onBack} />
          <p className="text-sm text-muted-foreground">{t("auth.otp.emailIntro")}</p>
          <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <AtSign className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 my-auto ml-4 size-4" />
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={t("auth.otp.emailPlaceholder")}
                      className={pillInput}
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="gold" disabled={send.isPending} className={pillButton}>
            {send.isPending && <Loader2 className="animate-spin" />}
            {t("auth.otp.send")}
          </Button>
        </form>
      </Form>
    )
  }

  if (stage === "name") {
    return (
      <Form {...nameForm}>
        <form className="space-y-3" onSubmit={(e) => void nameForm.handleSubmit(saveName)(e)}>
          <p className="text-sm text-muted-foreground">{t("auth.otp.nameTitle")}</p>
          <FormField
            control={nameForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <User className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 my-auto ml-4 size-4" />
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="name"
                      placeholder={t("auth.otp.namePlaceholder")}
                      className={pillInput}
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="gold"
            disabled={updateProfile.isPending}
            className={pillButton}
          >
            {updateProfile.isPending && <Loader2 className="animate-spin" />}
            {t("auth.otp.saveName")}
          </Button>
        </form>
      </Form>
    )
  }

  // stage === "code"
  return (
    <Form {...otpForm}>
      <form
        className="space-y-3"
        onSubmit={(e) => void otpForm.handleSubmit(({ otp }) => doVerify(email, otp))(e)}
      >
        <BackLink label={t("auth.otp.back")} onClick={onBack} />
        <p className="text-sm text-muted-foreground">{t("auth.otp.enterCode", { email })}</p>
        <FormField
          control={otpForm.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputOTP
                  key={otpKey}
                  maxLength={6}
                  disabled={verify.isPending}
                  containerClassName="justify-center"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  onChange={(val) => {
                    otpForm.setValue("otp", val, { shouldValidate: true })
                  }}
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className={otpSlot} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />
        {/* Signup phone gate: the code was accepted, the account just
                    needs a mobile number — collect it and resubmit the same code. */}
        {needsPhone && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">{t("auth.otp.phoneNeeded")}</p>
            <PhoneField
              input={phoneField}
              error={phoneError}
              disabled={verify.isPending}
              idPrefix="otp-signup"
            />
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStage("email")
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("auth.otp.changeEmail")}
          </button>
          <button
            type="button"
            disabled={resendIn > 0 || send.isPending}
            onClick={() => void requestCode(email)}
            className="font-medium text-brand-gold transition-colors hover:text-brand-gold-hover disabled:text-muted-foreground"
          >
            {resendIn > 0 ? t("auth.otp.resendIn", { seconds: resendIn }) : t("auth.otp.resend")}
          </button>
        </div>
        <Button
          type="submit"
          variant="gold"
          disabled={verify.isPending || (needsPhone && !phone.e164)}
          className={pillButton}
        >
          {verify.isPending && <Loader2 className="animate-spin" />}
          {t("auth.otp.verify")}
        </Button>
      </form>
    </Form>
  )
}

/** Small "← Back" affordance that returns to the provider list. */
function BackLink({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {label}
    </button>
  )
}
