/**
 * One organization the signed-in user can reach, paired with the account that
 * scopes the console while this org is active (sent as X-Account-Id). Returned
 * by GET /org/organizations/me, ordered home-org first.
 */
export interface MyOrganization {
  organization_id: string
  organization_name: string
  organization_slug: string
  account_id: string
  account_number: string
  account_name: string
  /** The caller's role in the resolved account (owner | admin | member | …). */
  member_role: string
  /** True for the user's home organization. */
  is_home: boolean
}

/** Lifecycle state of an organization. */
export type OrganizationStatus = "active" | "suspended" | "closed"

/**
 * Postal address invoices are addressed to. Seeded from the KYC address when the
 * organization is provisioned, then editable independently from Organization
 * Settings — so it may match or diverge from the regulatory KYC address.
 */
export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  /** ISO 3166-1 alpha-2 country code (e.g. "IN"). */
  country: string
}

/**
 * The full organization record, returned by GET /org/organizations/{id}. The id
 * is normalized to a string at the API boundary (the backend serves it as a
 * number). billing_address is null until the backend seeds/stores one.
 */
export interface Organization {
  id: string
  name: string
  slug: string
  billing_email: string
  billing_address: BillingAddress | null
  /** India GST identification number ("" when not provided). */
  gstin?: string
  /** India Tax Deduction Account Number ("" when not provided). */
  tan?: string
  status: OrganizationStatus
  created_at: string
  updated_at: string
}

/**
 * Editable organization fields (PUT /org/organizations/{id}). Slug is immutable
 * server-side, so it is intentionally absent here. billing_address is optional so
 * a details-only save need not resend it.
 */
export interface UpdateOrganizationPayload {
  name: string
  billing_email: string
  billing_address?: BillingAddress | null
  gstin?: string
  tan?: string
  status?: OrganizationStatus
}

/**
 * Create a brand-new organization the caller will own (POST
 * /org/organizations/provision). Only the name is required; the slug is derived
 * server-side and the billing email defaults to the caller's email when omitted.
 */
export interface ProvisionOrganizationPayload {
  name: string
  billing_email?: string
  user_type?: "individual" | "business"
  /** Records the owner's Privacy Policy + Terms acceptance on the new account. */
  accept_terms?: boolean
  gstin?: string
  tan?: string
  billing_address?: BillingAddress
}

/**
 * The newly provisioned org plus the default account to adopt as X-Account-Id to
 * switch into it — shaped like a MyOrganization entry so the switcher can reuse it.
 */
export interface ProvisionedOrganization {
  organization_id: string
  organization_name: string
  organization_slug: string
  account_id: string
  account_number: string
}
