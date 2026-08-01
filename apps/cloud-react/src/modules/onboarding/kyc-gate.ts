import axios from "axios"
import i18n from "i18next"
import { toast } from "sonner"

import { startVerificationFromToast } from "./start-verification"

// Machine codes the backend kycguard puts on the 403 envelope's `data.code`
// (see apps/org/kycguard). They let us tell the verification gate apart from any
// other 403 without matching on the human-readable message.
export type KycGateCode = "kyc_required" | "rekyc_required"

/** Pull the KYC-gate code off an error, or null when it isn't the gate. */
export function kycGateCode(e: unknown): KycGateCode | null {
  if (!axios.isAxiosError(e) || e.response?.status !== 403) return null
  const code = (e.response.data as { data?: { code?: string } } | undefined)?.data?.code
  return code === "kyc_required" || code === "rekyc_required" ? code : null
}

/**
 * Surface the account-verification gate as a PERSISTENT toast with a
 * "Start verification" action that deep-links into the KYC flow. Returns true
 * when `e` was the gate, so create handlers can skip their generic error toast.
 *
 * This replaces the old up-front KycRequiredBanner + disabled submit: the user
 * can fill the whole form and only meets the wall on submit, where the backend
 * answers 403 and we point them straight at verification.
 */
export function handleKycGateError(e: unknown): boolean {
  const code = kycGateCode(e)
  if (!code) return false
  const rekyc = code === "rekyc_required"
  toast.error(
    i18n.t(rekyc ? "onboarding.verification.rekycTitle" : "onboarding.verification.requiredTitle"),
    {
      id: "kyc-gate", // keep a single persistent toast even across repeated submits
      duration: Infinity,
      description: i18n.t(
        rekyc ? "onboarding.verification.rekycDesc" : "onboarding.verification.requiredDesc",
      ),
      action: {
        label: i18n.t("onboarding.verification.startVerification"),
        // Straight into a verification session rather than a hop through
        // /onboarding/kyc: the user leaves this page either way, so the
        // extra click on an identical button buys nothing. Failures fall
        // back to a toast (see startVerificationFromToast) — this context
        // has no state to render an error into.
        onClick: startVerificationFromToast,
      },
    },
  )
  return true
}
