export const AUTH_ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
} as const

export const AUTH_QUERY_KEYS = {
  session: ["auth", "session"] as const,
}

/** Public legal policies the user accepts at signup / account creation. */
export const POLICY_URLS = {
  privacy: "https://policies.datadack.cloud/privacy",
  terms: "https://policies.datadack.cloud/terms",
} as const
