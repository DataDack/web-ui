import { apiGet } from "@/services/api/client"

import type { CatalogService } from "./catalog.types"

// Tenant catalog: enabled + coming-soon services with live per-tenant metrics.
// Admin/management endpoints live in the superadmin module.
export const catalogApi = {
    listServices: () => apiGet<CatalogService[]>("/platform/catalog/services"),
}

export const CATALOG_QUERY_KEYS = {
    services: ["catalog", "services"] as const,
}
