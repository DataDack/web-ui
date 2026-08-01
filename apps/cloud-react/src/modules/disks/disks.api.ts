import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { CreateDiskRequest, Disk, DiskStatus, DiskType } from "./disks.types"

// Backend: app `compute`, module `diskstorage` -> base /compute/diskstorage (axios baseURL
// is already /api/v1). Attachment state lives in a separate table
// (vm_disk_attachments) but cloud-be-go now joins the active attachment onto the
// disk row as the transient `instance_id`/`device_name` fields (0/"" when the
// disk is unattached).

const BASE = "/compute/diskstorage"

/** The all-zero UUID the backend emits for an unset transient FK (uuid.Nil). */
const NIL_UUID = "00000000-0000-0000-0000-000000000000"

/** Raw disk row as returned by cloud-be-go (apps/compute/diskstorage entity.Disk). */
interface RawDisk {
    // Backend ids are UUID strings (TenantBaseEntity). The FE treats ids as
    // strings everywhere (Radix Select values, `===` lookups, zod).
    id: string
    tenant_serial?: number
    created_at: string
    updated_at: string
    name: string
    description?: string
    size_gb: number
    disk_type: string
    volume_class?: string
    region: string
    zone: string
    status: string
    is_boot?: boolean
    multi_attach?: boolean
    delete_on_termination?: boolean
    kms_key_id?: string
    // Transient fields from the active vm_disk_attachments row. uuid.Nil
    // ("00000000-…") / "" when the disk is not attached to any instance.
    instance_id?: string
    device_name?: string
    user_id: number | string
    tags?: string
}

/** Map the backend `in_use` lifecycle value onto the FE `attached` display value. */
function normalizeStatus(status: string): DiskStatus {
    if (status === "in_use") return "attached"
    return status as DiskStatus
}

/** Normalise a transient instance id: nil-UUID / falsy → "" (unattached). */
function normalizeInstanceId(id: string | undefined): string {
    if (!id || id === NIL_UUID) return ""
    return id
}

function toDisk(raw: RawDisk): Disk {
    return {
        id: raw.id,
        tenant_serial: raw.tenant_serial ?? 0,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        name: raw.name,
        description: raw.description,
        size_gb: raw.size_gb,
        disk_type: raw.disk_type as DiskType,
        volume_class: raw.volume_class,
        region: raw.region,
        zone: raw.zone,
        status: normalizeStatus(raw.status),
        is_boot: Boolean(raw.is_boot),
        multi_attach: Boolean(raw.multi_attach),
        delete_on_termination: Boolean(raw.delete_on_termination),
        kms_key_id: raw.kms_key_id,
        // nil-UUID / undefined means unattached; normalise to "" so the FE can
        // compare against a string instance id and render a dash when empty.
        instance_id: normalizeInstanceId(raw.instance_id),
        device_name: raw.device_name ?? "",
        user_id: String(raw.user_id),
        tags: raw.tags ?? "{}",
    }
}

export const disksApi = {
    list: async (): Promise<Disk[]> => {
        const rows = await apiGet<RawDisk[]>(BASE + LIST_QUERY)
        return rows.map(toDisk)
    },

    create: async (payload: CreateDiskRequest): Promise<Disk> => {
        // Backend CreateDiskRequest: name, size_gb, disk_type, region, zone.
        const raw = await apiPost<RawDisk>(BASE, {
            name: payload.name,
            size_gb: payload.size_gb,
            disk_type: payload.disk_type,
            region: payload.region,
            zone: payload.zone,
        })
        return toDisk(raw)
    },

    attach: async (id: string, instanceId: string): Promise<Disk> => {
        // Backend AttachDiskRequest.instance_id is a UUID string. (It was a
        // numeric id pre-UUID-migration; Number() now sends NaN and 400s.)
        const raw = await apiPost<RawDisk>(`${BASE}/${id}/attach`, {
            instance_id: instanceId,
        })
        return toDisk(raw)
    },

    detach: async (id: string): Promise<Disk> => {
        const raw = await apiPost<RawDisk>(`${BASE}/${id}/detach`)
        return toDisk(raw)
    },

    delete: async (id: string): Promise<void> => {
        await apiDelete(`${BASE}/${id}`)
    },
}
