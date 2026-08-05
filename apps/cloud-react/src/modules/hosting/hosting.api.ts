import { apiDelete, apiGet, apiPatch, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import { HOSTING_API } from "./hosting.constants"
import type {
  AdminCreateRequest,
  AdminHostingAccount,
  AdminPlansResponse,
  HostingAccount,
  HostingAuditLog,
  HostingJob,
  HostingModule,
  HostingPlan,
  HostingServer,
  ImportCandidate,
  ImportRequest,
  JobStatus,
  OrderRequest,
  PanelPackage,
  PlanGroup,
  ProbeResult,
  PublicPlansResponse,
  SaveGroupRequest,
  SaveServerRequest,
  ServerGroup,
} from "./hosting.types"

/** Endpoints that answer `{ items: [...] }`. */
interface Items<T> {
  items: T[]
}

/**
 * The body of an endpoint that returns nothing useful — a queued action, a
 * delete. Named rather than `void` because a type argument is a value position:
 * `void` there says "no value exists", which is not what an empty JSON object is.
 */
type NoContent = Record<string, never>

export const hostingApi = {
  /* ── Tenant ──────────────────────────────────────────────────────────── */

  // The pricing catalogue. Unauthenticated on the backend and served from S3,
  // so it renders before the session is even resolved.
  publicPlans: () => apiGet<PublicPlansResponse>(`${HOSTING_API.plans}/`),

  listAccounts: () =>
    apiGet<Items<HostingAccount>>(`${HOSTING_API.accounts}/`).then((r) => r.items),

  getAccount: (id: string) => apiGet<HostingAccount>(`${HOSTING_API.accounts}/${id}`),

  order: (body: OrderRequest) => apiPost<HostingAccount>(`${HOSTING_API.accounts}/`, body),

  login: (id: string) =>
    apiPost<{ url: string }>(`${HOSTING_API.accounts}/${id}/login`).then((r) => r.url),

  changePlan: (id: string, body: { plan_sku: string; idempotency_key: string }) =>
    apiPatch<NoContent>(`${HOSTING_API.accounts}/${id}/plan`, body),

  resetPassword: (id: string, body: { password?: string; idempotency_key: string }) =>
    apiPost<{ password: string }>(`${HOSTING_API.accounts}/${id}/password`, body).then(
      (r) => r.password,
    ),

  cancel: (id: string, body: { reason: string; idempotency_key: string }) =>
    apiPost<NoContent>(`${HOSTING_API.accounts}/${id}/cancel`, body),

  /* ── Admin: provisioning modules ─────────────────────────────────────── */

  listModules: () =>
    apiGet<Items<HostingModule>>(`${HOSTING_API.modules}/admin/`).then((r) => r.items),

  /* ── Admin: servers ──────────────────────────────────────────────────── */

  listServers: () =>
    apiGet<Items<HostingServer>>(`${HOSTING_API.servers}/admin/`).then((r) => r.items),

  getServer: (id: string) => apiGet<HostingServer>(`${HOSTING_API.servers}/admin/${id}`),

  createServer: (body: SaveServerRequest) =>
    apiPost<HostingServer>(`${HOSTING_API.servers}/admin/`, body),

  updateServer: (id: string, body: SaveServerRequest) =>
    apiPut<HostingServer>(`${HOSTING_API.servers}/admin/${id}`, body),

  deleteServer: (id: string) => apiDelete(`${HOSTING_API.servers}/admin/${id}`),

  // Test Connection. The backend answers 200 with ok:false for a reachable-but-
  // refusing box, so the form can show the reason inline instead of a toast.
  testServer: (id: string) => apiPost<ProbeResult>(`${HOSTING_API.servers}/admin/${id}/test`),

  serverPackages: (id: string) =>
    apiGet<Items<PanelPackage>>(`${HOSTING_API.servers}/admin/${id}/packages`).then((r) => r.items),

  listServerGroups: () =>
    apiGet<Items<ServerGroup>>(`${HOSTING_API.servers}/admin/groups`).then((r) => r.items),

  createServerGroup: (body: SaveGroupRequest) =>
    apiPost<ServerGroup>(`${HOSTING_API.servers}/admin/groups`, body),

  updateServerGroup: (id: string, body: SaveGroupRequest) =>
    apiPut<ServerGroup>(`${HOSTING_API.servers}/admin/groups/${id}`, body),

  deleteServerGroup: (id: string) => apiDelete(`${HOSTING_API.servers}/admin/groups/${id}`),

  /* ── Admin: plans ────────────────────────────────────────────────────── */

  adminPlans: () => apiGet<AdminPlansResponse>(`${HOSTING_API.plans}/admin/`),

  adminPlan: (sku: string) => apiGet<HostingPlan>(`${HOSTING_API.plans}/admin/${sku}`),

  createPlan: (body: HostingPlan) => apiPost<HostingPlan>(`${HOSTING_API.plans}/admin/`, body),

  updatePlan: (sku: string, body: HostingPlan) =>
    apiPut<HostingPlan>(`${HOSTING_API.plans}/admin/${sku}`, body),

  deletePlan: (sku: string) => apiDelete(`${HOSTING_API.plans}/admin/${sku}`),

  savePlanGroup: (body: PlanGroup, prevKey?: string) =>
    prevKey
      ? apiPut<PlanGroup>(`${HOSTING_API.plans}/admin/groups/${prevKey}`, body)
      : apiPost<PlanGroup>(`${HOSTING_API.plans}/admin/groups`, body),

  deletePlanGroup: (key: string) => apiDelete(`${HOSTING_API.plans}/admin/groups/${key}`),

  /* ── Admin: accounts ─────────────────────────────────────────────────── */

  adminAccounts: (params?: {
    status?: string
    server_id?: string
    plan_sku?: string
    q?: string
  }) => {
    const qs = new URLSearchParams({ page: "1", limit: "100" })
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v) qs.set(k, v)
    })
    return apiGet<AdminHostingAccount[]>(`${HOSTING_API.accounts}/admin/?${qs.toString()}`)
  },

  adminAccount: (id: string) => apiGet<AdminHostingAccount>(`${HOSTING_API.accounts}/admin/${id}`),

  adminCreateAccount: (body: AdminCreateRequest) =>
    apiPost<AdminHostingAccount>(`${HOSTING_API.accounts}/admin/`, body),

  adminSuspend: (id: string, reason: string) =>
    apiPost<NoContent>(`${HOSTING_API.accounts}/admin/${id}/suspend`, { reason }),

  adminUnsuspend: (id: string) =>
    apiPost<NoContent>(`${HOSTING_API.accounts}/admin/${id}/unsuspend`),

  adminTerminate: (id: string, reason: string) =>
    apiPost<NoContent>(`${HOSTING_API.accounts}/admin/${id}/terminate`, { reason }),

  adminChangePlan: (id: string, planSku: string) =>
    apiPost<NoContent>(`${HOSTING_API.accounts}/admin/${id}/plan`, { plan_sku: planSku }),

  adminResetPassword: (id: string, password?: string) =>
    apiPost<{ password: string }>(`${HOSTING_API.accounts}/admin/${id}/password`, {
      password,
    }).then((r) => r.password),

  adminSync: (id: string) => apiPost<NoContent>(`${HOSTING_API.accounts}/admin/${id}/sync`),

  adminMove: (id: string, serverId: string) =>
    apiPost<AdminHostingAccount>(`${HOSTING_API.accounts}/admin/${id}/move`, {
      server_id: serverId,
    }),

  adminLogin: (id: string) =>
    apiPost<{ url: string }>(`${HOSTING_API.accounts}/admin/${id}/login`).then((r) => r.url),

  scanImport: (serverId: string) =>
    apiGet<Items<ImportCandidate>>(`${HOSTING_API.accounts}/admin/import/${serverId}`).then(
      (r) => r.items,
    ),

  runImport: (body: ImportRequest) =>
    apiPost<{ items: ImportCandidate[]; dry_run: boolean }>(
      `${HOSTING_API.accounts}/admin/import`,
      body,
    ),

  /* ── Admin: queue ────────────────────────────────────────────────────── */

  listJobs: (status?: JobStatus) => {
    const qs = new URLSearchParams({ page: "1", limit: "100" })
    if (status) qs.set("status", status)
    return apiGet<HostingJob[]>(`${HOSTING_API.jobs}/admin/?${qs.toString()}`)
  },

  jobCounts: () => apiGet<Record<string, number>>(`${HOSTING_API.jobs}/admin/counts`),

  retryJob: (id: string) => apiPost<HostingJob>(`${HOSTING_API.jobs}/admin/${id}/retry`),

  cancelJob: (id: string) => apiPost<NoContent>(`${HOSTING_API.jobs}/admin/${id}/cancel`),

  /* ── Admin: audit ────────────────────────────────────────────────────── */

  auditTrail: (params?: { account_id?: string; server_id?: string; action?: string }) => {
    const qs = new URLSearchParams({ page: "1", limit: "100" })
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v) qs.set(k, v)
    })
    return apiGet<HostingAuditLog[]>(`${HOSTING_API.audit}/admin/?${qs.toString()}`)
  },
}

export { LIST_QUERY }
