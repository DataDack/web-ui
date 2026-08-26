import type { CatalogService } from "./catalog.types"

/**
 * The console namespace a path belongs to: "/support/tickets" → "/support",
 * "/compute/overview" → "/compute", "/managed-apps?tab=apps" → "/managed-apps".
 *
 * A catalog `path` is a landing page, which may sit a level below the service's
 * own namespace, while the gate has to cover every page under that service.
 * Matching on the first segment is what makes /compute/instances answer to the
 * Compute row whose path is /compute/overview.
 */
export function serviceRoot(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path
  const segment = withoutQuery.split("/")[1] ?? ""
  return segment ? `/${segment}` : "/"
}

export type ServiceGate = "active" | "maintenance"

/**
 * Whether the console should render `pathname` or the maintenance notice —
 * decided by the admin-managed service catalog (super admin → Services), which
 * is the single source of truth for what is open. Nothing about this list is
 * hardcoded in the frontend any more: flipping a service's state or status in
 * the admin table opens or closes its pages on the next catalog fetch.
 *
 * A service is open when its row is `enabled` and its status is not
 * `maintenance`. `coming_soon` and `maintenance` both land on the maintenance
 * page — the first has never opened, the second is closed for now.
 *
 * A path no catalog row claims is OPEN. The gate's job is to close a launched
 * service, not to hide pages the catalog has never described (/accounts,
 * /hosting, /domains) — and since the tenant endpoint omits `disabled`
 * services entirely, a missing row is not evidence of anything either way.
 */
export function gateForPath(pathname: string, services: CatalogService[]): ServiceGate {
  const root = serviceRoot(pathname)
  const owner = services.find((svc) => serviceRoot(svc.path) === root)
  if (!owner) return "active"
  return owner.state === "enabled" && owner.status !== "maintenance" ? "active" : "maintenance"
}

/** The services an operator has closed — what the console-home banner reports. */
export function hasClosedService(services: CatalogService[]): boolean {
  return services.some((svc) => gateForPath(svc.path, services) === "maintenance")
}
