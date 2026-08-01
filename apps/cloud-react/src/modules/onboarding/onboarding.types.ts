import type { OnboardingStatus, UserType } from "@/modules/auth/auth.types"

export interface OTPSentResponse {
  channel: string
  dev_otp?: string
}

export interface TenancyContext {
  organization_id: string
  organization_name: string
  account_id: string
  account_number: string
  resource_group_id: string
  resource_group: string
  vpc_id: string
  vpc_name: string
  vpc_cidr: string
  subnet_id: string
  security_group_id: string
  region: string
}

/** USER-level verification state, owned by the external KYC microservice.
 *  Drives the read-only verification page and the re-verify banner. */
export interface KYCState {
  /** False when the platform has no KYC service configured — the verification
   *  flow is hidden entirely (no banners, buttons or sections). */
  enabled: boolean
  /** Post-consent landing page configured on the backend (USER_KYC_VERIFY_PAGE_URL),
   *  sent to the KYC service as its `redirect_url`. NOT where verification starts —
   *  that URL is per-session and only comes from POST /kyc/start. Often absent. */
  verification_url?: string
  /** True when the user must (re-)verify with the external KYC service. */
  need_actions: boolean
  completed: boolean
  version?: number
  completed_at?: string
}

/** Outcome of POST /kyc/start — a verification session with the external KYC
 *  service. `authorization_url` is where the user must be redirected for the
 *  provider consent flow; the verdict itself arrives later on the KYC webhook,
 *  never on this response.
 *
 *  One exception: when the backend finds an already-VERIFIED verification whose
 *  webhook was lost it applies the completion itself and answers
 *  status=VERIFIED with an EMPTY authorization_url — nothing to redirect to,
 *  just refresh the status. */
export interface StartKYCResponse {
  verification_id: string
  status: "INITIATED" | "PROCESSING" | "VERIFIED" | "FAILED"
  authorization_url: string
}

export interface OnboardingStatusResponse {
  onboarding_status: OnboardingStatus
  user_type: UserType
  name: string
  email: string
  email_verified: boolean
  phone_verified: boolean
  kyc?: KYCState
  tenancy?: TenancyContext
}

/** Payload for the signup-first /complete: account type + (for organization
 *  accounts) just the organization name. KYC is NOT part of onboarding. */
export interface CompleteOnboardingRequest {
  account_type: "individual" | "business"
  organization_name?: string
  /** Records the owner's Privacy Policy + Terms acceptance on the new account. */
  accept_terms?: boolean
}
