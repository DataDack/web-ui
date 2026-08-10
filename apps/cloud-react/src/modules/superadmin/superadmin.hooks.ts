import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { RegionCatalog } from "@/modules/catalog/catalog.types"
import { apiGet, extractError } from "@/services/api/client"

import { superAdminApi } from "./superadmin.api"
import { SUPERADMIN_QUERY_KEYS } from "./superadmin.constants"
import type {
  KycStatusPatch,
  AddImageVersionRequest,
  AdjustBalanceRequest,
  ApproveQuotaRequestInput,
  ClearCacheRequest,
  CreateAvailabilityZoneRequest,
  CreateBandwidthPriceRequest,
  CreateImageRequest,
  CreateIPPoolRequest,
  CreatePVENodeRequest,
  CreateServiceRequest,
  CreateStaticIPPriceRequest,
  CreateStoragePriceRequest,
  CreateVMPriceRequest,
  OverviewSection,
  QuotaRequestStatus,
  RejectQuotaRequestInput,
  ReserveAddressesRequest,
  UpdateAvailabilityZoneRequest,
  UpdateBandwidthPriceRequest,
  UpdateImageRequest,
  UpdateImageVersionRequest,
  UpdateIPPoolRequest,
  UpdateLBSettings,
  UpdatePlatformSettings,
  UpdatePVENodeRequest,
  UpdateServiceRequest,
  UpdateServiceStateRequest,
  UpdateStaticIPPriceRequest,
  UpdateStoragePriceRequest,
  UpdateVMPriceRequest,
} from "./superadmin.types"

/* ── Platform regions (public catalog, for the region selector) ────────── */

// Public region → AZ catalog, used by the tenant region selector. Each entry is
// already region-grained (keyed by code).
export function usePlatformRegions() {
  return useQuery({
    queryKey: ["platform", "regions"] as const,
    queryFn: () => apiGet<RegionCatalog[]>("/platform/infra/catalog/regions"),
    staleTime: 10 * 60 * 1000,
  })
}

/* ── Admin listings (unfiltered) ───────────────────────────────────────── */

export function useAdminAvailabilityZones() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.availabilityZones,
    queryFn: superAdminApi.listAvailabilityZones,
  })
}

export function useAdminPVENodes() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.pveNodes,
    queryFn: superAdminApi.listPVENodes,
  })
}

export function useAdminPVENode(id?: string) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.pveNodes, id],
    queryFn: () => superAdminApi.getPVENode(id ?? ""),
    enabled: !!id,
  })
}

export function useAdminImages() {
  return useQuery({ queryKey: SUPERADMIN_QUERY_KEYS.images, queryFn: superAdminApi.listImages })
}

export function useAdminVMPrices() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.vmPrices,
    queryFn: superAdminApi.listVMPrices,
  })
}

export function useAdminStaticIPPrices() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.staticIpPrices,
    queryFn: superAdminApi.listStaticIPPrices,
  })
}

export function useAdminIPPools() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.ipPools,
    queryFn: superAdminApi.listIPPools,
  })
}

// Every address in one pool, tagged with its allocation state. Only fetched
// while the address drill-in is open — the expansion is server-side work that
// nothing on the list view needs.
export function useAdminIPPoolAddresses(poolId: string | undefined) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.ipPoolAddresses, poolId ?? ""] as const,
    queryFn: () => superAdminApi.poolAddresses(poolId ?? ""),
    enabled: !!poolId,
  })
}

// Platform-wide static IPs in use (reserved + associated). Optional name/IP query.
export function useAdminStaticIPAllocations(q?: string) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.staticIpAllocations, q ?? ""] as const,
    queryFn: () => superAdminApi.listStaticIPAllocations(q),
  })
}

export function useAdminBandwidthPrices() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.bandwidthPrices,
    queryFn: superAdminApi.listBandwidthPrices,
  })
}

export function useAdminStoragePrices() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.storagePrices,
    queryFn: superAdminApi.listStoragePrices,
  })
}

export function useAdminServices() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.services,
    queryFn: superAdminApi.listServices,
  })
}

export function useServiceMetricSources() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.serviceMetricSources,
    queryFn: superAdminApi.listServiceMetricSources,
    staleTime: 30 * 60 * 1000,
  })
}

/* ── Availability zones ────────────────────────────────────────────────── */

export function useSaveAvailabilityZone() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateAvailabilityZoneRequest | UpdateAvailabilityZoneRequest
    }) =>
      vars.id
        ? superAdminApi.updateAvailabilityZone(
            vars.id,
            vars.payload as UpdateAvailabilityZoneRequest,
          )
        : superAdminApi.createAvailabilityZone(vars.payload as CreateAvailabilityZoneRequest),
    onSuccess: (_az, vars) => {
      void queryClient.invalidateQueries({
        queryKey: SUPERADMIN_QUERY_KEYS.availabilityZones,
      })
      toast.success(
        vars.id
          ? t("superAdmin.toasts.availabilityZoneUpdated")
          : t("superAdmin.toasts.availabilityZoneCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.availabilityZoneFailed"))),
  })
}

/* ── PVE nodes ─────────────────────────────────────────────────────────── */

export function useSavePVENode() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id?: string; payload: CreatePVENodeRequest | UpdatePVENodeRequest }) =>
      vars.id
        ? superAdminApi.updatePVENode(vars.id, vars.payload as UpdatePVENodeRequest)
        : superAdminApi.createPVENode(vars.payload as CreatePVENodeRequest),
    onSuccess: (_node, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.pveNodes })
      toast.success(
        vars.id ? t("superAdmin.toasts.pveNodeUpdated") : t("superAdmin.toasts.pveNodeCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.pveNodeFailed"))),
  })
}

/** Force an immediate live Proxmox poll, then seed the list cache with the result. */
export function useRefreshPVENodes() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: () => superAdminApi.refreshPVENodes(),
    onSuccess: (nodes) => {
      queryClient.setQueryData(SUPERADMIN_QUERY_KEYS.pveNodes, nodes)
      toast.success(t("superAdmin.toasts.pveNodeRefreshed"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.pveNodeRefreshFailed"))),
  })
}

export function useDeletePVENode() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string }) => superAdminApi.deletePVENode(vars.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.pveNodes })
      toast.success(t("superAdmin.toasts.pveNodeDeleted"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.pveNodeDeleteFailed"))),
  })
}

/**
 * Generate/regenerate a node's lbagent credential pair. The returned secret is
 * shown once (never re-readable), so callers keep it from onSuccess — this hook
 * only surfaces the toast and refreshes the node caches (agent_client_id /
 * has_agent_secret change). Invalidates both the list and the single-node query.
 */
export function useGenerateAgentCredentials() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string }) => superAdminApi.generateAgentCredentials(vars.id),
    onSuccess: (_creds, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.pveNodes })
      void queryClient.invalidateQueries({
        queryKey: [...SUPERADMIN_QUERY_KEYS.pveNodes, vars.id],
      })
      toast.success(t("superAdmin.toasts.agentCredentialsGenerated"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.agentCredentialsFailed"))),
  })
}

/**
 * Register (or re-register) a node's webhook notification target on the node
 * itself. Idempotent, so this doubles as the repair action after someone edits
 * notifications.cfg by hand. A rotate returns a one-time secret the caller
 * surfaces from onSuccess; this hook only toasts and refreshes the node caches
 * (has_webhook_secret / webhook_registered_at change).
 */
export function useRegisterNodeWebhook() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; rotate?: boolean; callbackUrl?: string }) =>
      superAdminApi.registerNodeWebhook(vars.id, {
        rotate: vars.rotate,
        // Omit rather than send "" — the server treats absent as "resolve the
        // default", and an empty string would fail its url validation.
        ...(vars.callbackUrl ? { callback_url: vars.callbackUrl } : {}),
      }),
    onSuccess: (_res, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.pveNodes })
      void queryClient.invalidateQueries({
        queryKey: [...SUPERADMIN_QUERY_KEYS.pveNodes, vars.id],
      })
      toast.success(t("superAdmin.toasts.nodeWebhookRegistered"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.nodeWebhookFailed"))),
  })
}

/* ── Platform policy switches ──────────────────────────────────────────── */

// The two platform-wide gates on resource creation. staleTime is 0 because
// another operator (or another replica's cache) can have moved them since the
// page was opened, and this page's entire job is showing what is enforced right
// now — a cached "off" next to a live "on" is the one thing it must not do.
export function usePlatformSettings() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.platformSettings,
    queryFn: superAdminApi.getPlatformSettings,
    staleTime: 0,
  })
}

// Flips one or both switches. The server's response is authoritative — it
// resolves overrides against the deployment defaults — so it is written
// straight into the cache rather than the optimistic value the toggle sent.
export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: UpdatePlatformSettings) => superAdminApi.updatePlatformSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(SUPERADMIN_QUERY_KEYS.platformSettings, settings)
      toast.success(t("superAdmin.platformSettings.toasts.saved"))
    },
    // The 409 for "cannot require KYC without a configured service" carries a
    // precise message; surfacing the server's text beats a generic failure.
    onError: (e) => toast.error(extractError(e, t("superAdmin.platformSettings.toasts.failed"))),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.platformSettings })
    },
  })
}

/* ── Load balancer fleet settings ──────────────────────────────────────── */

// The single platform-wide LB fleet settings row. Rarely changes, so keep it
// cached; the form's Reset button re-seeds from this cache.
export function useLBSettings() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.lbSettings,
    queryFn: superAdminApi.getLBSettings,
    staleTime: 5 * 60 * 1000,
  })
}

// PUT the whole settings row. Seeds the cache with the server's response and
// invalidates so any other reader refetches; surfaces a success toast.
export function useUpdateLBSettings() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: UpdateLBSettings) => superAdminApi.updateLBSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(SUPERADMIN_QUERY_KEYS.lbSettings, settings)
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.lbSettings })
      toast.success(t("superAdmin.toasts.lbSettingsUpdated"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.lbSettingsFailed"))),
  })
}

// Live LB-manager reachability for one node. Off by default (enabled) so each
// table row can opt in and refetch on demand (the "Health" / "Re-check all"
// buttons call refetch()). Never cached stale — always a fresh probe.
export function useManagerStatus(nodeId: string, enabled = false) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.managerStatus, nodeId] as const,
    queryFn: () => superAdminApi.getManagerStatus(nodeId),
    enabled: enabled && !!nodeId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
  })
}

/* ── Images (OS families with embedded versions) ───────────────────────── */

export function useSaveImage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id?: string; payload: CreateImageRequest | UpdateImageRequest }) =>
      vars.id
        ? superAdminApi.updateImage(vars.id, vars.payload as UpdateImageRequest)
        : superAdminApi.createImage(vars.payload as CreateImageRequest),
    onSuccess: (_image, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.images })
      toast.success(
        vars.id ? t("superAdmin.toasts.imageUpdated") : t("superAdmin.toasts.imageCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.imageFailed"))),
  })
}

export function useUploadImageIcon() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; file: File }) =>
      superAdminApi.uploadImageIcon(vars.id, vars.file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.images })
      toast.success(t("superAdmin.toasts.iconUploaded"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.iconFailed"))),
  })
}

export function useDeleteImage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string }) => superAdminApi.deleteImage(vars.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.images })
      toast.success(t("superAdmin.toasts.imageDeleted"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.imageDeleteFailed"))),
  })
}

/* ── Image versions (embedded; mutations return the parent image) ──────── */

export function useSaveImageVersion() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: {
      imageId: string
      versionId?: string
      payload: AddImageVersionRequest | UpdateImageVersionRequest
    }) =>
      vars.versionId
        ? superAdminApi.updateImageVersion(
            vars.imageId,
            vars.versionId,
            vars.payload as UpdateImageVersionRequest,
          )
        : superAdminApi.addImageVersion(vars.imageId, vars.payload as AddImageVersionRequest),
    onSuccess: (_image, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.images })
      toast.success(
        vars.versionId
          ? t("superAdmin.toasts.versionUpdated")
          : t("superAdmin.toasts.versionAdded"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.versionFailed"))),
  })
}

export function useDeleteImageVersion() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { imageId: string; versionId: string }) =>
      superAdminApi.deleteImageVersion(vars.imageId, vars.versionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.images })
      toast.success(t("superAdmin.toasts.versionDeleted"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.versionFailed"))),
  })
}

/* ── VM prices (create-only) ───────────────────────────────────────────── */

export function useSaveVMPrice() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id?: string; payload: CreateVMPriceRequest | UpdateVMPriceRequest }) =>
      vars.id
        ? superAdminApi.updateVMPrice(vars.id, vars.payload as UpdateVMPriceRequest)
        : superAdminApi.createVMPrice(vars.payload as CreateVMPriceRequest),
    onSuccess: (_price, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.vmPrices })
      toast.success(
        vars.id ? t("superAdmin.toasts.vmPriceUpdated") : t("superAdmin.toasts.vmPriceCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.vmPriceFailed"))),
  })
}

/* ── Static IP prices ──────────────────────────────────────────────────── */

export function useSaveStaticIPPrice() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateStaticIPPriceRequest | UpdateStaticIPPriceRequest
    }) =>
      vars.id
        ? superAdminApi.updateStaticIPPrice(vars.id, vars.payload as UpdateStaticIPPriceRequest)
        : superAdminApi.createStaticIPPrice(vars.payload as CreateStaticIPPriceRequest),
    onSuccess: (_price, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.staticIpPrices })
      toast.success(
        vars.id
          ? t("superAdmin.toasts.staticIpPriceUpdated")
          : t("superAdmin.toasts.staticIpPriceCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.staticIpPriceFailed"))),
  })
}

/* ── IP pools (static IP inventory) ────────────────────────────────────── */

export function useSaveIPPool() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id?: string; payload: CreateIPPoolRequest | UpdateIPPoolRequest }) =>
      vars.id
        ? superAdminApi.updateIPPool(vars.id, vars.payload as UpdateIPPoolRequest)
        : superAdminApi.createIPPool(vars.payload as CreateIPPoolRequest),
    onSuccess: (_pool, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.ipPools })
      toast.success(
        vars.id ? t("superAdmin.toasts.ipPoolUpdated") : t("superAdmin.toasts.ipPoolCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.ipPoolFailed"))),
  })
}

export function useDeleteIPPool() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; force?: boolean }) =>
      superAdminApi.deleteIPPool(vars.id, vars.force),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.ipPools })
      // A forced delete also released live allocations, so the "IPs in use"
      // list is stale too.
      if (vars.force) {
        void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.staticIpAllocations })
      }
      toast.success(t("superAdmin.toasts.ipPoolDeleted"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.ipPoolFailed"))),
  })
}

/**
 * Hold addresses back from tenant allocation, or hand them back.
 *
 * Both invalidate the pool LIST as well as the drill-in: a reservation moves an
 * address out of `available`, so the stock figures on the pools table are stale
 * the moment either one succeeds.
 */
export function useReservePoolAddresses(poolId: string | undefined) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: ReserveAddressesRequest) =>
      superAdminApi.reservePoolAddresses(poolId ?? "", payload),
    onSuccess: (_created, payload) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.ipPoolAddresses })
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.ipPools })
      toast.success(
        t("superAdmin.toasts.ipAddressesBlocked", { count: payload.ip_addresses.length }),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.ipAddressBlockFailed"))),
  })
}

export function useReleasePoolAddress(poolId: string | undefined) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (ip: string) => superAdminApi.releasePoolAddress(poolId ?? "", ip),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.ipPoolAddresses })
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.ipPools })
      toast.success(t("superAdmin.toasts.ipAddressUnblocked"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.ipAddressBlockFailed"))),
  })
}

/* ── Bandwidth prices ──────────────────────────────────────────────────── */

export function useSaveBandwidthPrice() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateBandwidthPriceRequest | UpdateBandwidthPriceRequest
    }) =>
      vars.id
        ? superAdminApi.updateBandwidthPrice(vars.id, vars.payload as UpdateBandwidthPriceRequest)
        : superAdminApi.createBandwidthPrice(vars.payload as CreateBandwidthPriceRequest),
    onSuccess: (_price, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.bandwidthPrices })
      toast.success(
        vars.id
          ? t("superAdmin.toasts.bandwidthPriceUpdated")
          : t("superAdmin.toasts.bandwidthPriceCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.bandwidthPriceFailed"))),
  })
}

/* ── Storage prices ────────────────────────────────────────────────────── */

export function useSaveStoragePrice() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateStoragePriceRequest | UpdateStoragePriceRequest
    }) =>
      vars.id
        ? superAdminApi.updateStoragePrice(vars.id, vars.payload as UpdateStoragePriceRequest)
        : superAdminApi.createStoragePrice(vars.payload as CreateStoragePriceRequest),
    onSuccess: (_price, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.storagePrices })
      toast.success(
        vars.id
          ? t("superAdmin.toasts.storagePriceUpdated")
          : t("superAdmin.toasts.storagePriceCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.storagePriceFailed"))),
  })
}

/* ── Service catalog (Sovereign Services) ──────────────────────────────── */

export function useSaveService() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id?: string; payload: CreateServiceRequest | UpdateServiceRequest }) =>
      vars.id
        ? superAdminApi.updateService(vars.id, vars.payload as UpdateServiceRequest)
        : superAdminApi.createService(vars.payload as CreateServiceRequest),
    onSuccess: (_svc, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.services })
      toast.success(
        vars.id ? t("superAdmin.toasts.serviceUpdated") : t("superAdmin.toasts.serviceCreated"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.serviceFailed"))),
  })
}

export function useUpdateServiceState() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdateServiceStateRequest }) =>
      superAdminApi.updateServiceState(vars.id, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.services })
      toast.success(t("superAdmin.toasts.serviceUpdated"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.serviceFailed"))),
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string }) => superAdminApi.deleteService(vars.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.services })
      toast.success(t("superAdmin.toasts.serviceDeleted"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.toasts.serviceFailed"))),
  })
}

/* ── Platform users (super-admin management) ───────────────────────────── */

// All platform users, optionally filtered by a name/email query. The query key
// includes q so each search term caches independently.
export function useAdminUsers(q?: string) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.users, q ?? ""] as const,
    queryFn: () => superAdminApi.listUsers(q),
  })
}

/* ── Platform overview (aggregated org → account → member graph) ───────── */

// One tab's slice of the Platform Overview. `section` scopes the read to the
// list that tab renders, so opening Organizations doesn't pull every account
// and user on the platform; the counts for the other tabs ride along in
// `matched`. Omitting it (section = "") asks for the whole graph.
//
// `page`/`limit` page that section server-side (`data.pagination` describes the
// page); they are ignored for the full-graph read. limit = 0 takes the server's
// default.
//
// staleTime keeps each slice cached so switching tabs back and forth doesn't
// refetch (the data changes rarely); the table's retry calls refetch().
//
// `q` is the console's search, applied server-side — it's part of the query key
// alongside the section, so each term is cached per tab (and re-typing a term is
// instant). Pass a DEBOUNCED value: the key changes on every distinct q, and
// each new key is a request. placeholderData keeps the previous key's rows on
// screen while the next request is in flight, so the table doesn't blank out
// between keystrokes — or when you switch tabs.
export function useAdminPlatformOverview(
  section: OverviewSection | "" = "",
  q = "",
  page = 1,
  limit = 0,
) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.platformOverview, section, q, page, limit],
    queryFn: () => superAdminApi.getPlatformOverview(section, q, page, limit),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

// Set an account's permanent per-resource discount (0–100). Super-admin only.
// Refetches the platform overview so the Accounts tab reflects the new value.
export function useSetAccountDiscount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { accountId: string; permanentDiscount: number }) =>
      superAdminApi.setAccountDiscount(vars.accountId, vars.permanentDiscount),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SUPERADMIN_QUERY_KEYS.platformOverview,
      })
      toast.success(t("superAdmin.organizations.discount.saved"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.organizations.discount.failed"))),
  })
}

// Post a manual wallet movement (top-up or deduction) against an account.
// Super-admin only. The overview carries each account's balance, so refetching
// it is what updates the Accounts tab; the account-spend summary embeds the
// wallet too, so it is invalidated alongside.
export function useAdjustAccountBalance() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: AdjustBalanceRequest) => superAdminApi.adjustAccountBalance(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SUPERADMIN_QUERY_KEYS.platformOverview,
      })
      void queryClient.invalidateQueries({
        queryKey: SUPERADMIN_QUERY_KEYS.accountSpend,
      })
      toast.success(t("superAdmin.organizations.balance.saved"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.organizations.balance.failed"))),
  })
}

// Full resource inventory (VMs, disks, static IPs, VPCs, …) for one account,
// fanned out across every domain by the backend. Super-admin only; disabled
// until an account id is present.
export function useAdminAccountResources(accountId: string | undefined) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.accountResources, accountId ?? ""] as const,
    queryFn: () => {
      if (!accountId) throw new Error("accountId is required")
      return superAdminApi.getAccountResources(accountId)
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
  })
}

// Active-spend summary (monthly run-rate, per-kind breakdown, wallet balance) for
// one account. Super-admin only; disabled until an account id is present.
export function useAdminAccountSpend(accountId: string | undefined) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.accountSpend, accountId ?? ""] as const,
    queryFn: () => {
      if (!accountId) throw new Error("accountId is required")
      return superAdminApi.getAccountSpend(accountId)
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (accountId: string) => superAdminApi.deleteAccount(accountId),
    onSuccess: (_data, accountId) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.platformOverview })
      void queryClient.invalidateQueries({
        queryKey: [...SUPERADMIN_QUERY_KEYS.accountResources, accountId],
      })
      void queryClient.invalidateQueries({
        queryKey: [...SUPERADMIN_QUERY_KEYS.accountSpend, accountId],
      })
      void queryClient.invalidateQueries({
        queryKey: SUPERADMIN_QUERY_KEYS.staticIpAllocations,
      })
      toast.success(
        t("superAdmin.organizations.delete.started", {
          defaultValue: "Account deletion started",
        }),
      )
    },
    onError: (e) =>
      toast.error(
        extractError(
          e,
          t("superAdmin.organizations.delete.failed", {
            defaultValue: "Failed to start account deletion",
          }),
        ),
      ),
  })
}

// Grant or revoke a user's platform super-admin flag. Refetches the user list so
// the row reflects the new state; the backend bumps the target's token epoch so
// the change applies on their next request.
export function useSetSuperAdmin() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; isSuperAdmin: boolean }) =>
      superAdminApi.setSuperAdmin(vars.id, vars.isSuperAdmin),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.users })
      toast.success(
        vars.isSuperAdmin
          ? t("superAdmin.users.toasts.granted")
          : t("superAdmin.users.toasts.revoked"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.users.toasts.failed"))),
  })
}

/* ── Quota increase requests (review queue) ────────────────────────────── */

// Platform-wide quota request queue, filtered server-side by status ("" = all).
// Resolves { rows, total } — total is the count across ALL pages (SendList
// meta), which drives the table's pager. The key carries status+page so each
// filter/page caches independently; placeholderData keeps the previous rows on
// screen while a filter or page switch is in flight, so the table doesn't
// blank out.
/**
 * Override a user's KYC state from the admin console.
 *
 * Invalidates both the admin user list and the platform overview: the overview's
 * user rows carry `need_actions` and `kyc_completed`, so leaving it stale would
 * show the old state on the very page the operator just acted from.
 */
export function useSetKycStatus() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; patch: KycStatusPatch }) =>
      superAdminApi.setKycStatus(vars.id, vars.patch),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.users })
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.platformOverview })
      toast.success(
        vars.patch.need_actions
          ? t("superAdmin.kyc.toasts.reverificationRequested")
          : t("superAdmin.kyc.toasts.bypassed"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.kyc.toasts.failed"))),
  })
}

export function useAdminQuotaRequests(status = "", page = 1) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.quotaRequests, status, page] as const,
    queryFn: () => superAdminApi.listQuotaRequests(status, page),
    placeholderData: keepPreviousData,
  })
}

// Platform-wide count of quota requests in one status (meta.total off a
// limit=1 page) — feeds the stat tiles without shipping any rows. Lives under
// the quotaRequests key prefix so approve/reject invalidation refreshes it.
export function useAdminQuotaRequestCount(status: QuotaRequestStatus) {
  return useQuery({
    queryKey: [...SUPERADMIN_QUERY_KEYS.quotaRequests, "count", status] as const,
    queryFn: () => superAdminApi.countQuotaRequests(status),
  })
}

export function useApproveQuotaRequest() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; payload: ApproveQuotaRequestInput }) =>
      superAdminApi.approveQuotaRequest(vars.id, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.quotaRequests })
      toast.success(t("superAdmin.quotaRequests.toasts.approved"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.quotaRequests.toasts.actionFailed"))),
  })
}

export function useRejectQuotaRequest() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (vars: { id: string; payload: RejectQuotaRequestInput }) =>
      superAdminApi.rejectQuotaRequest(vars.id, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.quotaRequests })
      toast.success(t("superAdmin.quotaRequests.toasts.rejected"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.quotaRequests.toasts.actionFailed"))),
  })
}

/* ── Redis cache ("Burst Cache") ────────────────────────────────────────── */

// The module-wise registry of clearable key families, with live key counts.
// staleTime is 0 on purpose: a count that predates someone else's clear is
// worse than no count, since the whole point of the page is deciding what to
// remove based on what is actually there.
export function useCacheNamespaces() {
  return useQuery({
    queryKey: SUPERADMIN_QUERY_KEYS.cacheNamespaces,
    queryFn: superAdminApi.getCacheNamespaces,
    staleTime: 0,
  })
}

// Clears the selected namespaces and/or raw globs, or flushes the whole logical
// DB. The counts are refetched on both success and failure — a failed clear can
// still be a partial one, so the previous counts are wrong either way.
export function useClearCache() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: ClearCacheRequest) => superAdminApi.clearCache(payload),
    onSuccess: (res) => {
      toast.success(
        res.scope === "all"
          ? t("superAdmin.cache.toasts.flushed", { count: res.deleted })
          : t("superAdmin.cache.toasts.cleared", { count: res.deleted }),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.cache.toasts.failed"))),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.cacheNamespaces })
      // A clear can drop cached catalog/pricing rows the console itself is
      // showing, so drop the client-side caches too rather than leave the
      // UI displaying data the server no longer has cached.
      void queryClient.invalidateQueries({ queryKey: ["superadmin"] })
    },
  })
}
