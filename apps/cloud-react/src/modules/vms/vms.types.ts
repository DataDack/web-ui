// Shapes mirror cloud-be-go: apps/compute/instances (entity + request DTOs).
// Keep snake_case json fields and `tags` as a JSONB-serialized string.

export type InstanceStatus =
  | "pending"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "restarting"
  | "rebooting"
  | "paused"
  | "deleting"
  | "terminating"
  | "terminated"
  | "failed"
  | "error"

/** Raw instance as returned by the backend (machine type & image are UUIDs). */
export interface RawInstance {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  description?: string
  hostname?: string
  status: InstanceStatus
  region: string
  zone: string
  machine_type_id: string
  image_id: string
  public_ip: string
  public_ip_type: "none" | "ephemeral" | "static"
  private_ip: string
  vpc_id: string
  subnet_id: string
  ssh_key_id: string
  user_id: string
  tags: string
  architecture: string
  os_version: string
  cpu_count: number
  memory_gb: number
  disk_size_gb: number
  termination_protection: boolean
  iam_profile_id?: string
}

/** Instance enriched with catalog-resolved display fields for the UI. */
export interface Instance extends RawInstance {
  /** Resolved machine-type name (falls back to the UUID). */
  machine_type: string
  /** Resolved OS image label (falls back to the UUID). */
  os: string
  /** Owning OS family key (e.g. "ubuntu") — resolves the built-in brand glyph. */
  os_family?: string
  /** Owning OS family's catalog icon (CDN-hosted); preferred over the glyph. */
  os_icon_url?: string
}

export interface CreateInstanceRequest {
  name: string
  /** Resource group the instance is created into (required). */
  resource_group_id: string
  region: string
  zone: string
  machine_type_id: string
  image_id: string
  vpc_id: string
  subnet_id: string
  /** Security groups to attach at creation; omit for none. */
  security_group_ids?: string[]
  ssh_key_id: string
  /** Optional static private IP within the chosen subnet; omit to auto-assign. */
  private_ip?: string
  /** Whether the instance is charged per hour or at a flat monthly rate. */
  billing_period: BillingPeriod
  tags: string
  disk_size_gb: number
  disk_type: string
  description?: string
  hostname?: string
  termination_protection?: boolean
  iam_profile_id?: string
  /**
   * Public IPv4 exposure at creation:
   *  - "none"      no public IP
   *  - "ephemeral" auto-assigned IP, released on stop/terminate (free)
   *  - "static"    a reserved IP held for the instance (billed)
   */
  public_ip_type?: "none" | "ephemeral" | "static"
  /** Boot-volume performance class (e.g. "gp3"). */
  volume_class?: string
  /** Delete the boot volume when the instance is terminated. */
  delete_on_termination?: boolean
  /**
   * Confirms the customer accepts the hourly early-termination policy (an hourly
   * instance can't be terminated until the billing month ends). Required for
   * hourly instances — the backend refuses the create with HTTP 428 otherwise.
   */
  acknowledge_hourly_policy?: boolean
}

/** Editable instance settings; every field is optional and only sent when changed. */
export interface UpdateInstanceRequest {
  name?: string
  description?: string
  tags?: string
  termination_protection?: boolean
}

/** How the instance is billed — pay-as-you-go hourly, or a flat monthly rate. */
export type BillingPeriod = "hourly" | "monthly"

export type InstanceAction = "start" | "stop" | "restart" | "pause" | "resume"

/** One entry in a VM's activity feed. Sourced from the Proxmox task log
 *  (start/stop/clone/snapshot/backup/…) or, for a VM without a realized guest,
 *  synthesized from its lifecycle timestamps. */
export interface InstanceEvent {
  id: string
  instance_id: string
  /**
   * Platform verb for the activity ("start", "disk", "console"). Deliberately
   * NOT the hypervisor's worker name — the API translates those.
   */
  type: string
  /** Human label ("Started"). */
  action: string
  /** Always "system": every task on a guest is run by the platform. */
  actor: string
  status: "success" | "running" | "error"
  /**
   * Failure message when status is "error". Already generic and safe to render
   * as-is — the API classifies the underlying cause and keeps the real detail in
   * the server log, leaving a `(ref: …)` here to quote to support.
   */
  detail?: string
  started_at: string
  ended_at?: string
  duration_ms?: number
  /** Mirrors started_at. */
  created_at: string
  /** "proxmox" | "simulated". */
  source: string
}

/** Static machine-type descriptor used by local pickers (e.g. autoscaling). */
export interface MachineType {
  name: string
  cpu_count: number
  memory_gb: number
  series: string
}

/**
 * Aggregate compute fleet status (GET /compute/status) — a single account-scoped
 * call powering the overview, replacing the per-resource list fetches it used to
 * count client-side. Counts are numbers; zone codes are strings.
 */
export interface ComputeZoneStatus {
  code: string
  total: number
  running: number
}

export interface ComputeStatus {
  instances: { total: number; running: number; attention: number; vcpu: number }
  disks: { total: number; unattached: number }
  load_balancers: { total: number; failed: number }
  autoscaling: { total: number; suspended: number }
  zones: ComputeZoneStatus[]
}

/** One sample of an instance's resource time series. */
export interface MetricPoint {
  t: number
  /** CPU utilization, percent 0..100. */
  cpu: number
  /** Memory usage, percent 0..100. */
  mem: number
  /** Root disk usage, percent 0..100. */
  disk: number
  /** Disk read+write throughput, MB/s. */
  io: number
  /** Network in+out throughput, MB/s. */
  net: number
  /**
   * Pressure Stall Information (PSI) — percent of the interval tasks were
   * stalled waiting on a resource (avg). "some" = at least one task delayed;
   * "full" = full starvation (all tasks delayed). Zero on hosts without PSI.
   */
  cpu_psi_some: number
  cpu_psi_full: number
  io_psi_some: number
  io_psi_full: number
  mem_psi_some: number
  mem_psi_full: number
}

/** Historical CPU/memory series for an instance (Proxmox-backed or simulated). */
export interface InstanceMetrics {
  source: "proxmox" | "simulated"
  node: string
  points: MetricPoint[]
}
