// The ACCOUNT-level domain registrar (cloud-be-go: apps/domains/accountdomains).
//
// Distinct from domains.types.ts, and the distinction is the whole feature. A
// `Domain` there is a HOSTNAME — one row per name the edge answers for, always
// belonging to a resource. A `RegisteredDomain` here is a DOMAIN an account has
// proven it owns, which belongs to nothing yet and usually points nowhere at the
// moment it is created.
//
// Proving one authorises the account for that name AND every subdomain of it, so
// attaching api.example.com after registering example.com needs no second TXT
// record.

/** pending → the TXT record has not been seen yet; failed → we stopped checking
 *  (recoverable: the check-now button puts it back to pending). */
export type RegisteredDomainStatus = "pending" | "verified" | "failed"

/** The single TXT record that proves ownership. */
export interface VerificationRecord {
  type: "TXT"
  name: string
  value: string
}

/**
 * Where to point a name once ownership is proven. Both are always given: a
 * subdomain takes the CNAME, an apex cannot carry one and takes the A instead.
 */
export interface RoutingInstructions {
  cname_target: string
  a_value: string
}

/** One hostname the platform is currently serving under a registered domain. */
export interface AttachedHostname {
  hostname: string
  status: string
  resource_type: string
  resource_id: string
}

export interface RegisteredDomain {
  id: string
  account_id: string
  domain: string
  status: RegisteredDomainStatus
  /** The tenant's own token — it is the value they publish, not a secret from them. */
  verification_token: string
  verification_method: string
  verified_at?: string
  last_checked_at?: string
  attempts: number
  /** What the last failed check tripped on, in DNS's own words. */
  last_error?: string
  created_at: string
  updated_at: string

  // Derived server-side, never stored.
  verification: VerificationRecord
  routing: RoutingInstructions
  /** Empty for a domain proven but not yet attached — the ordinary state. */
  hostnames: AttachedHostname[]
}

/** POST /domains/registrar */
export interface RegisterDomainRequest {
  domain: string
}
