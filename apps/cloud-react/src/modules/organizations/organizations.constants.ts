export const ORG_QUERY_KEYS = {
  /** Organizations the current user can switch between. */
  mine: ["org", "mine"] as const,
  /** A single organization's full record. */
  detail: (id: string) => ["org", "detail", id] as const,
}

export const ORG_ROUTES = {
  /** Account settings (the active account + its optional business profile). */
  SETTINGS: "/manage-account/account",
  /** Full-screen onboarding to create a brand-new organization the caller owns. */
  CREATE: "/organization/new",
  /** Update the signed-in user's own profile. */
  PROFILE: "/manage-account/profile",
} as const

/**
 * Account-membership roles that may administer the organization (edit settings,
 * billing address, etc.). Org authority lives in the membership role, NOT the
 * flat user role — every org owner carries the flat "user" role. The platform
 * super admin is always permitted in addition to these. Mirrors the backend
 * authorization on PUT /org/organizations/{id} (canManageOrg).
 */
export const ORG_MANAGER_ROLES = ["owner", "admin"]
