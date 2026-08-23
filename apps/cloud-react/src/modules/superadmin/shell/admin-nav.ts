import {
  type LucideIcon,
  Building2,
  Disc3,
  Flame,
  LayoutDashboard,
  Globe,
  LayoutGrid,
  Inbox,
  ListChecks,
  MailX,
  Package,
  BadgeIndianRupee,
  MapPin,
  Network,
  ReceiptText,
  Scale,
  Server,
  ServerCog,
  Ticket,
  SlidersHorizontal,
  Boxes,
} from "lucide-react"

export interface AdminNavItem {
  labelKey: string
  icon: LucideIcon
  path: string
  comingSoon?: boolean
}

export interface AdminNavGroup {
  /** Omitted for the item(s) pinned at the top of the sidebar. */
  labelKey?: string
  items: AdminNavItem[]
}

/**
 * Navigation for the dedicated super-admin console. Kept separate from the
 * tenant console nav (sidebar-nav.ts) by design — this is a different shell.
 *
 * Grouped by the question an operator is answering rather than by the API
 * behind each page: who is on the platform, what wants my attention, what can
 * be provisioned, what runs it, what it costs. A flat list of fifteen items
 * made every page equally findable, which amounts to none of them being
 * findable.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      { labelKey: "superAdmin.nav.overview", icon: LayoutDashboard, path: "/admin/overview" },
    ],
  },
  {
    // One surface for organizations, accounts and users: they are three views of
    // the same tenancy graph, and splitting them across pages meant the same
    // user appeared twice, backed by two different endpoints.
    labelKey: "superAdmin.nav.groups.tenancy",
    items: [
      { labelKey: "superAdmin.nav.tenancy", icon: Building2, path: "/admin/tenancy" },
      { labelKey: "superAdmin.nav.resources", icon: Boxes, path: "/admin/resources" },
    ],
  },
  {
    labelKey: "superAdmin.nav.groups.attention",
    // One entry, because an operator wants to know "is anything waiting on me"
    // without checking two places to find out.
    items: [{ labelKey: "superAdmin.requests.title", icon: Inbox, path: "/admin/requests" }],
  },
  {
    labelKey: "superAdmin.nav.groups.catalog",
    items: [
      { labelKey: "superAdmin.services.title", icon: LayoutGrid, path: "/admin/services" },
      { labelKey: "superAdmin.images.title", icon: Disc3, path: "/admin/images" },
    ],
  },
  {
    labelKey: "superAdmin.nav.groups.infrastructure",
    items: [
      {
        labelKey: "superAdmin.availabilityZones.title",
        icon: MapPin,
        path: "/admin/availability-zones",
      },
      { labelKey: "superAdmin.pveNodes.title", icon: Server, path: "/admin/pve-nodes" },
      // Directly under the nodes it runs on: the manager is per-node
      // infrastructure, not a setting of the load-balancer product it started
      // out serving.
      {
        labelKey: "superAdmin.proxmoxManager.title",
        icon: ServerCog,
        path: "/admin/proxmox-manager",
      },
      { labelKey: "superAdmin.loadBalancers.title", icon: Scale, path: "/admin/load-balancers" },
      { labelKey: "superAdmin.staticIps.title", icon: Network, path: "/admin/static-ips" },
    ],
  },
  {
    // Shared hosting is its own product line, not part of the infrastructure
    // catalogue: an operator working on WHM servers is doing a different job
    // from one working on Proxmox nodes, and mixing them made both harder to
    // find.
    labelKey: "hosting.admin.nav.group",
    items: [
      { labelKey: "hosting.admin.nav.servers", icon: Server, path: "/admin/hosting/servers" },
      { labelKey: "hosting.admin.nav.plans", icon: Package, path: "/admin/hosting/plans" },
      { labelKey: "hosting.admin.nav.accounts", icon: Globe, path: "/admin/hosting/accounts" },
      { labelKey: "hosting.admin.nav.queue", icon: ListChecks, path: "/admin/hosting/queue" },
    ],
  },
  {
    labelKey: "superAdmin.nav.groups.pricing",
    items: [
      {
        labelKey: "superAdmin.nav.groups.pricing",
        icon: BadgeIndianRupee,
        path: "/admin/pricing",
      },
    ],
  },
  {
    labelKey: "superAdmin.nav.groups.billing",
    items: [
      {
        labelKey: "superAdmin.promoCodes.title",
        icon: Ticket,
        path: "/admin/promo-codes",
      },
      {
        labelKey: "superAdmin.nav.ledger",
        icon: ReceiptText,
        path: "/admin/ledger",
      },
    ],
  },
  {
    labelKey: "superAdmin.nav.groups.platform",
    items: [
      {
        labelKey: "superAdmin.platformSettings.title",
        icon: SlidersHorizontal,
        path: "/admin/platform-settings",
      },
      { labelKey: "superAdmin.emailPolicy.title", icon: MailX, path: "/admin/email-policy" },
      { labelKey: "superAdmin.cache.title", icon: Flame, path: "/admin/cache" },
    ],
  },
]

/** Every navigable admin path, flattened — for tests and breadcrumbs. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items).filter(
  (item) => !item.comingSoon,
)
