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

/**
 * One sidebar nav item whose visibility the platform admin controls.
 *
 * The backend stores STATE ONLY — icons, translation keys and route paths stay
 * in `sidebar-nav.ts`, which is the only place they can live. A module the API
 * does not mention keeps whatever the static definition says, so a nav item
 * shipped ahead of its catalog row still renders.
 *
 * `service_key` matches CONSOLE_SERVICES[].key, not CatalogService.key: the
 * sidebar groups by navigation and the catalog by product, and the two names
 * differ for networking/vpc, managed-apps/managedapps and
 * automations/ai-workflows.
 */
export interface CatalogModule {
  id: string
  service_key: string
  key: string
  name: string
  path: string
  state: CatalogState
  sort_order: number
}
