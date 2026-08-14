// Shapes mirror cloud-be-go's domain registry (platform_domains): one row per
// hostname the platform answers for, tenant- or platform-provided.

/** What kind of resource the hostname routes to. */
export type DomainType = "func" | "vm" | "lb" | "app"

// pending → DNS/routing still being realized; released → the hostname has been
// given back and the row is only history.
export type DomainStatus = "pending" | "active" | "suspended" | "released"

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
  /** Present only on superadmin rows (GET /domains/registry/admin). */
  account_name?: string
  account_number?: string
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

/** The admin list takes the same params plus an account scope. */
export interface AdminDomainListParams extends DomainListParams {
  account_id?: string
}

/** A page of rows plus the platform/account-wide total off the list meta. */
export interface DomainList {
  rows: Domain[]
  total: number
}
