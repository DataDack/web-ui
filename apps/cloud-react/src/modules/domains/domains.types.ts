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
  /** Present on CUSTOM rows only (list/get/create/verify responses). */
  verification?: DomainVerification
  dns_instructions?: DomainDnsInstructions
}

/** POST /domains/registry — attach the tenant's own hostname to a resource. */
export interface CreateDomainRequest {
  hostname: string
  resource_type: string
  resource_id: string
}

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
