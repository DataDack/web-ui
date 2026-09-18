import type { ImageVersion } from "./superadmin.types"

/**
 * Versions ordered by template VMID, lowest first. Versions without a template
 * (no VMID, or 0) go last, keeping their authored order among themselves.
 */
export function sortVersionsByVmid<T extends Pick<ImageVersion, "vmid">>(versions: T[]): T[] {
  const key = (v: T) => (v.vmid && v.vmid > 0 ? v.vmid : Number.POSITIVE_INFINITY)
  return [...versions].sort((a, b) => key(a) - key(b))
}
