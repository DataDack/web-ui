import type { AdminDomainListParams, DomainListParams } from "./domains.types"

/** Server page size for both registry tables. */
export const DOMAINS_PAGE_SIZE = 25

/**
 * Filter params flattened to a plain object with unset keys dropped, so two
 * calls that mean the same request hash to the same query key regardless of
 * which optional params the caller spelled out as undefined.
 */
function serializeParams(params: AdminDomainListParams): Record<string, string> {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)] as const)
  return Object.fromEntries(entries)
}

export const DOMAINS_QUERY_KEYS = {
  list: (params: DomainListParams) => ["domains", "list", serializeParams(params)] as const,
  admin: (params: AdminDomainListParams) => ["domains", "admin", serializeParams(params)] as const,
}

/**
 * "pending" is the one in-flight registry status: the hostname row exists but
 * DNS/routing is still being realized. The lists poll fast while any row sits
 * there so it settles on its own, and slowly otherwise — a registry row can
 * still be flipped from outside (suspension, release) without a user action.
 */
export function isDomainTransitional(status: string): boolean {
  return status === "pending"
}
