// Entity models and request payloads for the platform catalog admin endpoints
// (cloud-be-go: /platform/infra/*). Create requires the full shape; update is
// partial — only provided fields are applied. ids are strings.

/* ── Availability zone ─────────────────────────────────────────────────── */
// The former `zones` (regions) and `availability_zones` tables are merged: each
// AZ row now carries its region info inline (region_code / region_name / country).

export interface AvailabilityZone {
  id: string
  region_code: string
  region_name: string
  country: string
  code: string
  name: string
  is_available: boolean
  is_active: boolean
}

export interface CreateAvailabilityZoneRequest {
  region_code: string
  region_name: string
  country?: string
  code: string
  name?: string
  is_available?: boolean
  is_active?: boolean
}

export type UpdateAvailabilityZoneRequest = Partial<
  Pick<
    CreateAvailabilityZoneRequest,
    "region_code" | "region_name" | "country" | "name" | "is_available" | "is_active"
  >
>

/* ── PVE node ──────────────────────────────────────────────────────────── */

export type PVENodeStatus = "online" | "offline" | "maintenance"

export interface PVENode {
  id: string
  availability_zone_id: string
  name: string
  ip_address: string
  status: PVENodeStatus
  cpu_total: number
  cpu_used: number
  ram_total_mb: number
  ram_used_mb: number
  storage_total_gb: number
  storage_used_gb: number
  username: string
  // Per-node lbagent credential. The client_id is opaque and safe to expose;
  // has_agent_secret reports whether a secret is set (the secret itself is never
  // returned by GET/list — only once at generate/regenerate time).
  agent_client_id?: string
  has_agent_secret?: boolean
  // Inbound-webhook state. has_webhook_secret means the node CAN authenticate a
  // delivery; webhook_registered_at means we actually pushed the notification
  // target onto the node. They differ when a secret was planted by hand, so the
  // UI reports them separately.
  has_webhook_secret?: boolean
  webhook_registered_at?: string | null
  // VMID of the golden VyOS LXC template on THIS node, cloned for every VPC
  // gateway placed here. Per node rather than per region because a VMID only
  // identifies a guest inside one Proxmox cluster. 0 means the node carries no
  // gateway image — gateway provisioning on it fails until one is set.
  vyos_template_vmid?: number
}

/* ── PVE node graphs ───────────────────────────────────────────────────── */
// GET /pve-nodes/:id/metrics — the node's own Proxmox rrd series, the same data
// the PVE summary page graphs. Percent fields are 0..100; net_in/net_out are
// MB/s; loadavg is an absolute load average (read against cpu_count).

/** Proxmox rrd windows, in the order the filter offers them. */
export type PVENodeMetricRange = "hour" | "day" | "week" | "month" | "year"
/** Consolidation function — the summary page's Average / Maximum toggle. */
export type PVENodeMetricCF = "AVERAGE" | "MAX"

export interface PVENodeMetricPoint {
  t: number // unix seconds
  cpu: number
  iowait: number
  loadavg: number
  mem: number
  mem_used_bytes: number
  mem_total_bytes: number
  swap: number
  swap_used_bytes: number
  swap_total_bytes: number
  root: number
  root_used_bytes: number
  root_total_bytes: number
  net_in: number
  net_out: number
  cpu_psi_some: number
  cpu_psi_full: number
  io_psi_some: number
  io_psi_full: number
  mem_psi_some: number
  mem_psi_full: number
}

export interface PVENodeMetrics {
  node: string
  timeframe: PVENodeMetricRange
  cf: PVENodeMetricCF
  cpu_count: number
  points: PVENodeMetricPoint[]
}

// Result of POST /pve-nodes/:id/webhook. `secret` is present ONLY when this call
// minted one (first registration, or an explicit rotate) — it is never
// re-readable, so surface it immediately.
export interface NodeWebhookRegistration {
  target_name: string
  matcher_name: string
  callback_url: string
  secret?: string
  rotated: boolean
  created: boolean
  registered_at: string | null
}

// Body for the register action. Both fields optional: a plain press sends `{}`
// and gets the server-resolved callback URL with the stored secret reused.
export interface RegisterNodeWebhookRequest {
  callback_url?: string
  rotate?: boolean
}

// The per-node lbagent credential pair, returned ONLY by
// POST /pve-nodes/:id/agent-credentials (generate/regenerate). The secret is
// shown once and never re-readable — persist/copy it at this moment.
export interface AgentCredentials {
  client_id: string
  secret: string
}

export interface CreatePVENodeRequest {
  availability_zone_id: string
  name: string
  ip_address: string
  username: string
  password: string
  token?: string
  webhook_secret?: string
  cpu_total: number
  ram_total_mb: number
  storage_total_gb: number
  status?: PVENodeStatus
  vyos_template_vmid?: number
}

export interface UpdatePVENodeRequest {
  availability_zone_id?: string
  name?: string
  ip_address?: string
  username?: string
  password?: string
  token?: string
  webhook_secret?: string
  status?: PVENodeStatus
  cpu_used?: number
  ram_used_mb?: number
  storage_used_gb?: number
  cpu_total?: number
  ram_total_mb?: number
  storage_total_gb?: number
  // 0 is a meaningful value here ("this node has no gateway template"), so the
  // API distinguishes it from the field being omitted, which keeps the stored id.
  vyos_template_vmid?: number
}

/* ── Platform policy switches ──────────────────────────────────────────── */
// The two platform-wide gates on resource creation (cloud-be-go:
// /platform/settings, super-admin only). One row for the whole fleet; the PATCH
// carries only the switches being changed.

export interface PlatformSettings {
  // The stored overrides. null is a real, distinct state: "no override — follow
  // whatever this deployment's environment says". A UI that renders null as
  // false would report a gate as off while the backend is still enforcing it.
  kyc_required: boolean | null
  permissions_required: boolean | null

  // What the backend is ACTUALLY enforcing right now. This is what a status
  // badge must read from — it can disagree with the override above, because
  // the KYC gate additionally requires a configured KYC service.
  effective_kyc_required: boolean
  effective_permissions_required: boolean

  // What an unset override resolves to on this deployment.
  default_kyc_required: boolean
  default_permissions_required: boolean

  // False when no KYC service is wired up (USER_KYC_SERVICE_URL and its client
  // credentials). Requiring KYC is then impossible — nobody could verify — and
  // the backend answers 409, so the control is rendered locked instead.
  kyc_configured: boolean

  updated_by?: string
  updated_at: string

  // Upper bound, in seconds, on how long other API replicas keep enforcing the
  // previous values (the backend caches the row per process). Surfaced so the
  // page can say a change is fleet-wide "within Ns" rather than instantly.
  propagation_seconds: number
}

// Partial patch: an omitted switch is left untouched. `reason` is an optional
// operator note the backend writes to its audit line — turning a gate off is
// security-relevant, so the page collects one.
export interface UpdatePlatformSettings {
  kyc_required?: boolean
  permissions_required?: boolean
  reason?: string
}

/* ── Signup email policy ───────────────────────────────────────────────── */
// The gate on which email addresses may open an account (cloud-be-go:
// /platform/email-policy, super-admin only). Unlike the switches above it is
// NOT database-backed: the policy and the domain lists are JSON files in the
// service S3 bucket under system_data/auth/, so an operator can also upload a
// bulk list straight to the bucket and the console picks it up.

/** What signup does with an address like name+tag@gmail.com. */
export type PlusAliasMode = "allow" | "normalize" | "block"

export interface BlockedDomain {
  domain: string
  reason?: string
  added_by?: string
  added_at?: string
  /** Shipped with the service (RFC-reserved); enforced but not removable. */
  builtin: boolean
  /**
   * Existing accounts at this domain. Blocking never signs anyone out — the
   * gate only refuses NEW accounts — but a domain with customers behind it is
   * worth seeing before adding it.
   */
  users: number
}

/** One file in the blocked-domain folder, or the built-in set. */
export interface BlockedDomainList {
  id: string
  about?: string
  builtin: boolean
  domains: BlockedDomain[]
}

export interface EmailPolicy {
  plus_alias: PlusAliasMode
  block_domains: boolean
  updated_by?: string
  updated_at?: string

  /** Allowed plus_alias values, so the UI renders the backend's vocabulary. */
  modes: PlusAliasMode[]

  lists: BlockedDomainList[]
  /** Distinct domains across every list — not the sum of their lengths. */
  total_domains: number

  /** The S3 prefix the lists are read from, shown so bulk uploads have a home. */
  location: string
  /** False when no S3 bucket is configured: enforced from defaults, not editable. */
  editable: boolean
  /** Upper bound, in seconds, on other replicas still enforcing the old policy. */
  propagation_seconds: number
}

/** Partial patch: an omitted switch is left untouched. */
export interface UpdateEmailPolicy {
  plus_alias?: PlusAliasMode
  block_domains?: boolean
  reason?: string
}

/** Bulk by default — a pasted list is one write, not twenty. */
export interface AddBlockedDomainsRequest {
  domains: string[]
  reason?: string
}

export interface AddBlockedDomainsResponse {
  added: string[]
  /** Already blocked by some list, so this call did not change them. */
  skipped: string[]
  policy: EmailPolicy
}

export interface EmailPolicyCheckRequest {
  email: string
}

export interface EmailPolicyCheck {
  /** The address signup would actually use (folded, under normalize). */
  email: string
  original: string
  domain: string
  rewritten: boolean
  blocked: boolean
  reason?: "invalid" | "plus_alias" | "domain"
  matched_domain?: string
  /** An account already holds this address, which is why a blocked one may pass. */
  existing_user: boolean
  outcome: "allowed" | "rewritten" | "blocked" | "allowed_existing"
}

/* ── Load balancer fleet settings ──────────────────────────────────────── */
// DB-backed, platform-wide configuration for the load-balancer fleet
// (cloud-be-go: /platform/infra/lb-settings, super-admin only). One row for the
// whole fleet — the PUT carries the full shape, not a partial patch.

export interface LBSettings {
  // Header carrying the client's request id through the proxy hops.
  trace_header: string
  // When on, the balancer forwards the pool/backend name in name_header.
  send_name: boolean
  // Header the name is forwarded in (only meaningful when send_name is on).
  name_header: string
  // Port the per-node lbagent listens on for refresh webhooks.
  agent_webhook_port: number
  // Port the per-node Proxmox Manager serves its control API / health on. It is
  // administered from the Proxmox Manager page, not the load-balancer one — the
  // manager outgrew that product — but it still lives in this row.
  manager_port: number
  // LXC template CTID cloned when provisioning a load-balancer container.
  template_ctid: number
  // CIDR of the private control-plane network the managers live on.
  control_plane_cidr: string
}

// The PUT body is a PARTIAL of the settings shape: the backend reads every field
// as optional and leaves an omitted one at its stored value. That is what lets
// two pages own different halves of the same row — the load-balancer page saves
// the proxy fields, the Proxmox Manager page saves manager_port — without either
// one writing back a stale copy of the other's.
export type UpdateLBSettings = Partial<LBSettings>

// Live reachability of a node's LB manager (cloud-be-go:
// GET /platform/infra/pve-nodes/:id/manager-status). "no_manager" means the node
// has no manager provisioned yet; "unreachable" means one exists but didn't answer.
export type ManagerStatusState = "healthy" | "unreachable" | "no_manager"

export interface ManagerStatus {
  status: ManagerStatusState
  manager_url: string
  latency_ms: number
}

/* ── Image (OS family with embedded versions) ──────────────────────────── */
// The backend merged the former `image_families` and `amis` tables into a
// single `images` resource: the top-level row is the OS-family grouping that
// carries the icon, and its selectable versions live embedded in `versions`.
// Family-level fields are managed with the image requests; each version is
// added/updated/removed with the version requests below.

export type ImageVisibility = "public" | "private"

export interface ImageVersion {
  id: string
  name: string
  description?: string
  os_version?: string
  architecture: string
  ami_file?: string
  vmid?: number
  min_disk_gb: number
  is_default: boolean
  is_marketplace: boolean
  visibility: ImageVisibility
  status: string
}

export interface Image {
  id: string
  organization_id: string | null
  name: string
  display_name: string
  description: string
  icon_url: string
  sort_order: number
  is_active: boolean
  versions: ImageVersion[]
}

export interface CreateImageRequest {
  name: string
  display_name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export type UpdateImageRequest = Partial<
  Pick<CreateImageRequest, "display_name" | "description" | "sort_order" | "is_active">
> & {
  /** Point the icon at an already-hosted image instead of uploading a file. */
  icon_url?: string
}

export interface AddImageVersionRequest {
  name: string
  description?: string
  os_version?: string
  architecture?: string
  ami_file?: string
  vmid?: number
  is_default?: boolean
  is_marketplace?: boolean
  visibility?: ImageVisibility
  min_disk_gb?: number
}

export type UpdateImageVersionRequest = Partial<AddImageVersionRequest> & { status?: string }

/* ── VM price ──────────────────────────────────────────────────────────── */

export type VMPriceFamily = "standard" | "compute" | "memory" | "gpu"
export type BillingUnit = "second" | "minute" | "hour" | "month"
export type CPUArchitecture = "x86_64" | "arm64"
export type IPVersion = "ipv4" | "ipv6"
export type IPAddressType = "static" | "ephemeral"
export type VolumeType = "block" | "object" | "file"
export type ReplicationType = "local" | "zonal" | "regional"

export interface VMPrice {
  id: string
  availability_zone_id: string
  sku: string | null
  name: string
  display_name: string | null
  description: string | null
  family: VMPriceFamily
  generation: string | null
  architecture: CPUArchitecture
  hypervisor: string | null
  vcpus: number
  ram_gb: number
  cpu_vendor: string | null
  cpu_model: string | null
  clock_ghz: number
  gpu_count: number
  gpu_type: string | null
  local_disk_gb: number
  default_boot_disk_gb: number
  max_data_disks: number
  max_nics: number
  bandwidth_gbps: number
  network_tier: string | null
  ipv4_included: number
  ipv6_supported: boolean
  baseline_iops: number
  burst_iops: number
  features: string | null
  price_hourly: number
  price_monthly: number
  price_yearly: number
  price_spot_hourly: number
  price_reserved_monthly: number
  price_reserved_yearly: number
  setup_fee: number
  currency: string
  billing_unit: BillingUnit
  billing_increment_seconds: number
  tax_inclusive: boolean
  sort_order: number
  effective_from: string
  effective_to: string
  is_active: boolean
}

export interface CreateVMPriceRequest {
  availability_zone_id: string
  sku?: string
  name: string
  display_name?: string
  description?: string
  family: VMPriceFamily
  generation?: string
  architecture?: CPUArchitecture
  hypervisor?: string
  vcpus: number
  ram_gb: number
  cpu_vendor?: string
  cpu_model?: string
  clock_ghz?: number
  gpu_count?: number
  gpu_type?: string
  local_disk_gb?: number
  default_boot_disk_gb?: number
  max_data_disks?: number
  max_nics?: number
  bandwidth_gbps?: number
  network_tier?: string
  ipv4_included?: number
  ipv6_supported?: boolean
  baseline_iops?: number
  burst_iops?: number
  features?: string
  price_hourly: number
  price_monthly?: number
  price_yearly?: number
  price_spot_hourly?: number
  price_reserved_monthly?: number
  price_reserved_yearly?: number
  setup_fee?: number
  currency?: string
  billing_unit?: BillingUnit
  billing_increment_seconds?: number
  tax_inclusive?: boolean
  sort_order?: number
}

// Partial patch for an existing VM price — every field optional so the admin
// edit form only sends what changed.
export interface UpdateVMPriceRequest {
  availability_zone_id?: string
  sku?: string
  name?: string
  display_name?: string
  description?: string
  family?: VMPriceFamily
  generation?: string
  architecture?: CPUArchitecture
  hypervisor?: string
  vcpus?: number
  ram_gb?: number
  cpu_vendor?: string
  cpu_model?: string
  clock_ghz?: number
  gpu_count?: number
  gpu_type?: string
  local_disk_gb?: number
  default_boot_disk_gb?: number
  max_data_disks?: number
  max_nics?: number
  bandwidth_gbps?: number
  network_tier?: string
  ipv4_included?: number
  ipv6_supported?: boolean
  baseline_iops?: number
  burst_iops?: number
  features?: string
  price_hourly?: number
  price_monthly?: number
  price_yearly?: number
  price_spot_hourly?: number
  price_reserved_monthly?: number
  price_reserved_yearly?: number
  setup_fee?: number
  currency?: string
  billing_unit?: BillingUnit
  billing_increment_seconds?: number
  tax_inclusive?: boolean
  sort_order?: number
  is_active?: boolean
}

/* ── Static IP price ───────────────────────────────────────────────────── */

export interface StaticIPPrice {
  id: string
  // Platform-wide price — no longer tied to an availability zone.
  availability_zone_id: string | null
  sku: string
  name: string
  ip_version: IPVersion
  address_type: IPAddressType
  network_tier: string
  price_hourly: number
  price_idle_hourly: number
  price_monthly: number
  setup_fee: number
  currency: string
  billing_unit: BillingUnit
  billing_increment_seconds: number
  tax_inclusive: boolean
  features: string
  effective_from: string
  effective_to: string
  is_active: boolean
}

export interface CreateStaticIPPriceRequest {
  availability_zone_id?: string
  sku?: string
  name?: string
  ip_version?: IPVersion
  address_type?: IPAddressType
  network_tier?: string
  price_hourly: number
  price_idle_hourly?: number
  price_monthly?: number
  setup_fee?: number
  currency?: string
  billing_unit?: BillingUnit
  billing_increment_seconds?: number
  tax_inclusive?: boolean
  features?: string
}

export interface UpdateStaticIPPriceRequest {
  availability_zone_id?: string
  sku?: string
  name?: string
  ip_version?: IPVersion
  address_type?: IPAddressType
  network_tier?: string
  price_hourly?: number
  price_idle_hourly?: number
  price_monthly?: number
  setup_fee?: number
  currency?: string
  billing_unit?: BillingUnit
  billing_increment_seconds?: number
  tax_inclusive?: boolean
  features?: string
  is_active?: boolean
}

/* ── Bandwidth price ───────────────────────────────────────────────────── */

export type BandwidthDirection = "egress" | "ingress" | "both"

export interface BandwidthPrice {
  id: string
  availability_zone_id: string
  sku: string
  name: string
  direction: BandwidthDirection
  included_gb: number
  price_per_gb: number
  currency: string
  billing_unit: "gb"
  tax_inclusive: boolean
  features: string
  effective_from: string
  effective_to: string
  is_active: boolean
}

export interface CreateBandwidthPriceRequest {
  availability_zone_id: string
  sku?: string
  name?: string
  direction?: BandwidthDirection
  included_gb?: number
  price_per_gb?: number
  currency?: string
  billing_unit?: "gb"
  tax_inclusive?: boolean
  features?: string
}

export interface UpdateBandwidthPriceRequest {
  availability_zone_id?: string
  sku?: string
  name?: string
  direction?: BandwidthDirection
  included_gb?: number
  price_per_gb?: number
  currency?: string
  billing_unit?: "gb"
  tax_inclusive?: boolean
  features?: string
  is_active?: boolean
}

/* ── Storage price ─────────────────────────────────────────────────────── */

export type StorageType = "ssd" | "hdd" | "nvme"

export interface StoragePrice {
  id: string
  availability_zone_id: string
  sku: string
  name: string
  description: string
  storage_type: StorageType
  volume_type: VolumeType
  replication_type: ReplicationType
  min_size_gb: number
  max_size_gb: number
  included_iops: number
  max_iops: number
  included_throughput_mbps: number
  max_throughput_mbps: number
  price_per_gb_month: number
  price_per_iops: number
  price_per_throughput_mbps: number
  snapshot_price_per_gb_month: number
  setup_fee: number
  currency: string
  billing_unit: BillingUnit
  tax_inclusive: boolean
  features: string
  effective_from: string
  effective_to: string
  is_active: boolean
}

export interface CreateStoragePriceRequest {
  availability_zone_id: string
  sku?: string
  name?: string
  description?: string
  storage_type: StorageType
  volume_type?: VolumeType
  replication_type?: ReplicationType
  min_size_gb?: number
  max_size_gb?: number
  included_iops?: number
  max_iops?: number
  included_throughput_mbps?: number
  max_throughput_mbps?: number
  price_per_gb_month: number
  price_per_iops?: number
  price_per_throughput_mbps?: number
  snapshot_price_per_gb_month?: number
  setup_fee?: number
  currency?: string
  billing_unit?: BillingUnit
  tax_inclusive?: boolean
  features?: string
}

export interface UpdateStoragePriceRequest {
  availability_zone_id?: string
  sku?: string
  name?: string
  description?: string
  storage_type?: StorageType
  volume_type?: VolumeType
  replication_type?: ReplicationType
  min_size_gb?: number
  max_size_gb?: number
  included_iops?: number
  max_iops?: number
  included_throughput_mbps?: number
  max_throughput_mbps?: number
  price_per_gb_month?: number
  price_per_iops?: number
  price_per_throughput_mbps?: number
  snapshot_price_per_gb_month?: number
  setup_fee?: number
  currency?: string
  billing_unit?: BillingUnit
  tax_inclusive?: boolean
  features?: string
  is_active?: boolean
}

/* ── Service catalog (Sovereign Services) ──────────────────────────────── */

export type ServiceState = "enabled" | "coming_soon" | "disabled"
export type ServiceHealthStatus = "operational" | "degraded" | "maintenance"

export interface ServiceMetricSpec {
  label: string
  source: string
  accent: boolean
}

export interface CatalogServiceAdmin {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  path: string
  state: ServiceState
  status: ServiceHealthStatus
  sort_order: number
  metrics: ServiceMetricSpec[]
}

export interface CreateServiceRequest {
  key: string
  name: string
  description?: string
  icon?: string
  category?: string
  path?: string
  state?: ServiceState
  status?: ServiceHealthStatus
  sort_order?: number
  metrics?: ServiceMetricSpec[]
}

export type UpdateServiceRequest = Partial<Omit<CreateServiceRequest, "key">>

export interface UpdateServiceStateRequest {
  state: ServiceState
  status?: ServiceHealthStatus
}

/* ── IP pools (static IP inventory) ─────────────────────────────────────── */
// System-level blocks of public IPv4 addresses the platform owns. Tenant static
// IPs are allocated from these pools; `used`/`available` are computed server-side
// by diffing the block against the static IPs already allocated from it.
// (cloud-be-go: /vpc/ippools/*, super-admin only.)

export type IpPoolStatus = "active" | "disabled" | "depleted"

export interface IpPool {
  id: string
  name: string
  cidr: string
  ip_version: string
  region: string
  availability_zone_id: string | null
  gateway: string
  description: string
  total_count: number
  usable_count: number
  status: IpPoolStatus
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed live by the backend from current allocations.
  used: number
  // Addresses an operator marked "not usable" — held back from tenant
  // allocation for the platform's own use. Counted apart from `used` so a pool
  // never reports withheld stock as customer stock.
  blocked: number
  available: number
}

// A pool is tied to an availability zone; the backend derives its region from
// the AZ's zone.
export interface CreateIPPoolRequest {
  name?: string
  cidr: string
  availability_zone_id: string
  gateway?: string
  description?: string
}

export interface UpdateIPPoolRequest {
  name?: string
  gateway?: string
  description?: string
  status?: IpPoolStatus
  is_active?: boolean
}

// A single address within a block. `free` = unallocated; `available` = reserved
// (allocated to a tenant but not attached); `associated` = attached to a VM;
// `blocked` = withheld by the platform and never offered to a tenant.
export type PoolAddressStatus = "free" | "available" | "associated" | "blocked"

export interface PoolAddress {
  ip_address: string
  status: PoolAddressStatus
  static_ip_id?: string
  name?: string
  /** Blocked addresses only: the operator's note and when it was held back. */
  reason?: string
  reserved_at?: string
}

export interface PoolExpansion {
  cidr: string
  network: string
  broadcast: string
  gateway: string
  prefix: number
  total_count: number
  usable_count: number
  addresses: PoolAddress[]
  // Present when expanding an EXISTING pool (the drill-in), absent for the
  // Add-pool dialog's preview of a block that has no pool yet.
  pool?: IpPool
}

// Marks addresses not usable. A list rather than one address so a selection is
// one request; the backend refuses the whole batch if any address is allocated
// or outside the pool.
export interface ReserveAddressesRequest {
  ip_addresses: string[]
  reason?: string
}

// A static IP currently in use somewhere on the platform (reserved or attached),
// enriched with the pool it came from and the tenant/resource that holds it.
//
// owner_* describes whatever the address is attached to, keyed by
// association_type: a VM ("instance"), a load balancer, a NAT gateway, a VPC
// gateway router ("vpc_gateway") or a managed app. owner_deleted means the
// owning row is gone while the address is still held — a leak, and the case the
// release action exists for.
export interface StaticIPAllocation {
  id: string
  ip_address: string
  name: string
  status: string // "available" (reserved) | "associated" (in use)
  region: string
  pool_id?: string
  pool_cidr?: string
  association_type?: string
  owner_id?: string
  owner_name?: string
  owner_deleted?: boolean
  account_id: string
  account_number?: string
  account_name?: string
  organization_id?: string
  organization_name?: string
  user_id?: string
  user_name?: string
  user_email?: string
  created_at: string
  updated_at: string
}

/* ── Platform users (super-admin management) ───────────────────────────── */

// A platform user as seen by the super-admin console (cloud-be-go:
// GET /auth/users/admin/list). is_super_admin is the catalog/infra control-plane
// flag that this page grants/revokes.
export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  phone: string
  is_super_admin: boolean
  is_active: boolean
  created_at: string
}

export interface SetSuperAdminRequest {
  is_super_admin: boolean
}

/* ── Platform overview (super-admin) ───────────────────────────────────── */

// Aggregated organization → account → member graph for the Platform Overview
// page (cloud-be-go: GET /org/overview). Assembled server-side in one round trip.
// The three lists are narrowed SERVER-side by the ?q= search; `stats` always
// reports platform-wide totals, so the headline counts don't move as you type.
/**
 * One tab's worth of the overview. Passed as ?section= so a tab fetches only
 * the list it renders; omit it for the whole graph.
 */
export type OverviewSection = "organizations" | "accounts" | "users" | "orphan_users"

/** Server paging envelope (cloud-be-go: common/utils.PaginationMeta). */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface PlatformOverview {
  stats: OverviewStats
  // Post-search counts per section — the numbers on the tabs. Filled for EVERY
  // section whichever one was requested, so a section-scoped read still labels
  // the tabs it didn't fetch. Unlike `stats` these move as you type.
  matched: OverviewStats
  // The page of the requested section. Null on the full-graph read, which is
  // deliberately unpaged.
  pagination: PaginationMeta | null
  // Empty unless this section was the one requested (or none was, meaning the
  // whole graph). Under ?section=organizations the org nodes carry their counts
  // but not their nested accounts/users — the tab renders the counts.
  organizations: OverviewOrg[]
  // Flat list of every account on the platform, independent of org linkage.
  // The Accounts tab reads this so accounts with no organization still show.
  accounts: OverviewAccount[]
  // Flat list of every user, each carrying org_name. The Users tab reads this
  // rather than flattening organizations[].users + orphan_users: under a search
  // the organizations list is narrowed, which would drop non-matching orgs' users.
  users: OverviewUser[]
  // Users not attached to any org (mid-onboarding signups, etc.).
  orphan_users: OverviewUser[]
}

export interface OverviewStats {
  organizations: number
  accounts: number
  users: number
  orphan_users: number
}

export interface OverviewOrg {
  id: string
  name: string
  slug: string
  billing_email: string
  status: string
  created_at: string
  account_count: number
  user_count: number
  accounts: OverviewAccount[]
  users: OverviewUser[]
}

export interface OverviewAccount {
  id: string
  organization_id: string
  // Owning organization's name ("" for an individual account), denormalized —
  // it can't be joined from `organizations` any more, since a search narrows
  // that list and would blank the label on non-matching orgs' accounts.
  org_name: string
  account_number: string
  name: string
  status: string
  is_default: boolean // the org's "main" account
  permanent_discount: number // per-resource discount %, super-admin editable
  // Why that discount was granted ("First 100 customers", a negotiated rate, a
  // goodwill credit). Mandatory server-side for any non-zero discount; "" when
  // the account pays list price.
  permanent_discount_reason: string
  balance: number // wallet balance in credits (1 credit = ₹1), authoritative
  created_at: string
  members: OverviewMember[]
}

/** Direction of a manual wallet movement posted by a platform operator. */
export type LedgerEntryType = "credit" | "debit"

/**
 * A manual wallet movement posted by a super admin against an account, via
 * POST /billing/ledger. The backend recomputes the account's balance from this
 * — the amount is a DELTA (in credits), never the new total.
 *
 * `ref_id` is the idempotency key: the (ref_type, ref_id) pair is uniquely
 * indexed, so a resubmitted request is rejected rather than credited twice.
 */
export interface AdjustBalanceRequest {
  account_id: string
  entry_type: LedgerEntryType
  amount: number
  currency?: string
  description?: string
  ref_type: "adjustment"
  ref_id: string
}

/** One posted ledger row, as returned by POST /billing/ledger. */
export interface AdminLedgerEntry {
  id: string
  account_id: string
  entry_type: LedgerEntryType
  amount: number
  currency: string
  balance_after: number
  description: string
}

export interface OverviewMember {
  user_id: string
  name: string
  email: string
  member_role: string // owner | admin | member | billing | viewer
  is_owner: boolean // the user who owns the account (structural, not member_role)
}

export interface OverviewUser {
  id: string
  name: string
  email: string
  /** The user's organization name ("" when they belong to none), denormalized. */
  org_name: string
  organization_id: string
  phone: string
  is_root: boolean
  is_super_admin: boolean
  is_active: boolean
  role: string
  user_type: string
  onboarding_status: string
  /** True when the user must (re-)verify with the external KYC service. */
  need_actions: boolean
  kyc_completed: boolean
  created_at: string
  last_login_at: string | null
}

// One resource owned by an account, as enumerated by the cross-domain account
// listers (cloud-be-go: GET /resources/search/accounts/:accountId/resources).
// Mirrors the search Hit shape so the inventory renders like search results.
export interface AccountResource {
  id: string
  name: string
  service: string // owning domain: "compute" | "vpc" | …
  type: string // console resource type: "vm" | "disk" | "static-ip" | …
  region?: string
  status?: string
  tags?: Record<string, string>
  meta?: string[]
  updated_at?: string
}

export interface AdminResource extends AccountResource {
  account_id: string
  account_name: string
  account_number: string
  organization_id?: string
  failure_reason?: string
  owners: { id: string; name: string; email: string }[]
}

export interface AdminResourceInventory {
  items: AdminResource[]
  total: number
  page: number
  limit: number
  options: { types: string[]; services: string[]; statuses: string[]; regions: string[] }
  failures: { source: string; account_id: string; reason: string }[]
}

export interface AdminResourceFilters {
  q?: string
  type?: string
  service?: string
  status?: string
  region?: string
  account_id?: string
  failure_only?: boolean
  page?: number
  limit?: number
}

export interface DeleteAccountResponse {
  account_id: string
  status: string
  cleanup_started: boolean
}

// Active-spend rollup for one resource family, projected to a monthly run-rate.
export interface AccountSpendKind {
  kind: string // compute | storage | network | loadbalancer
  count: number
  monthly_amount: number
}

// Per-account billing summary (cloud-be-go: GET
// /billing/charge/accounts/:accountId/spend, super-admin only): what the account
// is actively paying for and how much, as a monthly run-rate.
export interface AccountSpend {
  account_id: string
  currency: string
  active_resources: number
  monthly_recurring: number // ₹/month from monthly-cycle subscriptions
  hourly_rate: number // summed ₹/hour of hourly-cycle subscriptions
  hourly_monthly: number // hourly_rate projected to a month
  monthly_total: number // monthly_recurring + hourly_monthly
  wallet_balance: number
  by_kind: AccountSpendKind[]
  by_status: Record<string, number> // active | overdue | suspended | cancelled → count
}

/* ── Redis cache ("Burst Cache") ────────────────────────────────────────── */

// How much a namespace actually costs to clear. "safe" is derived data that
// rebuilds from Postgres on the next read; "disruptive" is Redis-only state
// (live sign-in codes, pending handshakes, throttles) with no DB backing.
export type CacheImpact = "safe" | "disruptive"

// One independently clearable family of Redis keys. The backend owns this
// registry (apps/platform/cache/service/cache_namespaces.go), labels and all,
// so the console never hard-codes a key prefix that a module might rename.
export interface CacheNamespace {
  key: string // e.g. "auth.otp" — what ?namespace= takes
  label: string
  description: string
  patterns: string[]
  impact: CacheImpact
  keys: number // live count at the time of the request
}

// Namespaces bucketed by the app module that owns the keys.
export interface CacheNamespaceGroup {
  module: string
  label: string
  description: string
  namespaces: CacheNamespace[]
  keys: number
}

export interface CacheNamespacesResponse {
  groups: CacheNamespaceGroup[]
  keys: number // DBSIZE across the whole logical DB
}

export interface CacheStats {
  keys: number
}

// Namespaces and patterns compose — sending both clears both. `all` flushes the
// entire logical DB and subsumes the rest.
export interface ClearCacheRequest {
  namespaces?: string[]
  patterns?: string[]
  all?: boolean
}

export interface ClearCacheResult {
  kind: "namespace" | "pattern"
  target: string
  label?: string
  patterns: string[]
  deleted: number
}

export interface ClearCacheResponse {
  scope: "all" | "namespaces" | "patterns" | "mixed"
  deleted: number
  results: ClearCacheResult[]
}

/* ── Quota increase requests ───────────────────────────────────────────── */

export type QuotaRequestStatus = "pending" | "approved" | "rejected"

/**
 * One increase request, read off the support ticket it was filed as
 * (apps/quotas QuotaTicketReview). There is no separate review queue: quota
 * tickets sit in the support queue like everything else, and this is what the
 * ticket page needs to decide one.
 *
 * `current_limit` is resolved live by the backend, NOT read from the ticket —
 * the subject's limit can move between filing and review, and the reviewer has
 * to judge against what is in force now. `filed_limit` is what the requester was
 * looking at when they asked; when the two differ, something changed since.
 */
export interface QuotaTicketReview {
  ticket_id: string
  quota_code: string
  quota_name: string
  scope: "account" | "user"
  unit: string
  adjustable: boolean
  current_limit: number
  filed_limit: number
  requested_limit: number
  /** −1 = unlimited. Present only once approved. */
  granted_limit?: number
  justification: string
  status: QuotaRequestStatus
  created_at: string
  reviewed_at?: string | null
}

export interface ApproveQuotaRequestInput {
  // Omit to grant exactly what was requested.
  granted_limit?: number
  note?: string
}

export interface RejectQuotaRequestInput {
  note: string
}

/**
 * Body of PATCH /auth/users/:id/kyc — the super-admin KYC override.
 *
 * Both flags are optional and independent: omitting one leaves it alone. The two
 * operator actions map onto them directly — a bypass sets `kyc_completed` true
 * and `need_actions` false; a request to re-verify raises `need_actions` alone,
 * leaving the earlier completion as the historical record it is.
 */
export interface KycStatusPatch {
  kyc_completed?: boolean
  need_actions?: boolean
  /** Recorded in the server log so an override is traceable to a justification. */
  reason?: string
}

/* ── Website contact form ──────────────────────────────────────────────── */

/**
 * What the operator has done about a submission (cloud-be-go
 * apps/platform/contact). A row starts at "new" and only ever moves by hand —
 * nothing expires it, because a lead nobody answered is exactly what this queue
 * has to keep showing.
 *
 * "spam" rather than delete: junk is kept so a pattern stays visible.
 */
export type ContactSubmissionStatus = "new" | "contacted" | "closed" | "spam"

/**
 * One "talk to us" form from the marketing site.
 *
 * Deliberately has no account_id. Whoever sent it has no account yet — that is
 * the point of the form — so this is pre-tenancy platform data, readable only by
 * the super admin.
 */
export interface ContactSubmission {
  id: string
  name: string
  email: string
  company: string
  team_size: string
  use_case: string
  message: string
  /** The surface that collected it: "website" today. */
  source: string
  /** Recorded for abuse triage, not analytics. */
  ip_address: string
  user_agent: string
  status: ContactSubmissionStatus
  notes: string
  /** When the row first left "new"; absent while nobody has picked it up. */
  handled_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Body of PATCH /platform/contact/:id. Both fields are optional and independent
 * — omitting one leaves it alone, so changing a status never clobbers notes
 * somebody is halfway through typing in another tab.
 */
export interface UpdateContactSubmissionRequest {
  status?: ContactSubmissionStatus
  notes?: string
}

/* ── Website privacy-rights form ───────────────────────────────────────── */

/**
 * How far a rights request has got (cloud-be-go apps/platform/optout). A row
 * starts at "new" and only ever moves by hand — nothing expires it, because an
 * unanswered rights request is the single thing this queue exists to keep
 * visible.
 */
export type OptOutStatus = "new" | "in_progress" | "completed" | "rejected"

/** The three rights the website form offers, as checkboxes. */
export type OptOutRight = "access_info" | "opt_out_comms" | "delete_info"

/**
 * One privacy-rights request from the marketing site's /opt-out form.
 *
 * No account_id, and that is deliberate: the requester may well have an account,
 * but nobody has verified that at the point the form is submitted. The name and
 * email are ASSERTED, not confirmed — treat them as a claim to check, not an
 * identity to act on.
 */
export interface OptOutRequest {
  id: string
  first_name: string
  last_name: string
  email: string
  /** One or more; a person may ask to see their data and then have it erased. */
  request_types: OptOutRight[]
  additional_info: string
  source: string
  /** The submitter's actual address, forwarded by the website. */
  ip_address: string
  user_agent: string
  status: OptOutStatus
  notes: string
  /** The operator who acted; null until somebody does. */
  handled_by?: string | null
  /**
   * The three moments that make up the compliance record: created_at is when it
   * arrived, handled_at when somebody first picked it up (stamped once, never
   * rewritten), completed_at when it reached a terminal status.
   */
  handled_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Body of PATCH /platform/optout/:id. Both fields are optional and independent —
 * omitting one leaves it alone, so advancing a status never clobbers notes.
 */
export interface UpdateOptOutRequestInput {
  status?: OptOutStatus
  notes?: string
}
