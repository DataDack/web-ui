import {
  type LucideIcon,
  Activity,
  ArrowRightLeft,
  BellRing,
  Building2,
  Cable,
  CreditCard,
  Disc,
  EthernetPort,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  FunctionSquare,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Network,
  Receipt,
  Rocket,
  Zap,
  Router,
  ScrollText,
  Server,
  Settings2,
  ShieldCheck,
  Ship,
  UserCog,
  Users,
  Waypoints,
} from "lucide-react"

export interface SidebarNavItem {
  labelKey: string
  icon: LucideIcon
  path: string
  /** Prefix used for active-state matching; defaults to path */
  match?: string
  /** Renders a "Soon" badge and marks the destination as a coming-soon page. */
  comingSoon?: boolean
}

export interface ConsoleService {
  key: string
  labelKey: string
  icon: LucideIcon
  items: SidebarNavItem[]
  /**
   * Extra path prefixes that belong to this service but have no visible nav
   * item — keeps their routes scoped to this service's sidebar. Used for
   * detail pages whose list view was merged elsewhere (e.g. /accounts/:id,
   * whose list now lives under Organization).
   */
  extraMatch?: string[]
}

// Service-scoped navigation (AWS-style): entering a service shows only that
// service's sections in the sidebar. The global drawer lists everything.
export const CONSOLE_SERVICES: ConsoleService[] = [
  {
    key: "compute",
    labelKey: "console.nav.groups.compute",
    icon: Server,
    // Target groups no longer have a nav item — they live as a tab on the
    // load balancer detail page — but their list/detail/create routes still
    // belong to compute, so keep them on this service's sidebar.
    extraMatch: ["/compute/target-groups"],
    items: [
      {
        labelKey: "console.nav.items.overview",
        icon: LayoutDashboard,
        path: "/compute/overview",
      },
      { labelKey: "console.nav.items.vms", icon: Server, path: "/compute/instances" },
      { labelKey: "console.nav.items.images", icon: Disc, path: "/compute/images" },
      { labelKey: "console.nav.items.sshKeys", icon: KeyRound, path: "/compute/ssh-keys" },
      {
        labelKey: "console.nav.items.loadBalancers",
        icon: Layers,
        path: "/compute/load-balancers",
      },
      {
        labelKey: "console.nav.items.autoscaling",
        icon: Activity,
        path: "/compute/autoscaling",
        comingSoon: true,
      },
      { labelKey: "console.nav.items.disks", icon: HardDrive, path: "/compute/disks" },
      {
        labelKey: "console.nav.items.kubernetes",
        icon: Ship,
        path: "/compute/kubernetes",
        comingSoon: true,
      },
    ],
  },
  {
    key: "networking",
    labelKey: "console.nav.groups.networking",
    icon: Network,
    items: [
      { labelKey: "console.nav.items.vpc", icon: Network, path: "/networking" },
      { labelKey: "console.nav.items.subnets", icon: GitBranch, path: "/networking/subnets" },
      {
        labelKey: "console.nav.items.securityGroups",
        icon: Lock,
        path: "/networking/security-groups",
      },
      {
        labelKey: "console.nav.items.routers",
        icon: Router,
        path: "/networking/routers",
      },
      {
        labelKey: "console.nav.items.internetGateways",
        icon: Waypoints,
        path: "/networking/internet-gateways",
      },
      {
        labelKey: "console.nav.items.natGateways",
        icon: ArrowRightLeft,
        path: "/networking/nat-gateways",
      },
      {
        labelKey: "console.nav.items.vpn",
        icon: Cable,
        path: "/networking/vpn",
      },
      {
        labelKey: "console.nav.items.staticIps",
        icon: Globe,
        path: "/networking/static-ips",
      },
      {
        labelKey: "console.nav.items.networkInterfaces",
        icon: EthernetPort,
        path: "/networking/network-interfaces",
      },
    ],
  },
  {
    key: "monitoring",
    labelKey: "console.nav.groups.monitoring",
    icon: Activity,
    items: [
      {
        labelKey: "console.nav.items.overview",
        icon: Gauge,
        path: "/monitoring",
      },
      {
        labelKey: "console.nav.items.alarms",
        icon: BellRing,
        path: "/monitoring/alarms",
      },
      {
        labelKey: "console.nav.items.logs",
        icon: ScrollText,
        path: "/monitoring/logs",
      },
    ],
  },
  {
    key: "managed-apps",
    labelKey: "console.nav.groups.managedApps",
    icon: Rocket,
    // One service, two ways of running a site: repo-built apps and cPanel
    // hosting. They used to be two sidebar groups that shared nothing but the
    // customer, so a person with one of each had to hold two mental models of
    // "my websites". They are now tabs on one page, and these items address
    // those tabs by their ?tab= value.
    //
    // Overview's "/managed-apps" prefix covers /projects/:id, /create and
    // /github/callback; the tab items are longer and more specific, so
    // isItemActiveAmong hands each of them the active state on its own tab.
    //
    // Plans & pricing is NOT an item: buying hosting is what the cPanel Hosting
    // view shows an account that has none, so a fourth item selling the same
    // thing was a second door into one room — and a permanent one, still in the
    // sidebar long after every plan on it had been bought.
    //
    // extraMatch keeps the hosting routes that are NOT tabs — the buy flow at
    // /hosting/plans and an account's detail page at /hosting/:id — inside
    // this service's sidebar rather than dropping the user into no service.
    extraMatch: ["/hosting"],
    items: [
      {
        labelKey: "console.nav.items.overview",
        icon: LayoutDashboard,
        path: "/managed-apps",
      },
      {
        labelKey: "console.nav.items.apps",
        icon: Rocket,
        path: "/managed-apps?tab=apps",
      },
      {
        labelKey: "console.nav.items.cpanelHosting",
        icon: Globe,
        path: "/managed-apps?tab=hosting",
      },
      {
        labelKey: "console.nav.items.settings",
        icon: Settings2,
        path: "/managed-apps/settings",
      },
    ],
  },
  {
    key: "serverless",
    labelKey: "console.nav.groups.serverless",
    icon: Zap,
    // Functions' "/serverless" prefix covers /functions/:name; Layers is
    // longer and more specific, so it takes its own active state.
    items: [
      {
        labelKey: "console.nav.items.functions",
        icon: FunctionSquare,
        path: "/serverless",
      },
      {
        labelKey: "console.nav.items.layers",
        icon: Layers,
        path: "/serverless/layers",
      },
    ],
  },
  {
    key: "iam",
    labelKey: "console.nav.groups.iam",
    icon: ShieldCheck,
    items: [
      { labelKey: "console.nav.items.iamUsers", icon: Users, path: "/iam/users" },
      { labelKey: "console.nav.items.iamGroups", icon: Users, path: "/iam/groups" },
      {
        labelKey: "console.nav.items.iamRoles",
        icon: ShieldCheck,
        path: "/iam/roles",
        comingSoon: true,
      },
      { labelKey: "console.nav.items.iamPolicies", icon: FileText, path: "/iam/policies" },
      {
        labelKey: "console.nav.items.iamPermissions",
        icon: KeyRound,
        path: "/iam/permissions",
      },
    ],
  },
  {
    key: "governance",
    labelKey: "console.nav.groups.governance",
    icon: FolderKanban,
    // Account detail pages live under /accounts/:id; their list was merged
    // into the Organization page, so keep them on the governance sidebar.
    extraMatch: ["/accounts"],
    items: [
      {
        labelKey: "console.nav.items.account",
        icon: Building2,
        path: "/governance/account",
      },
      {
        labelKey: "console.nav.items.profile",
        icon: UserCog,
        path: "/governance/profile",
      },
      {
        labelKey: "console.nav.items.namingConventions",
        icon: ScrollText,
        path: "/governance/naming-conventions",
      },
      {
        labelKey: "console.nav.items.quotas",
        icon: Gauge,
        path: "/governance/quotas",
      },
      { labelKey: "console.nav.items.billing", icon: CreditCard, path: "/billing" },
      {
        labelKey: "console.nav.items.taxSettings",
        icon: Receipt,
        path: "/governance/tax-settings",
      },
    ],
  },
  {
    key: "support",
    labelKey: "console.nav.groups.support",
    icon: LifeBuoy,
    items: [
      {
        labelKey: "console.nav.items.supportTickets",
        icon: LifeBuoy,
        path: "/support/tickets",
      },
    ],
  },
]

/** Full grouped nav for the global drawer (all services + dashboard) */
export const ALL_NAV_GROUPS: { labelKey: string; items: SidebarNavItem[] }[] = [
  {
    labelKey: "console.nav.groups.overview",
    items: [
      {
        labelKey: "console.nav.items.dashboard",
        icon: LayoutDashboard,
        path: "/",
        match: "/",
      },
    ],
  },
  ...CONSOLE_SERVICES.map((service) => ({
    labelKey: service.labelKey,
    items: service.items,
  })),
]

/** Splits "/managed-apps?tab=hosting" into its path and its query string. */
function splitTarget(target: string): [path: string, query: string] {
  const mark = target.indexOf("?")
  return mark === -1 ? [target, ""] : [target.slice(0, mark), target.slice(mark + 1)]
}

/**
 * Whether a nav target covers the current location.
 *
 * A target may carry a query string ("/managed-apps?tab=hosting"). Tabs are
 * page state rather than routes, so matching on the pathname alone would light
 * up every tab's item at once. Every param the target names must be present
 * with that value; params it does NOT name are ignored, so a tab that is also
 * filtered (?tab=apps&state=failed) still owns its item.
 */
export function isItemActive(pathname: string, path: string, match?: string, search = ""): boolean {
  const [targetPath, targetQuery] = splitTarget(match ?? path)

  if (targetPath === "/") {
    if (pathname !== "/") return false
  } else if (pathname !== targetPath && !pathname.startsWith(`${targetPath}/`)) {
    return false
  }

  if (targetQuery === "") return true
  const current = new URLSearchParams(search)
  return [...new URLSearchParams(targetQuery)].every(([key, value]) => current.get(key) === value)
}

/**
 * Specificity-aware active state: an item is active only when it matches AND no
 * sibling has a longer (more specific) matching target. This lets a nested item
 * like /compute/overview win over its parent /compute, while /compute/:id still
 * resolves to the parent (the only matching sibling). A query-bearing target is
 * longer than the bare path it extends, so ?tab=apps outranks /managed-apps for
 * free.
 */
export function isItemActiveAmong(
  pathname: string,
  item: SidebarNavItem,
  siblings: SidebarNavItem[],
  search = "",
): boolean {
  if (!isItemActive(pathname, item.path, item.match, search)) return false
  const target = item.match ?? item.path
  return !siblings.some((sibling) => {
    if (sibling === item) return false
    const siblingTarget = sibling.match ?? sibling.path
    return (
      siblingTarget.length > target.length &&
      isItemActive(pathname, sibling.path, sibling.match, search)
    )
  })
}

/** Which service owns the current route — drives the service-scoped sidebar */
export function findServiceByPath(pathname: string): ConsoleService | undefined {
  return CONSOLE_SERVICES.find(
    (service) =>
      service.items.some((item) => isItemActive(pathname, item.path, item.match)) ||
      service.extraMatch?.some((prefix) => isItemActive(pathname, prefix)),
  )
}
