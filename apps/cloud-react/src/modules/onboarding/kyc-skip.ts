/**
 * "Skip verification for now" — the single escape hatch out of the mandatory
 * KYC gate (see components/RequireKyc). The console pushes every unverified
 * user to /onboarding/kyc; pressing skip records it here and lets them into the
 * console anyway.
 *
 * The skip survives refreshes and browser restarts for four hours. The backend
 * kycguard still blocks resource creation regardless, so this only controls
 * when the console asks again.
 */
const KEY_PREFIX = "kyc-skip:"
const SKIP_DURATION_MS = 4 * 60 * 60 * 1000

// Per user: a shared machine must not let one user's skip carry into another's
// session.
const key = (userId: string) => `${KEY_PREFIX}${userId}`

/** True while this user's four-hour skip window is still active. */
export function isKycSkipped(userId: string): boolean {
  if (!userId) return false
  try {
    const storageKey = key(userId)
    const expiresAt = Number(localStorage.getItem(storageKey))
    if (Number.isFinite(expiresAt) && expiresAt > Date.now()) return true

    // Expired and legacy/malformed values should not linger indefinitely.
    localStorage.removeItem(storageKey)
    return false
  } catch {
    // Storage disabled (private mode / blocked cookies) — treat as not
    // skipped; the user can still skip, they just get re-prompted.
    return false
  }
}

/** Record the skip so the gate lets this user through for the next four hours. */
export function skipKycForNow(userId: string): void {
  if (!userId) return
  try {
    localStorage.setItem(key(userId), String(Date.now() + SKIP_DURATION_MS))
  } catch {
    // ignore — worst case the gate re-prompts on the next navigation
  }
}

/** Drop the skip (e.g. once verification completes) so the gate re-evaluates. */
export function clearKycSkip(userId: string): void {
  if (!userId) return
  try {
    localStorage.removeItem(key(userId))
    // Remove values written by versions that stored a session-only boolean.
    sessionStorage.removeItem(key(userId))
  } catch {
    // ignore
  }
}
