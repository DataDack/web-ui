// Tenant-facing shape of the admin-managed service catalog. The backend never
// sends disabled services here, and resolves metric specs to live per-tenant
// counts before responding.

export type CatalogState = "enabled" | "coming_soon" | "disabled"
export type CatalogStatus = "operational" | "degraded" | "maintenance"

export interface CatalogMetric {
  label: string
  value: number
  accent: boolean
}

export interface CatalogService {
  id: number
  key: string
  name: string
  /**
   * Tile label for the narrow Console-home grid, where the full name does not
   * fit. Already resolved server-side — it falls back to `name` when the admin
   * left it blank, so there is nothing to default here.
   */
  short_name: string
  description: string
  icon: string
  category: string
  path: string
  state: CatalogState
  status: CatalogStatus
  sort_order: number
  metrics: CatalogMetric[]
}
