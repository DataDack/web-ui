/**
 * "Skip verification for now" — the single escape hatch out of the mandatory
 * KYC gate (see components/RequireKyc). The console pushes every unverified
 * user to /onboarding/kyc; pressing skip records it here and lets them into the
 * console anyway.
 *
 * Deliberately sessionStorage, not localStorage: "for now" means this browser
 * session. The next sign-in prompts again, and the backend kycguard still
 * blocks resource creation regardless — so a skip costs nothing but a nag.
 */
const KEY_PREFIX = "kyc-skip:"

// Per user: a shared machine must not let one user's skip carry into another's
// session.
const key = (userId: string) => `${KEY_PREFIX}${userId}`

/** True when this user pressed "Skip for now" earlier in this session. */
export function isKycSkipped(userId: string): boolean {
    if (!userId) return false
    try {
        return sessionStorage.getItem(key(userId)) === "1"
    } catch {
        // Storage disabled (private mode / blocked cookies) — treat as not
        // skipped; the user can still skip, they just get re-prompted.
        return false
    }
}

/** Record the skip so the gate lets this user through for the rest of the session. */
export function skipKycForNow(userId: string): void {
    if (!userId) return
    try {
        sessionStorage.setItem(key(userId), "1")
    } catch {
        // ignore — worst case the gate re-prompts on the next navigation
    }
}

/** Drop the skip (e.g. once verification completes) so the gate re-evaluates. */
export function clearKycSkip(userId: string): void {
    if (!userId) return
    try {
        sessionStorage.removeItem(key(userId))
    } catch {
        // ignore
    }
}
