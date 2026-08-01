import type { DiskType } from "./disks.types"

export const DISKS_ROUTES = {
  ROOT: "/compute/disks",
} as const

export const DISKS_QUERY_KEYS = {
  list: ["disks", "list"] as const,
}

// Backend accepts ssd | hdd | nvme. Only ssd/hdd are offered here because they
// have i18n labels; `balanced` was dropped as the backend rejects it.
export const DISK_TYPES: { value: DiskType; labelKey: string }[] = [
  { value: "ssd", labelKey: "disks.types.ssd" },
  { value: "hdd", labelKey: "disks.types.hdd" },
]
