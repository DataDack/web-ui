import type { InstanceStatus, MachineType } from "./vms.types"

/**
 * Maps a VM's backend lifecycle status to the label shown in the UI. Provisioning
 * is now real (the backend clones, configures and boots the guest on Proxmox,
 * flipping the row to `running` only once the VM is actually up), so only
 * `pending` surfaces as "Provisioning"; `running` passes through and shows as
 * "Active". The "provisioning" label exists in i18n with the info/blue badge
 * tone, so passing the mapped value to <StatusBadge> yields the right colour and
 * text with no change to the underlying status.
 */
const VM_STATUS_DISPLAY: Partial<Record<InstanceStatus, string>> = {
    pending: "provisioning",
}

/** Backend status → user-facing status for VM badges. Passthrough when unmapped. */
export function vmDisplayStatus(status: string): string {
    return VM_STATUS_DISPLAY[status as InstanceStatus] ?? status
}

/**
 * Lifecycle states with a Proxmox transition still in flight. The UI renders
 * these with a spinner, keeps polling until they settle, and holds action
 * buttons disabled (the backend also rejects concurrent transitions with 409).
 */
const VM_TRANSITIONAL: ReadonlySet<string> = new Set([
    "pending",
    "starting",
    "stopping",
    "restarting",
    "deleting",
])

export function isVmTransitional(status: string): boolean {
    return VM_TRANSITIONAL.has(status)
}

export const VMS_ROUTES = {
    ROOT: "/compute/instances",
    OVERVIEW: "/compute/overview",
    /** System images (AMIs) catalog browse page. */
    IMAGES: "/compute/images",
    CREATE: "/compute/instances/create",
    DETAIL: "/compute/instances/:id",
    detail: (id: string) => `/compute/instances/${id}`,
    /** AWS-style "Connect to instance" page: Instance Connect / SSH client /
     *  Serial console tabs. The list/detail Connect buttons land here. */
    CONNECT: "/compute/instances/:id/connect",
    connect: (id: string) => `/compute/instances/${id}/connect`,
    /** Full-page browser console; default "ssh" = GCE-style keyless SSH login.
     *  "guest" opens the Proxmox serial console; "host" an (admin) node shell.
     *  `user` overrides the guest account an "ssh" session logs in as. */
    console: (id: string, target: "ssh" | "host" | "guest" = "ssh", user?: string) => {
        const userParam = user ? `&user=${encodeURIComponent(user)}` : ""
        return `/compute/instances/${id}/console?target=${target}${userParam}`
    },
} as const

export const VMS_QUERY_KEYS = {
    list: ["vms", "list"] as const,
    /** Aggregate compute fleet status (counts) — powers the overview in one call. */
    status: ["vms", "status"] as const,
    detail: (id: string) => ["vms", "detail", id] as const,
    events: (id: string) => ["vms", "events", id] as const,
    metrics: (id: string, range: string) => ["vms", "metrics", id, range] as const,
}

export const MACHINE_TYPES: MachineType[] = [
    { name: "e2-small", cpu_count: 1, memory_gb: 2, series: "E2 · shared core" },
    { name: "e2-medium", cpu_count: 2, memory_gb: 8, series: "E2 · general purpose" },
    { name: "c3-standard-4", cpu_count: 4, memory_gb: 16, series: "C3 · general purpose" },
    { name: "c3-standard-8", cpu_count: 8, memory_gb: 32, series: "C3 · general purpose" },
    { name: "m3-highmem-16", cpu_count: 16, memory_gb: 64, series: "M3 · memory optimised" },
    { name: "c3-standard-32", cpu_count: 32, memory_gb: 128, series: "C3 · compute heavy" },
]

export const OS_IMAGES = [
    "ubuntu-24.04-lts",
    "ubuntu-22.04-lts",
    "debian-12",
    "rocky-linux-9",
    "windows-server-2022",
] as const
