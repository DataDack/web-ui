import {
  api,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiMeta,
} from "@/services/api/client"

import type {
  KycStatusPatch,
  AddImageVersionRequest,
  AdminLedgerEntry,
  CacheNamespacesResponse,
  CacheStats,
  ClearCacheRequest,
  ClearCacheResponse,
  AdminQuotaRequest,
  AdminUser,
  AdjustBalanceRequest,
  AgentCredentials,
  NodeWebhookRegistration,
  RegisterNodeWebhookRequest,
  ApproveQuotaRequestInput,
  AvailabilityZone,
  BandwidthPrice,
  CatalogServiceAdmin,
  CreateAvailabilityZoneRequest,
  CreateBandwidthPriceRequest,
  CreateImageRequest,
  CreatePVENodeRequest,
  CreateServiceRequest,
  CreateIPPoolRequest,
  CreateStaticIPPriceRequest,
  CreateStoragePriceRequest,
  CreateVMPriceRequest,
  DeleteAccountResponse,
  Image,
  IpPool,
  LBSettings,
  ManagerStatus,
  PlatformSettings,
  UpdateLBSettings,
  UpdatePlatformSettings,
  AccountResource,
  AccountSpend,
  OverviewSection,
  PlatformOverview,
  PoolAddress,
  PoolExpansion,
  PVENode,
  RejectQuotaRequestInput,
  ReserveAddressesRequest,
  StaticIPAllocation,
  StaticIPPrice,
  StoragePrice,
  UpdateAvailabilityZoneRequest,
  UpdateBandwidthPriceRequest,
  UpdateImageRequest,
  UpdateImageVersionRequest,
  UpdateIPPoolRequest,
  UpdatePVENodeRequest,
  UpdateServiceRequest,
  UpdateServiceStateRequest,
  UpdateStaticIPPriceRequest,
  UpdateStoragePriceRequest,
  UpdateVMPriceRequest,
  VMPrice,
} from "./superadmin.types"

// Platform infra catalog admin endpoints — restricted to platform super admins
// (is_super_admin) by the backend. The `/all` lists are unfiltered (include inactive/unavailable
// rows), unlike the public catalog lists used by tenant pickers.
const BASE = "/platform/infra"
const CATALOG_BASE = "/platform/catalog"
const CACHE_BASE = "/platform/cache"
const SETTINGS_BASE = "/platform/settings"
// IP pools live in the VPC (regional) domain, not the platform catalog.
const IPPOOL_BASE = "/vpc/ippools"

// utils.SendList envelope meta: the base ApiMeta plus the pagination block.
// The envelope helpers (apiGet & co) drop meta entirely, so paginated reads
// that need the platform-wide total go through the raw axios instance instead.
type ListMeta = ApiMeta & {
  page?: number
  pageSize?: number
  total?: number
  pages?: number
}

export interface AdminQuotaRequestList {
  rows: AdminQuotaRequest[]
  total: number
}

/** Server page size for the quota request review queue. */
export const QUOTA_REQUESTS_PAGE_SIZE = 100

const QUOTA_REQUESTS_URL = "/quotas/quotas/admin/requests"

function quotaRequestsQuery(status: string, page: number, limit: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set("status", status)
  return `${QUOTA_REQUESTS_URL}?${params.toString()}`
}

export const superAdminApi = {
  /* availability zones */
  listAvailabilityZones: () => apiGet<AvailabilityZone[]>(`${BASE}/availability-zones/all`),
  createAvailabilityZone: (payload: CreateAvailabilityZoneRequest) =>
    apiPost<AvailabilityZone>(`${BASE}/availability-zones`, payload),
  updateAvailabilityZone: (id: string, payload: UpdateAvailabilityZoneRequest) =>
    apiPut<AvailabilityZone>(`${BASE}/availability-zones/${id}`, payload),

  /* pve nodes */
  listPVENodes: () => apiGet<PVENode[]>(`${BASE}/pve-nodes`),
  getPVENode: (id: string) => apiGet<PVENode>(`${BASE}/pve-nodes/${id}`),
  createPVENode: (payload: CreatePVENodeRequest) => apiPost<PVENode>(`${BASE}/pve-nodes`, payload),
  updatePVENode: (id: string, payload: UpdatePVENodeRequest) =>
    apiPut<PVENode>(`${BASE}/pve-nodes/${id}`, payload),
  deletePVENode: (id: string) => apiDelete(`${BASE}/pve-nodes/${id}`),
  // Force an immediate live Proxmox poll and return the refreshed nodes.
  refreshPVENodes: () => apiPost<PVENode[]>(`${BASE}/pve-nodes/refresh`, {}),
  // Generate/regenerate this node's lbagent credential pair. The secret is
  // returned in plaintext ONLY here (never re-readable); regenerating invalidates
  // the previous secret.
  generateAgentCredentials: (id: string) =>
    apiPost<AgentCredentials>(`${BASE}/pve-nodes/${id}/agent-credentials`, {}),
  // One-button setup of this node's outbound notifications: mints/reuses the
  // inbound-webhook secret and pushes the notification target + matcher onto the
  // node over its API. Idempotent — safe to press again to repair config.
  registerNodeWebhook: (id: string, payload: RegisterNodeWebhookRequest = {}) =>
    apiPost<NodeWebhookRegistration>(`${BASE}/pve-nodes/${id}/webhook`, payload),
  // Live reachability of a node's LB manager (healthy / unreachable / no_manager).
  getManagerStatus: (id: string) => apiGet<ManagerStatus>(`${BASE}/pve-nodes/${id}/manager-status`),

  /* load balancer fleet settings — one platform-wide row; PUT replaces it whole */
  getLBSettings: () => apiGet<LBSettings>(`${BASE}/lb-settings`),
  updateLBSettings: (payload: UpdateLBSettings) =>
    apiPut<LBSettings>(`${BASE}/lb-settings`, payload),

  /* images (OS families carrying the icon, with embedded versions) */
  listImages: () => apiGet<Image[]>(`${BASE}/images/all`),
  createImage: (payload: CreateImageRequest) => apiPost<Image>(`${BASE}/images`, payload),
  updateImage: (id: string, payload: UpdateImageRequest) =>
    apiPut<Image>(`${BASE}/images/${id}`, payload),
  deleteImage: (id: string) => apiDelete(`${BASE}/images/${id}`),
  uploadImageIcon: async (id: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    // Post FormData via the raw axios instance; let the browser set the
    // multipart boundary (don't set Content-Type manually).
    const res = await api.post<{ data: Image }>(`${BASE}/images/${id}/icon`, form)
    return res.data.data
  },

  /* image versions (embedded; mutations return the parent image) */
  addImageVersion: (id: string, payload: AddImageVersionRequest) =>
    apiPost<Image>(`${BASE}/images/${id}/versions`, payload),
  updateImageVersion: (id: string, versionId: string, payload: UpdateImageVersionRequest) =>
    apiPut<Image>(`${BASE}/images/${id}/versions/${versionId}`, payload),
  deleteImageVersion: (id: string, versionId: string) =>
    apiDelete<Image>(`${BASE}/images/${id}/versions/${versionId}`),

  /* vm prices */
  listVMPrices: () => apiGet<VMPrice[]>(`${BASE}/vm-prices`),
  createVMPrice: (payload: CreateVMPriceRequest) => apiPost<VMPrice>(`${BASE}/vm-prices`, payload),
  updateVMPrice: (id: string, payload: UpdateVMPriceRequest) =>
    apiPut<VMPrice>(`${BASE}/vm-prices/${id}`, payload),

  /* static ip prices */
  listStaticIPPrices: () => apiGet<StaticIPPrice[]>(`${BASE}/static-ip-prices`),
  createStaticIPPrice: (payload: CreateStaticIPPriceRequest) =>
    apiPost<StaticIPPrice>(`${BASE}/static-ip-prices`, payload),
  updateStaticIPPrice: (id: string, payload: UpdateStaticIPPriceRequest) =>
    apiPut<StaticIPPrice>(`${BASE}/static-ip-prices/${id}`, payload),

  /* bandwidth prices */
  listBandwidthPrices: () => apiGet<BandwidthPrice[]>(`${BASE}/bandwidth-prices`),
  createBandwidthPrice: (payload: CreateBandwidthPriceRequest) =>
    apiPost<BandwidthPrice>(`${BASE}/bandwidth-prices`, payload),
  updateBandwidthPrice: (id: string, payload: UpdateBandwidthPriceRequest) =>
    apiPut<BandwidthPrice>(`${BASE}/bandwidth-prices/${id}`, payload),

  /* ip pools (static IP inventory) */
  listIPPools: () => apiGet<IpPool[]>(IPPOOL_BASE),
  createIPPool: (payload: CreateIPPoolRequest) => apiPost<IpPool>(IPPOOL_BASE, payload),
  updateIPPool: (id: string, payload: UpdateIPPoolRequest) =>
    apiPut<IpPool>(`${IPPOOL_BASE}/${id}`, payload),
  // `force` releases every static IP drawn from the block — including addresses
  // attached to running VMs — instead of refusing the delete.
  deleteIPPool: (id: string, force = false) =>
    apiDelete(`${IPPOOL_BASE}/${id}${force ? "?force=true" : ""}`),
  // Server-side CIDR expansion (used for an existing pool's address drill-in).
  poolAddresses: (id: string) => apiGet<PoolExpansion>(`${IPPOOL_BASE}/${id}/addresses`),
  // Hold addresses back from tenant allocation (platform's own use).
  reservePoolAddresses: (id: string, payload: ReserveAddressesRequest) =>
    apiPost<PoolAddress[]>(`${IPPOOL_BASE}/${id}/reservations`, payload),
  // An IPv4 address is a single path segment — the dots are not separators —
  // so it needs no encoding.
  releasePoolAddress: (id: string, ip: string) =>
    apiDelete(`${IPPOOL_BASE}/${id}/reservations/${ip}`),
  // Platform-wide list of static IPs in use (reserved + associated).
  listStaticIPAllocations: (q?: string) => {
    const search = q ? `&q=${encodeURIComponent(q)}` : ""
    return apiGet<StaticIPAllocation[]>(`${IPPOOL_BASE}/allocations?page=1&limit=500${search}`)
  },
  // Reclaim one address from whatever holds it and return it to its pool. The
  // single-address form of a forced pool delete, and just as destructive: the
  // resource is not reconfigured, it simply stops owning the address.
  releaseStaticIPAllocation: (id: string) => apiDelete(`${IPPOOL_BASE}/allocations/${id}`),

  /* storage prices */
  listStoragePrices: () => apiGet<StoragePrice[]>(`${BASE}/storage-prices/all`),
  createStoragePrice: (payload: CreateStoragePriceRequest) =>
    apiPost<StoragePrice>(`${BASE}/storage-prices`, payload),
  updateStoragePrice: (id: string, payload: UpdateStoragePriceRequest) =>
    apiPut<StoragePrice>(`${BASE}/storage-prices/${id}`, payload),

  /* service catalog — full CRUD + a quick state toggle (enable/disable/coming-soon) */
  listServices: () => apiGet<CatalogServiceAdmin[]>(`${CATALOG_BASE}/services/all`),
  listServiceMetricSources: () => apiGet<string[]>(`${CATALOG_BASE}/services/metric-sources`),
  createService: (payload: CreateServiceRequest) =>
    apiPost<CatalogServiceAdmin>(`${CATALOG_BASE}/services`, payload),
  updateService: (id: string, payload: UpdateServiceRequest) =>
    apiPut<CatalogServiceAdmin>(`${CATALOG_BASE}/services/${id}`, payload),
  updateServiceState: (id: string, payload: UpdateServiceStateRequest) =>
    apiPatch<CatalogServiceAdmin>(`${CATALOG_BASE}/services/${id}/state`, payload),
  deleteService: (id: string) => apiDelete(`${CATALOG_BASE}/services/${id}`),

  /* platform users — list everyone + grant/revoke the super-admin flag */
  listUsers: (q?: string) => {
    const search = q ? `&q=${encodeURIComponent(q)}` : ""
    return apiGet<AdminUser[]>(`/auth/users/admin/list?page=1&limit=200${search}`)
  },
  setSuperAdmin: (id: string, isSuperAdmin: boolean) =>
    apiPatch<AdminUser>(`/auth/users/${id}/super-admin`, { is_super_admin: isSuperAdmin }),

  /* Override a user's KYC state. Both flags are optional so one can move without
	   disturbing the other, which is what the two operator actions need:

	     let them in without verifying -> kyc_completed: true, need_actions: false
	     make them verify again        -> need_actions: true

	   need_actions is the same flag the KYC service itself sets, so a user told to
	   re-verify meets the normal gate on their next request. Nothing is emailed.
	   `reason` is recorded in the server log, since bypassing identity
	   verification without a trail is indistinguishable from a compromise. */
  setKycStatus: (id: string, patch: KycStatusPatch) =>
    apiPatch<AdminUser>(`/auth/users/${id}/kyc`, patch),

  /* platform overview — the org → account → member graph.
	   `section` fetches ONE tab's list (the console shows one at a time), so the
	   Accounts tab never ships the users list and vice versa; `matched` still
	   counts every section, which is what the tab labels read. Omit it for the
	   whole graph. `q` narrows the lists server-side; the headline stats stay
	   platform-wide. */
  getPlatformOverview: (section: OverviewSection | "" = "", q = "", page = 1, limit = 0) => {
    const params = new URLSearchParams()
    if (section) params.set("section", section)
    if (q) params.set("q", q)
    // page/limit only mean anything for a section read — the full-graph read
    // is unpaged by design, so don't imply otherwise by sending them.
    if (section) {
      params.set("page", String(page))
      if (limit) params.set("limit", String(limit))
    }
    const search = params.size > 0 ? `?${params.toString()}` : ""
    return apiGet<PlatformOverview>(`/org/overview${search}`)
  },

  /* per-account permanent resource discount (0–100), super-admin only */
  setAccountDiscount: (accountId: string, permanentDiscount: number) =>
    apiPost<{ id: string; permanent_discount: number }>(`/org/accounts/${accountId}/discount`, {
      permanent_discount: permanentDiscount,
    }),

  /* manual wallet movement (top-up or deduction) on an account, super-admin only.
       The amount is a DELTA in credits, not the new total; the backend recomputes
       accounts.balance and appends the matching ledger entry in one transaction. */
  adjustAccountBalance: (payload: AdjustBalanceRequest) =>
    apiPost<AdminLedgerEntry>("/billing/ledger", payload),

  /* account inventory — every resource (VMs, disks, IPs, VPCs, …) an account owns */
  getAccountResources: (accountId: string) =>
    apiGet<AccountResource[]>(`/resources/search/accounts/${accountId}/resources`),
  deleteAccount: (accountId: string) =>
    apiDelete<DeleteAccountResponse>(`/org/accounts/${accountId}/super-admin-delete`),

  /* account active-spend summary (monthly run-rate, per-kind breakdown, wallet) */
  getAccountSpend: (accountId: string) =>
    apiGet<AccountSpend>(`/billing/charge/accounts/${accountId}/spend`),

  /* quota increase requests — the platform-wide review queue (apps/quotas).
	   The list is paginated server-side (SendList); data is the bare row array,
	   which Go marshals as null when the page is empty. Returned with meta.total
	   so the console can page instead of silently truncating at one page. */
  listQuotaRequests: async (status = "", page = 1): Promise<AdminQuotaRequestList> => {
    const res = await api.get<{ data: AdminQuotaRequest[] | null; meta: ListMeta }>(
      quotaRequestsQuery(status, page, QUOTA_REQUESTS_PAGE_SIZE),
    )
    const rows = res.data.data ?? []
    return { rows, total: res.data.meta.total ?? rows.length }
  },
  // Platform-wide count of requests in one status, read off meta.total with a
  // minimal page — the stat tiles need the number, not the rows.
  countQuotaRequests: async (status: string): Promise<number> => {
    const res = await api.get<{ data: AdminQuotaRequest[] | null; meta: ListMeta }>(
      quotaRequestsQuery(status, 1, 1),
    )
    return res.data.meta.total ?? 0
  },
  approveQuotaRequest: (id: string, payload: ApproveQuotaRequestInput) =>
    apiPost<null>(`/quotas/quotas/admin/requests/${id}/approve`, payload),
  rejectQuotaRequest: (id: string, payload: RejectQuotaRequestInput) =>
    apiPost<null>(`/quotas/quotas/admin/requests/${id}/reject`, payload),

  /* redis cache — the module-wise registry of clearable key families, with
	   live key counts, and the clear itself. Both are super-admin only. */
  getCacheNamespaces: () => apiGet<CacheNamespacesResponse>(`${CACHE_BASE}/namespaces`),
  getCacheStats: () => apiGet<CacheStats>(`${CACHE_BASE}/stats`),
  clearCache: (payload: ClearCacheRequest) =>
    apiPost<ClearCacheResponse>(`${CACHE_BASE}/clear`, payload),

  /* platform policy switches — the KYC and permission gates on resource
	   creation. One row for the whole fleet; the PATCH is partial, so a page
	   editing one switch never has to send (and risk clobbering) the other. */
  getPlatformSettings: () => apiGet<PlatformSettings>(SETTINGS_BASE),
  updatePlatformSettings: (payload: UpdatePlatformSettings) =>
    apiPatch<PlatformSettings>(SETTINGS_BASE, payload),
}
