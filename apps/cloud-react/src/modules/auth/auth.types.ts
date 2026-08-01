import type { MyAccount } from "@/modules/accounts/accounts.types"
import type { MyOrganization } from "@/modules/organizations/organizations.types"

export type OnboardingStatus = "registered" | "email_verified" | "type_selected" | "completed"

export type UserType = "" | "individual" | "business"

export interface UserProfile {
    id: string
    name: string
    email: string
    role: string
    /** Platform super admin (catalog/infra control plane), orthogonal to org/account membership. */
    is_super_admin: boolean
    is_active: boolean
    user_type: UserType
    country: string
    onboarding_status: OnboardingStatus
    /** True when the user must (re-)verify with the external KYC service. */
    need_actions: boolean
    kyc_completed: boolean
    kyc_version: number | null
    kyc_completed_at: string | null
    organization_id: string
    /** Mobile number ("" for legacy users who signed up before it was collected). */
    phone: string
    email_verified: boolean
    phone_verified: boolean
    accounts?: MyAccount[]
    organizations?: MyOrganization[]
}

export interface AuthTokenResponse {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: UserProfile
}

export interface OAuthTokenResponse {
    access_token: string
    refresh_token?: string
    token_type: "Bearer"
    expires_in: number
}

export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    name: string
    email: string
    password: string
}

export type OAuthProvider = "google" | "microsoft"

/** Non-committal preview of the account an OIDC ID token would create — returned
 *  by /auth/users/oauth/:provider/preview without creating or signing anyone in. */
export interface OAuthPreview {
    provider: OAuthProvider
    name: string
    email: string
    picture: string
    is_new_user: boolean
}

/** Response after requesting an email login code. */
export interface LoginOtpSentResponse {
    channel: string
}
