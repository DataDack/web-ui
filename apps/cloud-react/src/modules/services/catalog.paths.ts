import type { CatalogService } from "./catalog.types"

/**
 * Landing paths the API Gateway has already been served from. The service was
 * born inside VPC (/networking), moved under it as its own page
 * (/networking/api-gateway), and on 2026-09-05 moved to the top level with the
 * rest of its control plane. Catalog rows are operator-edited data, so rows
 * written before each move still carry the older path and would land the tile
 * on a 404.
 */
const STALE_TRAFFIC_PATHS = new Set(["/networking", "/networking/api-gateway"])

/** The path the API Gateway actually routes at today — see api-gateway.router.tsx. */
const TRAFFIC_PATH = "/api-gateway"

/** Older catalog entries still point the combined traffic service at Networking. */
export function resolveCatalogService(service: CatalogService): CatalogService {
  if (service.key === "traffic" && STALE_TRAFFIC_PATHS.has(service.path.replace(/\/+$/, ""))) {
    return { ...service, path: TRAFFIC_PATH }
  }
  return service
}
