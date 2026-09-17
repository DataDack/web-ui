// Certificate manager — cloud-be-go app "domains", module "certificates".
//
// A certificate is a projection of what the platform's certificate store holds,
// not something this console creates directly: the platform orders and renews
// most of them, and the rest are ones the tenant imported. `source` is what
// decides which actions apply, and the server states the answer on every row
// (`deletable`, `renewable`) so the client never has to re-derive the rules.

/** platform: DataDack's own wildcard · managed: obtained for your domain · imported: yours */
export type CertificateSource = "platform" | "managed" | "imported"

export type CertificateStatus = "issued" | "pending_validation" | "expiring" | "expired" | "failed"

/** The list filter adds one shorthand: expiring OR expired. */
export type CertificateStatusFilter = CertificateStatus | "expiring_soon"

export interface CertificateHostname {
  hostname: string
  status: string
  resource_type?: string
  resource_id?: string
  managed: boolean
}

export interface Certificate {
  id: string
  subject: string
  sans: string[]
  source: CertificateSource
  status: CertificateStatus
  serial?: string
  issuer_cn?: string
  key_algorithm?: string
  signature_algorithm?: string
  fingerprint_sha256?: string
  chain_length?: number
  not_before?: string
  not_after?: string
  requested_at?: string
  issued_at?: string
  auto_renew: boolean
  last_error?: string
  /** Server clock, negative once expired. 0 for a request with no certificate yet. */
  days_remaining: number
  wildcard: boolean
  deletable: boolean
  renewable: boolean
  /** Detail read only. */
  in_use_by?: CertificateHostname[]
}

export interface CertificateList {
  rows: Certificate[]
  total: number
}

export interface CertificateListParams {
  page: number
  limit: number
  source?: CertificateSource
  status?: CertificateStatusFilter
  q?: string
}

export interface CertificateSummary {
  total: number
  issued: number
  expiring: number
  expired: number
  pending: number
  imported: number
  /** Zones DataDack's own wildcard already covers — hostnames there need nothing. */
  platform_zones: string[]
  issuer_enabled: boolean
  store_ready: boolean
}

export interface ImportCertificateRequest {
  certificate: string
  chain: string
  private_key: string
}

export interface ImportCertificateResult {
  certificate: Certificate
  hostnames: string[]
  warnings?: string[]
}
