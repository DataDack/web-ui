import type { ReactElement, ReactNode } from "react"

import { Navigate, useLocation } from "react-router-dom"

import { AuthCardSkeleton } from "@/components/console/feedback/Skeletons"
import { useAuth } from "@/modules/auth/auth.context"

import { isKycSkipped } from "../kyc-skip"
import { useOnboardingStatus } from "../onboarding.hooks"

/**
 * Mandatory-verification gate. The backend kycguard already refuses to create
 * billable resources for an unverified owner (403 + kyc_required), but that
 * only bites on submit — the console itself let unverified users roam. This
 * gate makes verification the default destination: an authenticated, onboarded
 * user whose KYC is missing or flagged for renewal is sent to /onboarding/kyc
 * and stays there until they either verify or explicitly press "Skip for now"
 * (recorded per session by kyc-skip).
 *
 * Fails OPEN — while the status is loading we hold a skeleton, but a failed
 * lookup, a disabled KYC service (no external KYC configured) or a missing kyc
 * block lets the user through. Locking the console on a transient error would
 * be worse than the 403 the backend still enforces.
 */
export function RequireKyc({ children }: Readonly<{ children: ReactNode }>): ReactElement {
    const { user } = useAuth()
    const { data: status, isLoading, isError } = useOnboardingStatus()
    const location = useLocation()

    if (isLoading) return <AuthCardSkeleton />

    const kyc = status?.kyc
    // Nothing to enforce: lookup failed, or the platform runs without a KYC
    // service (kycguard is open too in that case).
    if (isError || !kyc?.enabled) return children as ReactElement

    const verified = kyc.completed && !kyc.need_actions
    if (verified || isKycSkipped(user?.id ?? "")) return children as ReactElement

    // `from` lets the verification page send the user back where they were
    // aiming once they verify or skip.
    return <Navigate to="/onboarding/kyc" replace state={{ from: location.pathname }} />
}
