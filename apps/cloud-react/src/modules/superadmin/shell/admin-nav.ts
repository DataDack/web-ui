import {
  BadgeIndianRupee,
  Boxes,
  Building2,
  Disc3,
  Flame,
  Globe,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  MailX,
  MapPin,
  Network,
  ReceiptText,
  Scale,
  Server,
  ServerCog,
  SlidersHorizontal,
  Ticket,
  type LucideIcon,
} from "lucide-react"

export interface AdminNavItem {
  labelKey: string
  icon: LucideIcon
  path: string
  /**
   * Path PREFIX that should light this item up, when the routes it owns do not
   * all sit under `path`. The PVE fleet entry links to /admin/pve-clusters but
   * also owns /admin/pve-nodes and every node detail route, which NavLink's own
   * prefix matching would never associate with it.
   */
  match?: string
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
      // One entry: the sidebar modules live inside the service they belong to,
      // so there is no second place navigation can be turned off from.
      { labelKey: "superAdmin.serviceCatalog.title", icon: LayoutGrid, path: "/admin/services" },
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
      // THE CLUSTER IS THE CONTAINER.
      //
      // Its nodes, its managers, its networking, its inventory and its health
      // are sections INSIDE a cluster, not sidebar entries beside it. They are
      // meaningless without knowing which cluster is being asked about, and
      // giving each a top-level row meant every question started with picking a
      // page and then picking a cluster inside it — twice the navigation to
      // reach one answer.
      //
      // Nothing cluster-scoped is out here. What remains in this group is
      // genuinely separate from any one cluster: where zones are defined, and
      // the two products that sit on top of the fleet rather than inside it.
      {
        labelKey: "superAdmin.pveFleet.title",
        icon: ServerCog,
        path: "/admin/pve-clusters",
        match: "/admin/pve-",
      },
      { labelKey: "superAdmin.loadBalancers.title", icon: Scale, path: "/admin/load-balancers" },
      { labelKey: "superAdmin.staticIps.title", icon: Network, path: "/admin/static-ips" },
      { labelKey: "superAdmin.domains.title", icon: Globe, path: "/admin/domains" },
    ],
  },
  {
    // Shared hosting is its own product line, not part of the infrastructure
    // catalogue: an operator working on WHM servers is doing a different job
    // from one working on Proxmox nodes, and mixing them made both harder to
    // find.
    labelKey: "hosting.admin.nav.group",
    items: [
      { labelKey: "hosting.admin.nav.providers", icon: Server, path: "/admin/hosting/servers" },
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
