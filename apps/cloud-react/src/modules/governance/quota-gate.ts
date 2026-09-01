import axios from "axios"
import i18n from "i18next"
import { toast } from "sonner"

// Machine code the backend quotaguard puts on the 403 envelope's `data.code`
// (see apps/quotas/quotaguard). It lets us tell the quota wall apart from any
// other 403 without matching on the human-readable message.

interface QuotaGatePayload {
  quotaCode: string
  /** The envelope's meta.message — e.g. "VM instances quota reached (10 of 10 in use)". */
  message: string
}

/** Pull the quota-gate payload off an error, or null when it isn't the gate. */
export function quotaGatePayload(e: unknown): QuotaGatePayload | null {
  if (!axios.isAxiosError(e) || e.response?.status !== 403) return null
  const body = e.response.data as
    { data?: { code?: string; quota_code?: string }; meta?: { message?: string } } | undefined
  if (body?.data?.code !== "quota_exceeded") return null
  return {
    quotaCode: body.data.quota_code ?? "",
    message: body.meta?.message ?? "",
  }
}

/**
 * Surface a quota-blocked create as a PERSISTENT toast with a "Request
 * increase" action that deep-links into the Quotas page with the request
 * dialog preselected. Returns true when `e` was the gate, so create handlers
 * can skip their generic error toast.
 *
 * Mirrors handleKycGateError (onboarding/kyc-gate.ts): the user can fill the
 * whole form and only meets the wall on submit, where the backend answers 403
 * and we point them straight at the increase-request flow.
 */
export function handleQuotaGateError(e: unknown): boolean {
  const gate = quotaGatePayload(e)
  if (!gate) return false
  toast.error(gate.message, {
    id: "quota-gate", // keep a single persistent toast even across repeated submits
    duration: Infinity,
    action: {
      label: i18n.t("quotaGate.action"),
      onClick: () => {
        window.location.assign(`/manage-account/quotas?request=${encodeURIComponent(gate.quotaCode)}`)
      },
    },
  })
  return true
}
