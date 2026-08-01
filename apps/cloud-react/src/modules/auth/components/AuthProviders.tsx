import { useState } from "react"

import { Mail, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { extractError, useGoogleSignIn, useMicrosoftSignIn, usePreviewOAuth } from "../auth.hooks"
import type { OAuthPreview, OAuthProvider, UserProfile } from "../auth.types"
import { EmailOtpFlow } from "./EmailOtpFlow"
import { GoogleButton } from "./GoogleButton"
import { MicrosoftButton } from "./MicrosoftButton"
import { OAuthConfirm } from "./OAuthConfirm"
import { PolicyConsent } from "./PolicyConsent"

const pill =
  "console-card flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand-gold/60 hover:bg-brand-gold-soft focus-visible:ring-2 focus-visible:ring-brand-gold/40 disabled:opacity-50"

/** A pending OAuth signup awaiting confirmation: the previewed profile plus the
 *  ID token to complete the sign-in with once the user confirms. */
type PendingOAuth = OAuthPreview & { token: string }

/** Sign-in entry points: Google, Microsoft, or passwordless email (OTP). The
 * email path takes over the panel — once chosen, the other options step aside
 * so the user focuses on a single field at a time.
 *
 * On the signup surface (`flow="signup"`) a required Privacy Policy + Terms
 * consent gates every provider, and Google/Microsoft first preview the account
 * that will be created (see OAuthConfirm) before it is provisioned. */
export function AuthProviders({ flow = "login" }: Readonly<{ flow?: "login" | "signup" }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const preview = usePreviewOAuth()
  const google = useGoogleSignIn()
  const microsoft = useMicrosoftSignIn()

  const isSignup = flow === "signup"
  const [consent, setConsent] = useState(false)
  const [emailMode, setEmailMode] = useState(false)
  const [pending, setPending] = useState<PendingOAuth | null>(null)

  const routeAfter = (user: UserProfile) => {
    void navigate(user.onboarding_status === "completed" ? "/" : "/onboarding", {
      replace: true,
    })
  }

  /** `details` is present only when the sign-in creates a new account, where
   *  the API requires a mobile number and records policy consent. */
  const signIn = async (
    provider: OAuthProvider,
    token: string,
    details?: { phone: string; acceptPolicies: boolean },
  ) => {
    const mutation = provider === "google" ? google : microsoft
    const res = await mutation.mutateAsync({
      token,
      acceptPolicies: details?.acceptPolicies ?? (isSignup && consent),
      phone: details?.phone,
    })
    routeAfter(res.user)
  }

  // Preview first on both surfaces: a returning user signs straight in, but a
  // first-time provider sign-in CREATES an account, and creation needs a
  // mobile number the provider profile does not carry (plus policy consent on
  // the login panel, which has no consent checkbox). The confirm step collects
  // both, so a new user is never rejected for a missing number.
  const startOAuth = async (provider: OAuthProvider, token: string) => {
    const failMsg =
      provider === "google" ? "auth.errors.googleFailed" : "auth.errors.microsoftFailed"
    try {
      const profile = await preview.mutateAsync({ provider, token })
      if (profile.is_new_user) {
        setPending({ ...profile, token })
      } else {
        await signIn(provider, token)
      }
    } catch (e) {
      toast.error(extractError(e, t(failMsg)))
    }
  }

  const confirmOAuth = async (details: { phone: string; acceptPolicies: boolean }) => {
    if (!pending) return
    try {
      await signIn(pending.provider, pending.token, details)
    } catch (e) {
      const failMsg =
        pending.provider === "google" ? "auth.errors.googleFailed" : "auth.errors.microsoftFailed"
      toast.error(extractError(e, t(failMsg)))
    }
  }

  // OAuth signup confirmation owns the panel until confirmed or cancelled.
  if (pending) {
    return (
      <OAuthConfirm
        preview={pending}
        isPending={google.isPending || microsoft.isPending}
        // Signup already captured consent via the panel checkbox; the
        // login panel has none, so take it here before creating.
        requireConsent={!isSignup}
        onConfirm={(details) => void confirmOAuth(details)}
        onCancel={() => {
          setPending(null)
        }}
      />
    )
  }

  // Email flow owns the panel — show only the field(s) and a way back.
  if (emailMode) {
    return (
      <EmailOtpFlow
        acceptPolicies={isSignup && consent}
        onAuthed={routeAfter}
        onBack={() => {
          setEmailMode(false)
        }}
      />
    )
  }

  const busy = preview.isPending || google.isPending || microsoft.isPending
  // Signup requires accepting the policies before any provider is usable.
  const blocked = isSignup && !consent

  return (
    <div className="space-y-3">
      {isSignup && <PolicyConsent checked={consent} onCheckedChange={setConsent} disabled={busy} />}

      <GoogleButton onToken={(tok) => void startOAuth("google", tok)} disabled={busy || blocked} />
      <MicrosoftButton
        onToken={(tok) => void startOAuth("microsoft", tok)}
        disabled={busy || blocked}
      />

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("auth.or")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        disabled={busy || blocked}
        onClick={() => {
          setEmailMode(true)
        }}
        className={pill}
      >
        <Mail className="size-5" />
        {t("auth.otp.continue")}
      </button>

      <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        {t("auth.google.secure")}
      </p>
    </div>
  )
}
