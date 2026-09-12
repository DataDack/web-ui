import { apiGet } from "@/services/api/client"

import { resolveCatalogService } from "./catalog.paths"
import type { CatalogModule, CatalogService } from "./catalog.types"

// Tenant catalog: enabled + coming-soon services with live per-tenant metrics.
// Admin/management endpoints live in the superadmin module.
export const catalogApi = {
  listServices: async () => {
    const services = await apiGet<CatalogService[]>("/platform/catalog/services")
    return services.map(resolveCatalogService)
  },

  // Sidebar nav-item states. Disabled modules are already filtered out
  // server-side, so anything returned here is meant to be rendered.
  listModules: () => apiGet<CatalogModule[]>("/platform/catalog/services/modules"),
}

export const CATALOG_QUERY_KEYS = {
  services: ["catalog", "services"] as const,
  modules: ["catalog", "modules"] as const,
}
