import { api, apiDelete, apiGet, apiPost, type ApiMeta } from "@/services/api/client"

import type {
  AdminDomainListParams,
  CreateDomainRequest,
  Domain,
  DomainList,
  DomainListParams,
} from "./domains.types"

// cloud-be-go: app "domains", module "registry" -> base /domains/registry.
// Tenant list:  GET /            (account-scoped via X-Account-Id)
// Admin list:   GET /admin       (platform-wide; rows carry account_name/number)
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
function buildQuery(params: AdminDomainListParams): string {
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

  adminList: (params: AdminDomainListParams): Promise<DomainList> =>
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
  remove: (hostname: string): Promise<void> =>
    apiDelete(`${BASE}/${encodeURIComponent(hostname)}`),
}
