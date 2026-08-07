export const SUPERADMIN_ROUTES = {
  root: "/admin",
} as const

// Admin lists are unfiltered (include inactive rows), so they use their own
// query keys distinct from the public, read-only catalog cache.
export const SUPERADMIN_QUERY_KEYS = {
  availabilityZones: ["superadmin", "availability-zones"] as const,
  pveNodes: ["superadmin", "pve-nodes"] as const,
  lbSettings: ["superadmin", "lb-settings"] as const,
  platformSettings: ["superadmin", "platform-settings"] as const,
  managerStatus: ["superadmin", "manager-status"] as const,
  images: ["superadmin", "images"] as const,
  vmPrices: ["superadmin", "vm-prices"] as const,
  staticIpPrices: ["superadmin", "static-ip-prices"] as const,
  ipPools: ["superadmin", "ip-pools"] as const,
  ipPoolAddresses: ["superadmin", "ip-pool-addresses"] as const,
  staticIpAllocations: ["superadmin", "static-ip-allocations"] as const,
  bandwidthPrices: ["superadmin", "bandwidth-prices"] as const,
  storagePrices: ["superadmin", "storage-prices"] as const,
  services: ["superadmin", "services"] as const,
  serviceMetricSources: ["superadmin", "service-metric-sources"] as const,
  users: ["superadmin", "users"] as const,
  quotaRequests: ["superadmin", "quota-requests"] as const,
  platformOverview: ["superadmin", "platform-overview"] as const,
  accountResources: ["superadmin", "account-resources"] as const,
  accountSpend: ["superadmin", "account-spend"] as const,
  // Key counts go stale the moment anything writes to Redis, so this query is
  // never cached across a clear — it is refetched on every mutation.
  cacheNamespaces: ["superadmin", "cache-namespaces"] as const,
}
