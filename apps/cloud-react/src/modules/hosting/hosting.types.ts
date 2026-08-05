// Shared-hosting types. These mirror the Go DTOs in cloud-be-go/apps/hosting —
// keep the two in step when either changes.

/* ── Provisioning modules ──────────────────────────────────────────────── */

export type ModuleFieldType = "text" | "password" | "number" | "checkbox"

export interface ModuleField {
  key: string
  label: string
  type: ModuleFieldType
  required: boolean
  default?: string
  help?: string
}

/**
 * A module's self-description. The server form renders `fields` and an
 * account's action buttons come from `capabilities`, so adding a control panel
 * to the backend needs no change here.
 */
export interface HostingModule {
  key: string
  label: string
  description: string
  default_port: number
  fields: ModuleField[]
  capabilities: string[]
}

export const CAPABILITY = {
  create: "create",
  suspend: "suspend",
  unsuspend: "unsuspend",
  terminate: "terminate",
  changePackage: "changepackage",
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- a capability name the backend declares, not a credential
  changePassword: "changepassword",
  usage: "usage",
  sso: "sso",
  listPackages: "listpackages",
} as const

/* ── Servers ───────────────────────────────────────────────────────────── */

export interface Nameserver {
  host: string
  ip: string
}

export interface SSOAllowList {
  roles: string[]
  users: string[]
}

export type ServerStatus = "ACTIVE" | "FULL" | "MAINTENANCE" | "UNREACHABLE"
export type FillMode = "fill" | "least_full" | "round_robin"

export interface HostingServer {
  id: string
  name: string
  hostname: string
  ip_address: string
  assigned_ips: string[]
  monthly_cost: number
  datacenter: string
  /** 0 means unlimited, matching the WHMCS field where an empty box is no cap. */
  max_accounts: number
  status_url: string
  disabled: boolean
  nameservers: Nameserver[]

  module_key: string
  username: string
  secure: boolean
  port: number

  sso_access: "unrestricted" | "restricted"
  sso_allowed: SSOAllowList

  group_id: string | null
  status: ServerStatus
  allocated_accounts: number
  last_allocated_at: string | null
  last_probe_at: string | null
  probe_version: string
  probe_error: string
  tls_insecure: boolean
  consecutive_failures: number

  created_at: string
  updated_at: string

  /* Derived, server-side */
  has_password: boolean
  has_api_token: boolean
  live_accounts: number
  group_name: string
  /** -1 when the server has no ceiling. */
  usage_pct: number
  allocatable: boolean
}

/**
 * Credentials are pointers on the wire: omitted means "leave unchanged".
 * The form never receives the stored secrets back, so it sends them only when
 * the operator actually typed something.
 */
export interface SaveServerRequest {
  name: string
  hostname: string
  ip_address: string
  assigned_ips: string[]
  monthly_cost: number
  datacenter: string
  max_accounts: number
  status_url: string
  disabled: boolean
  nameservers: Nameserver[]

  module_key: string
  username: string
  password?: string
  api_token?: string
  secure?: boolean
  port: number

  sso_access: "unrestricted" | "restricted"
  sso_allowed?: SSOAllowList

  group_id?: string | null
  status?: string
}

export interface ProbeResult {
  ok: boolean
  version: string
  accounts: number
  message: string
  probed_at: string
}

export interface ServerGroup {
  id: string
  name: string
  description: string
  fill_mode: FillMode
  created_at: string
  servers: number
  live_accounts: number
  /** -1 when any member server is unlimited. */
  capacity: number
}

export interface SaveGroupRequest {
  name: string
  description: string
  fill_mode: FillMode
}

export interface PanelPackage {
  name: string
  disk_limit_mb: number
  bw_limit_mb: number
  max_addons: number
  max_subdomains: number
  max_email_accounts: number
  max_databases: number
}

/* ── Plans ─────────────────────────────────────────────────────────────── */

/** -1 on any limit means unlimited; 0 is a real "none". */
export interface PlanLimits {
  disk_mb: number
  bandwidth_mb: number
  addon_domains: number
  subdomains: number
  parked_domains: number
  email_accounts: number
  databases: number
  ftp_accounts: number
  cpu_pct: number
  iops: number
  entry_procs: number
}

/** A zero price on a cycle means the cycle is not offered. */
export interface PlanPricing {
  currency: string
  monthly: number
  quarterly: number
  annual: number
  setup_fee: number
}

export type AutoSetup = "on_payment" | "on_order" | "manual"

export interface HostingPlan {
  sku: string
  group: string
  name: string
  description: string
  module_key: string
  server_group: string
  whm_package: string
  limits: PlanLimits
  features: string[]
  pricing: PlanPricing
  auto_setup: AutoSetup
  visible: boolean
  sort_order: number
  retired: boolean
}

export interface PlanGroup {
  key: string
  name: string
  description: string
  sort_order: number
  visible: boolean
}

/** The admin catalogue pairs each plan with its live account count. */
export interface AdminPlanRow {
  plan: HostingPlan
  accounts: number
}

export interface AdminPlansResponse {
  items: AdminPlanRow[]
  groups: PlanGroup[]
}

export interface PublicPlansResponse {
  items: HostingPlan[]
  groups: PlanGroup[]
}

/* ── Accounts ──────────────────────────────────────────────────────────── */

export type AccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED" | "FAILED"

export interface HostingAccount {
  id: string
  account_id: string
  user_id: string | null
  server_id: string
  plan_sku: string
  package_name: string
  domain: string
  username: string
  dedicated_ip: string
  status: AccountStatus
  suspension_reason: string
  suspended_by: string
  subscription_id: string | null
  resource_urn: string
  disk_used_mb: number
  disk_limit_mb: number
  bw_used_mb: number
  bw_limit_mb: number
  last_sync_at: string | null
  created_at: string
  updated_at: string

  /* Derived, server-side */
  plan?: HostingPlan
  nameservers: string[]
  capabilities: string[]
  /** True while a job is in flight — what the console polls on. */
  provisioning: boolean
  /** Returned once, right after provisioning. */
  setup_password?: string
}

export interface AdminHostingAccount extends HostingAccount {
  server_name: string
  server_hostname: string
  jobs?: HostingJob[]
}

export interface OrderRequest {
  domain: string
  plan_sku: string
  cycle: string
  username?: string
  idempotency_key: string
}

export interface AdminCreateRequest extends OrderRequest {
  account_id: string
  server_id?: string | null
  skip_billing?: boolean
}

export interface ImportCandidate {
  username: string
  domain: string
  ip: string
  /** True when this system already has a row for it. */
  known: boolean
}

export interface ImportRequest {
  server_id: string
  account_id: string
  plan_sku: string
  usernames?: string[]
  dry_run?: boolean
}

/* ── Jobs ──────────────────────────────────────────────────────────────── */

export type JobStatus =
  "QUEUED" | "PROCESSING" | "RETRY" | "COMPLETED" | "DEAD_LETTER" | "CANCELLED"

export type JobAction =
  | "CREATE"
  | "SUSPEND"
  | "UNSUSPEND"
  | "TERMINATE"
  | "CHANGE_PACKAGE"
  | "CHANGE_PASSWORD"
  | "SYNC_USAGE"

export interface HostingJob {
  id: string
  idempotency_key: string
  account_id: string | null
  server_id: string | null
  action: JobAction
  payload: Record<string, unknown>
  status: JobStatus
  attempts: number
  max_attempts: number
  next_run_at: string
  locked_by: string
  locked_at: string | null
  last_error: string
  requested_by: string
  created_at: string
  updated_at: string
}

/* ── Audit ─────────────────────────────────────────────────────────────── */

export interface HostingAuditLog {
  id: string
  hosting_account_id: string | null
  server_id: string | null
  actor: string
  action: string
  detail: Record<string, unknown>
  ip_address: string
  created_at: string
}
