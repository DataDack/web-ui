import {
  type LucideIcon,
  Building2,
  Cpu,
  Disc3,
  Flame,
  Gauge,
  HardDrive,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Network,
  Scale,
  Server,
  Users,
} from "lucide-react"

export interface AdminNavItem {
  labelKey: string
  icon: LucideIcon
  path: string
}

// Navigation for the dedicated super-admin console. Kept separate from the
// tenant console nav (sidebar-nav.ts) by design — this is a different shell.
export const ADMIN_NAV: AdminNavItem[] = [
  { labelKey: "superAdmin.organizations.title", icon: Building2, path: "/admin/organizations" },
  { labelKey: "superAdmin.users.title", icon: Users, path: "/admin/users" },
  { labelKey: "superAdmin.support.title", icon: LifeBuoy, path: "/admin/support" },
  { labelKey: "superAdmin.nav.quotaRequests", icon: Gauge, path: "/admin/quota-requests" },
  { labelKey: "superAdmin.services.title", icon: LayoutGrid, path: "/admin/services" },
  {
    labelKey: "superAdmin.availabilityZones.title",
    icon: MapPin,
    path: "/admin/availability-zones",
  },
  { labelKey: "superAdmin.pveNodes.title", icon: Server, path: "/admin/pve-nodes" },
  { labelKey: "superAdmin.loadBalancers.title", icon: Scale, path: "/admin/load-balancers" },
  { labelKey: "superAdmin.images.title", icon: Disc3, path: "/admin/images" },
  { labelKey: "superAdmin.vmPrices.title", icon: Cpu, path: "/admin/vm-prices" },
  { labelKey: "superAdmin.storagePrices.title", icon: HardDrive, path: "/admin/storage-prices" },
  {
    labelKey: "superAdmin.staticIps.title",
    icon: Network,
    path: "/admin/static-ips",
  },
  {
    labelKey: "superAdmin.bandwidthPrices.title",
    icon: Gauge,
    path: "/admin/bandwidth-prices",
  },
  { labelKey: "superAdmin.cache.title", icon: Flame, path: "/admin/cache" },
]
