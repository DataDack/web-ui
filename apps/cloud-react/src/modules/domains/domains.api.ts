import { api, apiDelete, apiGet, apiPost, apiPut, type ApiMeta } from "@/services/api/client"

import type {
  CreateDomainRequest,
  Domain,
  DomainAdminListParams,
  DomainList,
  DomainListParams,
  SetDomainRedirectRequest,
} from "./domains.types"

// cloud-be-go: app "domains", module "registry" -> base /domains/registry.
//
// The registry lives in cloud-be-go (apps/domains/registry) and owns platform_domains:
// every hostname the platform answers for, system-minted or customer-brought.
const BASE = "/domains/registry"

// utils.SendList envelope meta: the base ApiMeta plus the pagination block.
// The apiGet helper drops meta entirely, so these paginated reads go through
// the raw axios instance to keep meta.total for the server-side pager.
type ListMeta = ApiMeta & {
  page?: number
  pageSize?: number
  total?: number
  pages?: number
}

/** Serialize only the params that are actually set — the backend treats an
 *  absent param and an empty one differently (managed= would parse as false). */
function buildQuery(params: DomainListParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    query.set(key, String(value))
  }
  return query.toString()
}

async function fetchList(url: string): Promise<DomainList> {
  const res = await api.get<{ data: Domain[] | null; meta: ListMeta }>(url)
  const rows = res.data.data ?? []
  return { rows, total: res.data.meta.total ?? rows.length }
}

export const domainsApi = {
  list: (params: DomainListParams): Promise<DomainList> =>
    fetchList(`${BASE}/?${buildQuery(params)}`),

  /**
   * Every account's hostnames — GET /domains/registry/admin, super-admin only.
   * Rows carry account_id but no account name: accounts live in another
   * database, so the console resolves the name itself.
   */
  listForAdmin: (params: DomainAdminListParams): Promise<DomainList> =>
    fetchList(`${BASE}/admin?${buildQuery(params)}`),

  /** One enriched row, keyed by hostname (the registry's own identifier). */
  get: (hostname: string): Promise<Domain> =>
    apiGet<Domain>(`${BASE}/${encodeURIComponent(hostname)}`),

  // Claim a CUSTOM hostname for a resource. Refusals worth surfacing verbatim:
  // 400 invalid/platform-zone, 409 taken, 422 the resource has no platform
  // hostname yet (deploy first), 403 quota.
  create: (body: CreateDomainRequest): Promise<Domain> => apiPost<Domain>(`${BASE}/`, body),

  /** Run the ownership check now. The server refuses re-checks within 10s (4xx). */
  verify: (hostname: string): Promise<Domain> =>
    apiPost<Domain>(`${BASE}/${encodeURIComponent(hostname)}/verify`),

  /** CUSTOM rows only — managed hostnames retire with their resource. */
  remove: (hostname: string): Promise<void> => apiDelete(`${BASE}/${encodeURIComponent(hostname)}`),

  /**
   * Point a hostname at another one.
   *
   * Its OWN sub-resource, not a field on a domain update — there is no domain
   * update. The redirect is the only part of the edge policy document a tenant
   * may write; the same document carries the WAF and the static release, and a
   * whole-document save from this client is how those get erased.
   *
   * 400 when the destination is not a bare hostname, when it is the hostname
   * itself (which the browser answers with ERR_TOO_MANY_REDIRECTS), or when the
   * domain has not been verified yet.
   */
  setRedirect: ({ hostname, ...body }: SetDomainRedirectRequest): Promise<Domain> =>
    apiPut<Domain>(`${BASE}/${encodeURIComponent(hostname)}/redirect`, body),

  /** Stop redirecting, so the hostname serves its resource again. */
  clearRedirect: (hostname: string): Promise<Domain> =>
    apiDelete<Domain>(`${BASE}/${encodeURIComponent(hostname)}/redirect`),
}
