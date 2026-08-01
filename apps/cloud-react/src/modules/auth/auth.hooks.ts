import { useMutation, useQueryClient } from "@tanstack/react-query"

import { extractError } from "@/services/api/client"

import { authApi } from "./auth.api"
import { AUTH_QUERY_KEYS } from "./auth.constants"
import { useAuth } from "./auth.context"
import type { LoginRequest, OAuthProvider, RegisterRequest, UserProfile } from "./auth.types"

export function useLogin() {
    const { authenticate } = useAuth()
    return useMutation({
        mutationFn: (payload: LoginRequest) => authApi.login(payload),
        onSuccess: authenticate,
    })
}

export function useRegister() {
    const { authenticate } = useAuth()
    return useMutation({
        mutationFn: (payload: RegisterRequest) => authApi.register(payload),
        onSuccess: authenticate,
    })
}

/** Verify an OIDC ID token and preview the account it would create — used to
 *  show the "confirm the account you're creating" step before signing up. */
export function usePreviewOAuth() {
    return useMutation({
        mutationFn: ({ provider, token }: { provider: OAuthProvider; token: string }) =>
            authApi.oauthPreview(provider, token),
    })
}

/** Payload for a provider sign-in. `phone` is required by the API only when the
 *  sign-in creates a new account; it is ignored for a returning user. */
interface OAuthSignInVars {
    token: string
    acceptPolicies?: boolean
    phone?: string
}

export function useGoogleSignIn() {
    const { authenticate } = useAuth()
    return useMutation({
        mutationFn: ({ token, acceptPolicies, phone }: OAuthSignInVars) =>
            authApi.oauthSignIn("google", token, acceptPolicies, phone),
        onSuccess: authenticate,
    })
}

export function useMicrosoftSignIn() {
    const { authenticate } = useAuth()
    return useMutation({
        mutationFn: ({ token, acceptPolicies, phone }: OAuthSignInVars) =>
            authApi.oauthSignIn("microsoft", token, acceptPolicies, phone),
        onSuccess: authenticate,
    })
}

export function useSendLoginOtp() {
    return useMutation({
        mutationFn: (email: string) => authApi.sendLoginOTP(email),
    })
}

export function useVerifyLoginOtp() {
    const { authenticate } = useAuth()
    return useMutation({
        mutationFn: ({
            email,
            otp,
            acceptPolicies,
            phone,
        }: {
            email: string
            otp: string
            acceptPolicies?: boolean
            /** Required by the backend when the verify creates a new account. */
            phone?: string
        }) => authApi.verifyLoginOTP(email, otp, acceptPolicies, phone),
        onSuccess: authenticate,
    })
}

/** Set the current user's display name (used right after OTP signup). Keeps the
 * cached session in sync so the rest of the app sees the new name immediately. */
export function useUpdateProfile() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (name: string) => authApi.updateProfile(name),
        onSuccess: (user: UserProfile) => {
            queryClient.setQueryData(AUTH_QUERY_KEYS.session, user)
        },
    })
}

/** Set the current user's mobile number (the add-mobile prompt for legacy users).
 * Seeds the session cache so `user.phone` is populated immediately and the prompt
 * stops showing. */
export function useUpdatePhone() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (phone: string) => authApi.updatePhone(phone),
        onSuccess: (user: UserProfile) => {
            queryClient.setQueryData(AUTH_QUERY_KEYS.session, user)
        },
    })
}

export { extractError }
