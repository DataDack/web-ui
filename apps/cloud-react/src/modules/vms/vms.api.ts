import type { ImageCatalogFamily, VMPriceOption } from "@/modules/catalog/catalog.types"
import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
    ComputeStatus,
    CreateInstanceRequest,
    Instance,
    InstanceAction,
    InstanceEvent,
    InstanceMetrics,
    RawInstance,
    UpdateInstanceRequest,
} from "./vms.types"

// Global infra ids arrive as JSON numbers (uint PKs); we normalise them to
// strings at the boundary, so the raw shape allows either.
type RawImageCatalogFamily = Omit<ImageCatalogFamily, "id" | "versions"> & {
    id: string | number
    versions: (Omit<ImageCatalogFamily["versions"][number], "id"> & { id: string | number })[]
}

type RawVMPriceOption = Omit<VMPriceOption, "id" | "availability_zone_id"> & {
    id: string | number
    availability_zone_id: string | number
}

// Live cloud-be-go endpoints:
//   instances → /compute/instances   (CRUD; status via PUT)
//   catalog   → /platform/infra/{vm-prices,catalog/images}  (admin-managed global)
//
// An instance stores its machine type as the chosen vm_prices id and its image
// as the chosen AMI id. The global catalog is fetched and used to enrich each
// instance with display names + cpu/memory so the list/detail UI keeps working.

// A lifecycle action is a PUT with the TARGET status (running | stopped). For a
// realized guest the backend answers with the transitional state it moved the
// row into (starting/stopping) and completes the Proxmox transition async — the
// UI shows a loader and polls until the row settles on the target.
const STATUS_FOR_ACTION: Record<InstanceAction, "running" | "stopped"> = {
    start: "running",
    stop: "stopped",
    restart: "running",
    pause: "stopped",
    resume: "running",
}

async function fetchCatalog(): Promise<{
    prices: VMPriceOption[]
    families: ImageCatalogFamily[]
}> {
    const [prices, families] = await Promise.all([
        apiGet<RawVMPriceOption[]>("/platform/infra/vm-prices"),
        apiGet<RawImageCatalogFamily[]>("/platform/infra/catalog/images"),
    ])
    return {
        prices: prices.map((p) => ({
            ...p,
            id: String(p.id),
            availability_zone_id: String(p.availability_zone_id),
        })),
        families: families.map((f) => ({
            ...f,
            id: String(f.id),
            versions: f.versions.map((v) => ({ ...v, id: String(v.id) })),
        })),
    }
}

// An instance stores only the image (AMI) id, so the OS label AND its icon both
// come from the family that owns that version. Resolving them together keeps the
// icon in step with the label: when the image is missing from the catalog we
// fall back to the raw id and hand back no icon, rather than showing artwork for
// the wrong OS.
function resolveOS(
    families: ImageCatalogFamily[],
    imageId: string
): { os: string; os_family?: string; os_icon_url?: string } {
    for (const family of families) {
        const version = family.versions.find((v) => v.id === imageId)
        if (version) {
            return {
                os: `${family.display_name} ${version.os_version}`,
                os_family: family.name,
                os_icon_url: family.icon_url || undefined,
            }
        }
    }
    return { os: imageId }
}

function enrich(raw: RawInstance, prices: VMPriceOption[], families: ImageCatalogFamily[]): Instance {
    const mt = prices.find((p) => p.id === raw.machine_type_id)
    return {
        ...raw,
        machine_type: mt?.display_name || mt?.name || raw.machine_type_id,
        // Prefer the catalog spec, but fall back to the instance's own stored
        // cpu/memory (the backend populates these) rather than zero — so an
        // instance still reports correct specs without the price catalog loaded.
        cpu_count: mt?.vcpus ?? raw.cpu_count,
        memory_gb: mt?.ram_gb ?? raw.memory_gb,
        ...resolveOS(families, raw.image_id),
    }
}

export const vmsApi = {
    list: async (): Promise<Instance[]> => {
        const [raw, { prices, families }] = await Promise.all([
            apiGet<RawInstance[]>(`/compute/instances${LIST_QUERY}`),
            fetchCatalog(),
        ])
        return raw.map((r) => enrich(r, prices, families))
    },

    // Aggregate fleet status for the overview — one account-scoped call that
    // returns instance/disk/load-balancer/ASG counts + per-zone capacity, instead
    // of fetching every list to count them client-side.
    status: (): Promise<ComputeStatus> => apiGet<ComputeStatus>("/compute/status"),

    get: async (id: string): Promise<Instance> => {
        const [raw, { prices, families }] = await Promise.all([
            apiGet<RawInstance>(`/compute/instances/${id}`),
            fetchCatalog(),
        ])
        return enrich(raw, prices, families)
    },

    // VM activity feed: Proxmox task log for the guest, or synthesized lifecycle
    // events when there's no realized guest (backend GetEvents).
    events: (id: string): Promise<InstanceEvent[]> =>
        apiGet<InstanceEvent[]>(`/compute/instances/${id}/events`),

    create: async (payload: CreateInstanceRequest): Promise<Instance> => {
        // The backend's create DTO names the billing cycle `billing_cycle`; the
        // wizard models it as `billing_period`. Send both so the wallet charges
        // the right way (monthly upfront vs hourly metering).
        const body = { ...payload, billing_cycle: payload.billing_period }
        const raw = await apiPost<RawInstance>("/compute/instances", body)
        const { prices, families } = await fetchCatalog()
        return enrich(raw, prices, families)
    },

    // No dedicated start/stop/restart route — status changes go through update.
    action: async (id: string, action: InstanceAction): Promise<Instance> => {
        const raw = await apiPut<RawInstance>(`/compute/instances/${id}`, {
            status: STATUS_FOR_ACTION[action],
        })
        const { prices, families } = await fetchCatalog()
        return enrich(raw, prices, families)
    },

    // Settings edits (name/description/tags/termination protection) share the
    // same PUT route as lifecycle actions — only changed fields are sent.
    update: async (id: string, payload: UpdateInstanceRequest): Promise<Instance> => {
        const raw = await apiPut<RawInstance>(`/compute/instances/${id}`, payload)
        const { prices, families } = await fetchCatalog()
        return enrich(raw, prices, families)
    },

    delete: (id: string): Promise<void> => apiDelete(`/compute/instances/${id}`),

    // Live resource time series over a window (hour/day/week/month/year);
    // Proxmox-backed when available, else simulated.
    metrics: (id: string, range: string): Promise<InstanceMetrics> =>
        apiGet<InstanceMetrics>(
            `/compute/instances/${id}/metrics?range=${encodeURIComponent(range)}`
        ),
}
