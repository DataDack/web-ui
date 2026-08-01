export const LB_ROUTES = {
  ROOT: "/compute/load-balancers",
  CREATE: "/compute/load-balancers/create",
  DETAIL: "/compute/load-balancers/:id",
  detail: (id: string) => `/compute/load-balancers/${id}`,
} as const

export const LB_QUERY_KEYS = {
  list: ["load-balancers", "list"] as const,
  detail: (id: string) => ["load-balancers", "detail", id] as const,
  listeners: (id: string) => ["load-balancers", "listeners", id] as const,
  subnets: (id: string) => ["load-balancers", "subnets", id] as const,
}

/**
 * States with a Proxmox transition still in flight. The UI polls while a load
 * balancer sits in one of these so it settles on its own the moment the backend
 * flips the row — provisioning genuinely does work now (clone the container,
 * configure it, boot it, push haproxy.cfg), and without polling a provisioning
 * LB would spin in the console forever.
 */
const LB_TRANSITIONAL: ReadonlySet<string> = new Set(["provisioning", "pending", "deleting"])

export function isLbTransitional(status: string): boolean {
  return LB_TRANSITIONAL.has(status)
}
