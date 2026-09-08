import type { CatalogService } from "./catalog.types"

/** Older catalog entries still point the combined traffic service at Networking. */
export function resolveCatalogService(service: CatalogService): CatalogService {
  if (service.key === "traffic" && service.path.replace(/\/$/, "") === "/networking") {
    return { ...service, path: "/api-gateway" }
  }
  return service
}
