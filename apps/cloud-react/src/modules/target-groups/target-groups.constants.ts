export const TG_ROUTES = {
  ROOT: "/compute/target-groups",
  CREATE: "/compute/target-groups/create",
  DETAIL: "/compute/target-groups/:id",
  detail: (id: string) => `/compute/target-groups/${id}`,
} as const

export const TG_QUERY_KEYS = {
  list: ["target-groups", "list"] as const,
  detail: (id: string) => ["target-groups", "detail", id] as const,
  targets: (id: string) => ["target-groups", "targets", id] as const,
}

/** Health-check interval choices, in seconds. Backend accepts 5–300. */
export const HEALTH_CHECK_INTERVALS = [10, 15, 30, 60, 120] as const

/**
 * A target's health is written by the backend's poller, which scrapes HAProxy
 * every 30s. "initial" means registered but not yet checked — it resolves on
 * its own, so the targets table keeps polling while any target sits there.
 */
const TARGET_TRANSITIONAL: ReadonlySet<string> = new Set(["initial"])

export function isTargetTransitional(health: string): boolean {
  return TARGET_TRANSITIONAL.has(health)
}
