// Shapes mirror cloud-be-go: apps/compute/diskstorage entity + request DTOs.

// Backend lifecycle: creating | available | in_use | deleting | deleted | error.
// The API layer maps `in_use` -> `attached` so the console's status badge,
// stats and action gating keep working against existing i18n keys.
export type DiskStatus = "creating" | "available" | "attached" | "deleting" | "deleted" | "error"
// Backend accepts ssd | hdd | nvme. The create form only offers ssd/hdd
// (the values that have i18n labels); nvme is read-only support for listing.
export type DiskType = "ssd" | "hdd" | "nvme"

export interface Disk {
    id: string
    tenant_serial: number
    created_at: string
    updated_at: string
    name: string
    description?: string
    size_gb: number
    disk_type: DiskType
    volume_class?: string
    region: string
    zone: string
    status: DiskStatus
    /** True for the instance's root/boot volume; guards detach/delete. */
    is_boot: boolean
    /**
     * Instance this disk is currently attached to, or "" when unattached.
     * Sourced from the active vm_disk_attachments row (joined server-side).
     */
    instance_id: string
    device_name: string
    user_id: string
    tags: string
    multi_attach: boolean
    delete_on_termination: boolean
    kms_key_id?: string
}

export interface CreateDiskRequest {
    name: string
    size_gb: number
    disk_type: DiskType
    region: string
    zone: string
    description?: string
    volume_class?: string
    multi_attach?: boolean
    delete_on_termination?: boolean
    kms_key_id?: string
    /** Accepted by the FE form but not part of the backend create DTO. */
    tags?: string
}
