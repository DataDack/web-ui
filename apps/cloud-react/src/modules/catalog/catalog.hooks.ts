import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { apiGet } from "@/services/api/client"

import type {
  AvailabilityZoneBrief,
  BandwidthPriceOption,
  ImageCatalogFamily,
  MachineType,
  RegionCatalog,
  StaticIPPriceOption,
  StoragePriceOption,
  VMPriceOption,
  Zone,
} from "./catalog.types"

export const CATALOG_QUERY_KEYS = {
  zones: ["catalog", "zones"] as const,
  machineTypes: ["catalog", "machine-types"] as const,
  imageCatalog: ["catalog", "image-catalog"] as const,
  regionCatalog: ["catalog", "region-catalog"] as const,
  vmPrices: ["catalog", "vm-prices"] as const,
  staticIpPrices: ["catalog", "static-ip-prices"] as const,
  bandwidthPrices: ["catalog", "bandwidth-prices"] as const,
  storagePrices: ["catalog", "storage-prices"] as const,
}

// Catalog is slow-changing; cache it generously on the client too (the
// backend already caches it in Redis).
const STALE = 10 * 60 * 1000

export function useZones() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.zones,
    queryFn: () => apiGet<Zone[]>("/compute/catalog/zones"),
    staleTime: STALE,
  })
}

export function useMachineTypes() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.machineTypes,
    queryFn: () => apiGet<MachineType[]>("/compute/catalog/machine-types"),
    staleTime: STALE,
  })
}

/* ── Public provisioning catalog (admin-managed global infra data) ─────────
 * The global infra API serializes ids as numbers (uint primary keys). We
 * normalise them to strings at the boundary so the rest of the app can compare
 * and select by id with the same string ids used everywhere else. */

interface RawImageCatalogFamily extends Omit<ImageCatalogFamily, "id" | "versions"> {
  id: string
  versions: (Omit<ImageCatalogFamily["versions"][number], "id"> & { id: string })[]
}
interface RawRegionCatalog extends Omit<RegionCatalog, "id" | "availability_zones"> {
  id: string
  availability_zones: (Omit<RegionCatalog["availability_zones"][number], "id"> & {
    id: string
  })[]
}
interface RawVMPriceOption extends Omit<VMPriceOption, "id" | "availability_zone_id"> {
  id: string
  availability_zone_id: string
}
interface RawStaticIPPriceOption extends Omit<StaticIPPriceOption, "id" | "availability_zone_id"> {
  // Global infra ids arrive as JSON numbers (uint PKs); normalise to strings.
  id: string | number
  availability_zone_id: string | number
}
interface RawBandwidthPriceOption extends Omit<
  BandwidthPriceOption,
  "id" | "availability_zone_id"
> {
  id: string | number
  availability_zone_id: string | number
}
interface RawStoragePriceOption extends Omit<StoragePriceOption, "id" | "availability_zone_id"> {
  id: string | number
  availability_zone_id: string | number
}

/** OS families with their selectable versions (admin icons included). */
export function useImageCatalog() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.imageCatalog,
    queryFn: async (): Promise<ImageCatalogFamily[]> => {
      const data = await apiGet<RawImageCatalogFamily[]>("/platform/infra/catalog/images")
      return data.map((f) => ({
        ...f,
        id: f.id,
        versions: f.versions.map((v) => ({ ...v, id: v.id })),
      }))
    },
    staleTime: STALE,
  })
}

/** Regions with their available availability zones. */
export function useRegionCatalog() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.regionCatalog,
    queryFn: async (): Promise<RegionCatalog[]> => {
      const data = await apiGet<RawRegionCatalog[]>("/platform/infra/catalog/regions")
      return data.map((r) => ({
        ...r,
        id: r.id,
        availability_zones: r.availability_zones.map((az) => ({
          ...az,
          id: az.id,
        })),
      }))
    },
    staleTime: STALE,
  })
}

/**
 * Flat `availability_zone_id -> AvailabilityZoneBrief` map across every region,
 * so resource lists can resolve a subnet's `availability_zone_id` (a uuid) to a
 * human label without re-walking the region catalog at each call site.
 */
export function useAvailabilityZoneMap(): Map<string, AvailabilityZoneBrief> {
  const { data: catalog } = useRegionCatalog()
  return useMemo(() => {
    const map = new Map<string, AvailabilityZoneBrief>()
    for (const region of catalog ?? []) {
      for (const az of region.availability_zones) map.set(az.id, az)
    }
    return map
  }, [catalog])
}

/** Priced machine-type offerings across all availability zones. */
export function useVMPrices() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.vmPrices,
    queryFn: async (): Promise<VMPriceOption[]> => {
      const data = await apiGet<RawVMPriceOption[]>("/platform/infra/vm-prices")
      return data.map((p) => ({
        ...p,
        id: p.id,
        availability_zone_id: p.availability_zone_id,
      }))
    },
    staleTime: STALE,
  })
}

/** Priced static (public) IP offerings across all availability zones. Drives
 * the public-IPv4 charge shown in the instance-creation cost summary. */
export function useStaticIPPrices() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.staticIpPrices,
    queryFn: async (): Promise<StaticIPPriceOption[]> => {
      const data = await apiGet<RawStaticIPPriceOption[]>("/platform/infra/static-ip-prices")
      return data.map((p) => ({
        ...p,
        id: String(p.id),
        availability_zone_id: String(p.availability_zone_id),
      }))
    },
    staleTime: STALE,
  })
}

/** Priced bandwidth (data-transfer) offerings across all availability zones.
 * Drives the included-quota / overage bandwidth line in the cost summary. */
export function useBandwidthPrices() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.bandwidthPrices,
    queryFn: async (): Promise<BandwidthPriceOption[]> => {
      const data = await apiGet<RawBandwidthPriceOption[]>("/platform/infra/bandwidth-prices")
      return data.map((p) => ({
        ...p,
        id: String(p.id),
        availability_zone_id: String(p.availability_zone_id),
      }))
    },
    staleTime: STALE,
  })
}

/** Priced block-storage offerings across all availability zones. Drives the
 * data-disk charge in the cost summary as the disk size changes. */
export function useStoragePrices() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.storagePrices,
    queryFn: async (): Promise<StoragePriceOption[]> => {
      const data = await apiGet<RawStoragePriceOption[]>("/platform/infra/storage-prices")
      return data.map((p) => ({
        ...p,
        id: String(p.id),
        availability_zone_id: String(p.availability_zone_id),
      }))
    },
    staleTime: STALE,
  })
}
