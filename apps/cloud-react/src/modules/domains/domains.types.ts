// Shapes mirror cloud-be-go's domain registry (platform_domains): one row per
// hostname the platform answers for, tenant- or platform-provided.

/** What kind of resource the hostname routes to. */
export type DomainType = "func" | "vm" | "lb" | "app"

// pending → DNS/routing still being realized; released → the hostname has been
// given back and the row is only history.
export type DomainStatus = "pending" | "active" | "suspended" | "released"

/** Live ownership-check state — present on CUSTOM rows only. */
export interface DomainVerification {
  verified: boolean
  verified_at?: string
  last_checked_at?: string
  attempts: number
  /** What the last failed check tripped on, human-readable. */
  last_error?: string
}

/**
 * The records the tenant must create at their registrar — present on CUSTOM
 * rows only. TXT proves ownership; then either the CNAME (subdomain) or the
 * A record (is_apex — apex domains cannot CNAME) routes the traffic.
 */
export interface DomainDnsInstructions {
  txt_name: string
  txt_value: string
  cname_name: string
  cname_target: string
  a_name: string
  a_value: string
  is_apex: boolean
  /**
   * The account already proved this hostname's parent domain in the registrar,
   * so only the routing record is required — the server checks routing alone for
   * this hostname. The TXT fields are still sent (publishing it anyway is not
   * wrong), but the UI must not present it as a required step.
   */
  ownership_proven: boolean
}

/**
 * A hostname that answers 3xx instead of serving its resource.
 *
 * `to` is a HOSTNAME, never a URL — the edge builds `https://<to><path>` itself,
 * which is what stops a stored redirect from becoming an open one. The path and
 * query are carried across unless `drop_path` says otherwise.
 */
export interface DomainRedirect {
  to: string
  /** 301, 302, 307 or 308 — resolved by the server, so never 0 on a read. */
  status: number
  drop_path?: boolean
}

/**
 * What the edge does with a request beyond where to send it.
 *
 * Only `redirect` is a tenant's to write, and only through its own endpoints —
 * the same document carries the WAF an operator configured and the static
 * release the build publisher writes. There is deliberately no "save the whole
 * policy" call in this client.
 */
export interface DomainPolicy {
  redirect?: DomainRedirect
}

export interface Domain {
  id: string
  hostname: string
  label: string
  zone: string
  type: DomainType
  /** true = SYSTEM-provided hostname; false = the tenant's own CUSTOM domain. */
  managed: boolean
  version: number
  resource_group_id: string | null
  region: string
  resource_type: string
  resource_id: string
  is_primary: boolean
  target: string
  public_ip: string
  private_ip: string
  port: number
  function_name: string
  status: DomainStatus
  status_reason?: string
  assigned_at?: string
  activated_at?: string
  dns_mode: string
  dns_synced_ip?: string
  dns_synced_at?: string
  dns_error?: string
  account_id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  /** Edge policy. Absent on almost every row — see DomainPolicy. */
  policy?: DomainPolicy
  /** Present on CUSTOM rows only (list/get/create/verify responses). */
  verification?: DomainVerification
  dns_instructions?: DomainDnsInstructions
}

/**
 * Which kind of name is being claimed.
 *
 * `internal` is another hostname in the platform's own zone: nothing to prove
 * and nothing to publish, so the row comes back already serving. `external` is
 * a domain the tenant owns, which starts pending with DNS records to create.
 */
export type DomainClaimKind = "internal" | "external"

/** POST /domains/registry — attach another hostname to a resource. */
export interface CreateDomainRequest {
  /** A domain the tenant owns (external), or a bare label (internal). */
  hostname: string
  resource_type: string
  resource_id: string
  /** Omitted means external — the server's own default, kept for old clients. */
  kind?: DomainClaimKind
}

/** PUT /domains/registry/:hostname/redirect */
export interface SetDomainRedirectRequest {
  hostname: string
  to: string
  /** Omit to take the platform default (308), which preserves the method. */
  status?: number
  drop_path?: boolean
}

/** The redirect status codes the platform accepts, with what each one means. */
export const REDIRECT_STATUSES = [
  {
    value: 308,
    label: "308 Permanent",
    hint: "Permanent, and keeps the request method. The safe default.",
  },
  {
    value: 307,
    label: "307 Temporary",
    hint: "Temporary, and keeps the request method.",
  },
  {
    value: 301,
    label: "301 Moved permanently",
    hint: "Permanent. Browsers may turn a POST into a GET and drop its body.",
  },
  {
    value: 302,
    label: "302 Found",
    hint: "Temporary. Browsers may turn a POST into a GET and drop its body.",
  },
] as const

/** Query params for the tenant list — only set values are sent. */
export interface DomainListParams {
  page?: number
  limit?: number
  type?: DomainType
  /** true = System, false = Custom, absent = both. */
  managed?: boolean
  status?: DomainStatus
  resource_type?: string
  resource_id?: string
  q?: string
}

/** A page of rows plus the platform/account-wide total off the list meta. */
export interface DomainList {
  rows: Domain[]
  total: number
}
