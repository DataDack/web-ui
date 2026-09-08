import { apiGet } from "@/services/api/client"

import { resolveCatalogService } from "./catalog.paths"
import type { CatalogService } from "./catalog.types"

// Tenant catalog: enabled + coming-soon services with live per-tenant metrics.
// Admin/management endpoints live in the superadmin module.
export const catalogApi = {
  listServices: async () => {
    const services = await apiGet<CatalogService[]>("/platform/catalog/services")
    return services.map(resolveCatalogService)
  },
}

export const CATALOG_QUERY_KEYS = {
  services: ["catalog", "services"] as const,
}
