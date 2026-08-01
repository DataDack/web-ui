/**
 * Accounts are the billing + IAM boundary inside an organization (AWS Account /
 * Azure Subscription). An organization can hold many accounts; the console is
 * scoped to one at a time via the X-Account-Id header. These types back the
 * in-org account switcher and the Accounts console.
 */

/** Lifecycle state of an account. */
export type AccountStatus = "active" | "suspended" | "closed"

/** A caller's base membership role within an account. */
export type AccountMemberRole = "owner" | "admin" | "member" | "billing" | "viewer"

/** The optional 1:1 business organization linked to an account (business only). */
export interface AccountOrganization {
  id: string
  name: string
}

/**
 * One account the signed-in user can act in — their own plus any they were
 * invited into — for the account-first tenant switcher. `is_owner` marks the
 * caller's home/owned account (the switcher lands here first); `organization` is
 * present only for business accounts. Returned by GET /org/accounts/me.
 */
export interface MyAccount {
  id: string
  account_number: string
  name: string
  status: AccountStatus
  /** True for the account this user owns (their home account). */
  is_owner: boolean
  /** The caller's role in this account, or "" when they hold no membership. */
  member_role: AccountMemberRole | ""
  /** The 1:1 business org, or undefined for an individual account. */
  organization?: AccountOrganization
}

/**
 * An account member joined with the user's identity (GET
 * /org/accounts/{id}/members). name/email are empty when the user record is
 * missing (e.g. deleted).
 */
export interface AccountMember {
  id: string
  user_id: string
  member_role: AccountMemberRole
  name: string
  email: string
}

/** Create an additional account in the caller's current org (POST /provision). */
export interface ProvisionAccountPayload {
  name: string
}

/**
 * The newly provisioned account, shaped so the switcher can adopt it as
 * X-Account-Id to switch into it.
 */
export interface ProvisionedAccount {
  account_id: string
  account_number: string
  name: string
}

/** Editable account fields (PUT /org/accounts/{id}): rename and/or lifecycle. */
export interface UpdateAccountPayload {
  name?: string
  status?: AccountStatus
}

/**
 * An account's postal/contact address (stored on its KYC profile). Present for
 * individual and business accounts alike; editable before full KYC.
 */
export interface AccountAddress {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  /** ISO 3166-1 alpha-2, e.g. "IN". */
  country: string
}

/**
 * The account's contact/verification snapshot (GET /org/accounts/{id}/profile).
 * Powers inline address editing and the "convert to business" affordance on the
 * Account settings page.
 */
export interface AccountProfile {
  user_type: "individual" | "business"
  kyc_completed: boolean
  /** True when the holder must (re-)verify with the external KYC service. */
  need_actions: boolean
  has_organization: boolean
  legal_name: string
  address: AccountAddress | null
}

/** Upsert an account's contact address (PUT /org/accounts/{id}/address). */
export interface UpdateAddressPayload {
  legal_name?: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country: string
}

/**
 * Convert an individual account to a business account
 * (POST /org/accounts/{id}/convert-to-business): organization details + a fresh
 * business-KYC snapshot. The account is flagged for re-verification afterwards.
 */
export interface ConvertToBusinessPayload {
  org_name: string
  billing_email?: string
  country: string
  legal_name: string
  date_of_birth?: string
  pan?: string
  gstin?: string
  cin?: string
  tax_id?: string
  national_id?: string
  registration_number?: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
}

/** Acknowledgement that a transfer confirmation OTP was issued. */
export interface TransferOTPSent {
  channel: string
  /** Present only outside production, so the flow is testable without a mailbox. */
  dev_otp?: string
  /** Seconds until another code can be requested — seeds the resend cooldown. */
  resend_in: number
}

/**
 * An in-flight ownership transfer awaiting a code. Lets the UI resume the
 * code-entry step after its dialog was closed, instead of stranding the flow.
 */
export interface PendingTransfer {
  pending: boolean
  target_email?: string
  /** Seconds until the emailed code expires. */
  expires_in: number
  /** Seconds until a resend is allowed (0 = allowed now). */
  resend_in: number
  /** Remaining wrong-code attempts before the code is burned. */
  attempts_left: number
}
