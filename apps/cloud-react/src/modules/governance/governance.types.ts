/** The account-wide naming convention a name must satisfy. A thin wrapper around
 * the single regex so resource create forms can keep calling `namingNameSchema(rule)`
 * unchanged. */
export interface NamingRule {
  /** the regular expression every resource name must match */
  pattern: string
}

/** Effective convention returned by GET /org/naming-policy (scoped to the caller's active account). */
export interface NamingPolicy {
  accountId: string
  /** the single regex applied to every resource in the account */
  namingConvention: string
  /** true when the account has not saved its own and the platform default is in effect */
  isDefault: boolean
}
