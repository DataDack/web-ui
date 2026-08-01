import { apiGet, apiPost } from "@/services/api/client"

import type {
    CompleteOnboardingRequest,
    OnboardingStatusResponse,
    OTPSentResponse,
    StartKYCResponse,
    TenancyContext,
} from "./onboarding.types"

export const onboardingApi = {
    status: () => apiGet<OnboardingStatusResponse>("/auth/onboarding/status"),
    sendEmailOTP: () => apiPost<OTPSentResponse>("/auth/onboarding/verify-email/send"),
    confirmEmailOTP: (otp: string) =>
        apiPost<null>("/auth/onboarding/verify-email/confirm", { otp }),
    sendPhoneOTP: (phone: string) =>
        apiPost<OTPSentResponse>("/auth/onboarding/verify-phone/send", { phone }),
    confirmPhoneOTP: (otp: string) =>
        apiPost<null>("/auth/onboarding/verify-phone/confirm", { otp }),
    setAccountType: (userType: "individual" | "business") =>
        apiPost<null>("/auth/onboarding/account-type", { user_type: userType }),
    complete: (payload: CompleteOnboardingRequest) =>
        apiPost<TenancyContext>("/auth/onboarding/complete", payload),
    /** Opens (or resumes) an identity-verification session. The backend reuses a
     *  still-fresh session rather than creating duplicates, so calling this twice
     *  is safe. 503 = KYC service outage (retry later), 400 = refusal (not
     *  enabled / already verified). */
    startKyc: () => apiPost<StartKYCResponse>("/auth/onboarding/kyc/start"),
}
