import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { AUTH_QUERY_KEYS } from "@/modules/auth/auth.constants"

import { onboardingApi } from "./onboarding.api"
import type { CompleteOnboardingRequest } from "./onboarding.types"
import { startVerification } from "./start-verification"

export const ONBOARDING_QUERY_KEYS = {
    status: ["onboarding", "status"] as const,
}

export function useOnboardingStatus() {
    return useQuery({
        queryKey: ONBOARDING_QUERY_KEYS.status,
        queryFn: onboardingApi.status,
    })
}

/** Refresh both the onboarding status and the auth session (so the gate sees
 *  the new onboarding_status) after a step completes. */
function useInvalidateOnboarding() {
    const qc = useQueryClient()
    return () => {
        void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEYS.status })
        void qc.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session })
    }
}

export function useSendEmailOTP() {
    return useMutation({ mutationFn: onboardingApi.sendEmailOTP })
}

export function useConfirmEmailOTP() {
    const invalidate = useInvalidateOnboarding()
    return useMutation({
        mutationFn: (otp: string) => onboardingApi.confirmEmailOTP(otp),
        onSuccess: invalidate,
    })
}

/** Sending the code also SAVES the number on the user (which is what the
 *  complete gate requires) — refresh so the flow sees it immediately. */
export function useSendPhoneOTP() {
    const invalidate = useInvalidateOnboarding()
    return useMutation({
        mutationFn: (phone: string) => onboardingApi.sendPhoneOTP(phone),
        onSuccess: invalidate,
    })
}

export function useConfirmPhoneOTP() {
    const invalidate = useInvalidateOnboarding()
    return useMutation({
        mutationFn: (otp: string) => onboardingApi.confirmPhoneOTP(otp),
        onSuccess: invalidate,
    })
}

export function useSetAccountType() {
    const invalidate = useInvalidateOnboarding()
    return useMutation({
        mutationFn: (t: "individual" | "business") => onboardingApi.setAccountType(t),
        onSuccess: invalidate,
    })
}

export function useCompleteOnboarding() {
    const invalidate = useInvalidateOnboarding()
    return useMutation({
        mutationFn: (payload: CompleteOnboardingRequest) => onboardingApi.complete(payload),
        onSuccess: invalidate,
    })
}

/**
 * Open a verification session and redirect to the provider.
 *
 * The success path normally never settles into a rendered state — the browser
 * is already navigating away — so `isPending` doubles as "redirecting" and the
 * button should stay disabled until the page unloads. The one case that does
 * come back is `already-verified` (backend reconciled a lost webhook), where
 * refreshing the status flips the page to its verified state.
 */
export function useStartKyc() {
    const invalidate = useInvalidateOnboarding()
    return useMutation({
        mutationFn: startVerification,
        onSuccess: (result) => {
            if (result.outcome === "already-verified") invalidate()
        },
    })
}
