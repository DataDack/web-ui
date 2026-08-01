export const ACCOUNT_QUERY_KEYS = {
  /** Accounts the caller can act in — their own + invited (the switcher + console). */
  mine: ["accounts", "mine"] as const,
  /** A single account's members. */
  members: (id: string) => ["accounts", "members", id] as const,
  /** A single account's contact/verification profile (address + KYC status). */
  profile: (id: string) => ["accounts", "profile", id] as const,
  /** Whether an ownership transfer is pending for an account (resumable flow). */
  transferPending: (id: string) => ["accounts", "transfer-pending", id] as const,
}

export const ACCOUNT_ROUTES = {
  /** Accounts console — list + create within the active org. */
  ROOT: "/accounts",
  DETAIL: "/accounts/:id",
  detail: (id: string) => `/accounts/${id}`,
} as const

/**
 * Account-membership roles that may administer accounts in the organization
 * (create, rename, change status, set default). Authority lives in the
 * membership role, NOT the flat user role — every org owner carries the flat
 * "user" role. The platform super admin is always permitted in addition. Mirrors
 * the backend authorization (canManageOrg) on the accounts endpoints.
 */
export const ACCOUNT_MANAGER_ROLES = ["owner", "admin"]
