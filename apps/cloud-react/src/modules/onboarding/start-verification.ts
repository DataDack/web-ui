import axios from "axios"
import i18n from "i18next"
import { toast } from "sonner"

import { onboardingApi } from "./onboarding.api"

/**
 * Opening a verification session is the ONLY way into the KYC flow.
 *
 * The external KYC service (a Lambda behind API Gateway) mints a per-user,
 * per-session `authorization_url` for the DigiLocker consent flow — there is no
 * static "verify page" a user can be linked to. So every entry point has to go
 * through POST /kyc/start and redirect to whatever it returns. This module is
 * that one path, shared by the verification page and the 403 gate toast, so
 * neither can drift back into linking at a fixed URL.
 *
 * The verdict never comes back through the browser: the KYC service delivers it
 * to /kyc/webhook, which is what actually flips the user's flags. Landing back
 * on the redirect page proves nothing, which is why callers refetch the status
 * rather than assuming success.
 */
export type StartVerificationResult =
    /** Redirect issued — the browser is on its way to the provider. */
    | { outcome: "redirecting" }
    /** Backend reconciled a lost verdict: already verified, nothing to do but
     *  refresh the status. */
    | { outcome: "already-verified" }

/**
 * Start (or resume) verification and send the user to the provider.
 *
 * Throws on failure so callers can surface it in whatever way fits — the page
 * shows inline error state, the toast re-toasts. Use `verificationErrorMessage`
 * to turn the thrown error into user-facing copy.
 */
export async function startVerification(): Promise<StartVerificationResult> {
    const session = await onboardingApi.startKyc()

    // No URL means the backend applied an already-VERIFIED verification whose
    // webhook was lost, rather than opening a session. Nothing to redirect to.
    if (!session.authorization_url) return { outcome: "already-verified" }

    // assign(), not replace(): the console page stays in history so a user who
    // abandons the provider flow can come back with the browser's back button.
    window.location.assign(session.authorization_url)
    return { outcome: "redirecting" }
}

/** User-facing copy for a failed startVerification(), by why it failed. */
export function verificationErrorMessage(e: unknown): string {
    // 503 is the backend's sentinel for an upstream KYC-service outage — not the
    // user's fault and worth retrying, unlike the 400s (not enabled, already
    // completed) which mean this request will never succeed as-is.
    if (axios.isAxiosError(e) && e.response?.status === 503) {
        return i18n.t("onboarding.verification.serviceUnavailable")
    }
    return i18n.t("onboarding.verification.startFailed")
}

/**
 * Fire-and-forget entry point for contexts with no React state to render into
 * (the kycguard 403 toast). Reports failure as a toast; on the reconciled
 * already-verified path it reloads so the console re-reads the now-passing
 * status instead of leaving a stale gate on screen.
 */
export function startVerificationFromToast(): void {
    startVerification()
        .then((r) => {
            if (r.outcome === "already-verified") window.location.reload()
            return r
        })
        .catch((e: unknown) => {
            toast.error(verificationErrorMessage(e))
        })
}
