export interface Zone {
  id: string
  region: string
  region_name: string
  zone: string
  city: string
  country: string
  is_active: boolean
}

export interface MachineType {
  id: string
  name: string
  family: string
  vcpus: number
  memory_gb: number
  gpu_count: number
  gpu_type: string
  network_gbps: number
  is_active: boolean
}

/* ── Public provisioning catalog (admin-managed global infra data) ─────────
 * Aggregated, pick-ready views from cloud-be-go /platform/infra/catalog/* and
 * /platform/infra/vm-prices. The admin's global catalog is the source of truth
 * for the instance-creation wizard: regions/zones, OS families/versions, and
 * the hourly/monthly pricing that drives the provisioning-cost estimate. */

export interface ImageVersion {
  id: string
  name: string
  os_version: string
  architecture: string
  min_disk_gb: number
  is_default: boolean
}

export interface ImageCatalogFamily {
  id: string
  name: string
  display_name: string
  description: string
  icon_url: string
  sort_order: number
  versions: ImageVersion[]
}

export interface AvailabilityZoneBrief {
  id: string
  code: string
  name: string
  is_available: boolean
}

export interface RegionCatalog {
  id: string
  code: string
  name: string
  country: string
  availability_zones: AvailabilityZoneBrief[]
}

export type VMPriceFamily = "standard" | "compute" | "memory" | "gpu"

/** A priced machine-type offering, scoped to one availability zone. */
export interface VMPriceOption {
  id: string
  availability_zone_id: string
  sku: string
  name: string
  display_name: string
  description: string
  family: VMPriceFamily
  generation: string
  architecture: "x86_64" | "arm64"
  hypervisor: string
  vcpus: number
  ram_gb: number
  cpu_vendor: string
  cpu_model: string
  clock_ghz: number
  gpu_count: number
  gpu_type: string
  local_disk_gb: number
  default_boot_disk_gb: number
  max_data_disks: number
  max_nics: number
  bandwidth_gbps: number
  network_tier: string
  ipv4_included: number
  ipv6_supported: boolean
  baseline_iops: number
  burst_iops: number
  features: string
  price_hourly: number
  price_monthly: number
  price_yearly: number
  price_spot_hourly: number
  price_reserved_monthly: number
  price_reserved_yearly: number
  setup_fee: number
  currency: string
  billing_unit: "second" | "minute" | "hour" | "month" | undefined
  billing_increment_seconds: number
  tax_inclusive: boolean
  sort_order: number
}

/** A priced static (public) IP offering, scoped to one availability zone.
 * Mirrors cloud-be-go's static-ip-price catalog row; the wizard uses it to show
 * the extra charge when an instance opts into a public IPv4 address. */
export interface StaticIPPriceOption {
  id: string
  availability_zone_id: string
  sku: string
  name: string
  ip_version: string
  address_type: string
  network_tier: string
  price_hourly: number
  price_idle_hourly: number
  price_monthly: number
  setup_fee: number
  currency: string
  billing_unit: "second" | "minute" | "hour" | "month"
  billing_increment_seconds: number
  tax_inclusive: boolean
  is_active: boolean
}

/** A priced block-storage offering for one storage class, scoped to one
 * availability zone. `price_per_gb_month` drives the data-disk charge in the
 * instance-creation cost summary as the user changes the disk size. */
export interface StoragePriceOption {
  id: string
  availability_zone_id: string
  sku: string
  name: string
  storage_type: "ssd" | "hdd" | "nvme"
  min_size_gb: number
  max_size_gb: number
  price_per_gb_month: number
  currency: string
  billing_unit: string
  is_active: boolean
}

/** A priced network data-transfer (bandwidth) offering, scoped to one
 * availability zone. `included_gb` is the free monthly quota; usage beyond it
 * is charged at `price_per_gb`. Drives the bandwidth line on the
 * instance-creation cost summary. */
export interface BandwidthPriceOption {
  id: string
  availability_zone_id: string
  sku: string
  name: string
  direction: "egress" | "ingress" | "both"
  included_gb: number
  price_per_gb: number
  currency: string
  billing_unit: "gb"
  tax_inclusive: boolean
  is_active: boolean
}
