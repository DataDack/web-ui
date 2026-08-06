import { parseTags, type TagsInput } from "@datadack/common-ui"

import { apiGet } from "@/services/api/client"

import { SEARCH_TYPE_LABELS, SEARCH_TYPE_ORDER } from "./search.constants"
import type {
  SearchResponse,
  SearchResult,
  SearchResultStatus,
  SearchResultType,
} from "./search.types"

/* ── Module navigation (client-side) ───────────────────────────────────────
 * Console sections aren't backend resources — they're navigation. We keep them
 * here so the palette can jump straight to a module, and so the empty-query
 * state has something useful to show. They are filtered by the query locally
 * and merged ahead of the live resource hits.
 */
const MODULES: SearchResult[] = [
  {
    id: "module-dashboard",
    type: "module",
    label: "Dashboard",
    description: "Telemetry, zone status and command centre",
    path: "/",
    status: "active",
  },
  {
    id: "module-compute",
    type: "module",
    iconType: "vm",
    label: "Compute",
    description: "Fleet overview, instances and compute resources",
    path: "/compute/overview",
    status: "active",
  },
  {
    id: "module-vms",
    type: "module",
    iconType: "vm",
    label: "Virtual Machines",
    description: "Compute instances, templates and snapshots",
    path: "/compute/instances",
    status: "active",
  },
  {
    id: "module-disks",
    type: "module",
    iconType: "disk",
    label: "Disks",
    description: "Block volumes and snapshots",
    path: "/compute/disks",
    status: "active",
  },
  {
    id: "module-vpc",
    type: "module",
    iconType: "vpc",
    label: "VPC Networks",
    description: "Virtual private clouds, subnets and firewalls",
    path: "/networking",
    status: "active",
  },
  {
    id: "module-static-ips",
    type: "module",
    iconType: "static-ip",
    label: "Static IPs",
    description: "Reserved public addresses",
    path: "/networking/static-ips",
    status: "active",
  },
  {
    id: "module-network-interfaces",
    type: "module",
    iconType: "network-interface",
    label: "Network Interfaces",
    description: "Elastic network interfaces (ENI) for your instances",
    path: "/networking/network-interfaces",
    status: "active",
  },
  {
    id: "module-iam",
    type: "module",
    iconType: "iam-user",
    label: "IAM & Access",
    description: "Users, roles, service accounts and permissions",
    path: "/iam/users",
    status: "active",
  },
  {
    id: "module-rg",
    type: "module",
    iconType: "resource-group",
    label: "Resource Groups",
    description: "Logical resource groupings",
    path: "/resource-groups",
    status: "active",
  },
  {
    id: "module-billing",
    type: "module",
    iconType: "invoice",
    label: "Billing & Costs",
    description: "Invoices, budgets and expenditure",
    path: "/billing",
    status: "active",
  },
  {
    id: "module-monitoring",
    type: "module",
    label: "Monitoring & Alerts",
    description: "Alarms over live metrics, notification channels and logs",
    path: "/monitoring",
    status: "active",
  },
  {
    id: "module-monitoring-alarms",
    type: "module",
    label: "Alarms",
    description: "CloudWatch-style metric alarms and state history",
    path: "/monitoring/alarms",
    status: "active",
  },
  {
    id: "module-monitoring-channels",
    type: "module",
    label: "Notification Channels",
    description: "Discord, Jira and webhook delivery targets",
    path: "/monitoring/channels",
    status: "active",
  },
  {
    id: "module-monitoring-logs",
    type: "module",
    label: "Logs",
    description: "Log groups and events (coming soon)",
    path: "/monitoring/logs",
    status: "active",
  },
  {
    id: "module-managed-apps",
    type: "module",
    label: "Managed Apps",
    description: "Deploy OpenNext, React and n8n apps from GitHub",
    path: "/managed-apps",
    status: "active",
  },
  {
    id: "module-managed-apps-create",
    type: "module",
    label: "Deploy application",
    description: "Deploy a new managed app from a GitHub repository",
    path: "/managed-apps/create",
    status: "active",
  },
  {
    id: "module-managed-apps-opennext",
    type: "module",
    label: "OpenNext",
    description: "Server-rendered Next.js deployments (OpenNext)",
    path: "/managed-apps?tab=apps&type=opennext",
    status: "active",
  },
  {
    id: "module-managed-apps-react",
    type: "module",
    label: "React app",
    description: "Static React app hosting with managed builds",
    path: "/managed-apps?tab=apps&type=react",
    status: "active",
  },
  {
    id: "module-hosting",
    type: "module",
    label: "cPanel Hosting",
    description: "Shared cPanel hosting accounts",
    path: "/managed-apps?tab=hosting",
    status: "active",
  },
  {
    id: "module-hosting-plans",
    type: "module",
    label: "Hosting plans",
    description: "Shared hosting plans and pricing",
    path: "/hosting/plans",
    status: "active",
  },
  {
    id: "module-managed-apps-n8n",
    type: "module",
    label: "n8n",
    description: "Managed n8n agent workflow instances (coming soon)",
    path: "/managed-apps?tab=apps&type=n8n",
    status: "active",
  },
]

/* ── Backend contract ──────────────────────────────────────────────────────
 * GET /resources/search?q=… → Hit[] (envelope unwrapped by apiGet).
 */
interface SearchHit {
  id: string
  name: string
  service: string
  type: string
  region?: string
  status?: string
  tags?: Exclude<TagsInput, undefined>
  meta?: string[]
  updated_at?: string
}

const SEARCH_ENDPOINT = "/resources/search"

/** Coerce a backend resource type to a console SearchResultType. */
function toResultType(t: string): SearchResultType {
  switch (t) {
    case "instance":
      return "vm"
    case "network":
      return "vpc"
    case "vm":
    case "disk":
    case "ssh-key":
    case "load-balancer":
    case "database":
    case "vpc":
    case "subnet":
    case "static-ip":
    case "network-interface":
    case "iam-user":
    case "iam-role":
    case "resource-group":
    case "invoice":
      return t
    default:
      return "resource-group"
  }
}

/** Console route to a resource's own page, by type. */
const PATH_BY_TYPE: Record<SearchResultType, (id: string) => string> = {
  module: () => "/",
  vm: (id) => `/compute/instances/${id}`,
  "load-balancer": (id) => `/compute/load-balancers/${id}`,
  vpc: (id) => `/networking/${id}`,
  database: (id) => `/databases/${id}`,
  "resource-group": (id) => `/resource-groups/${id}`,
  "iam-user": (id) => `/iam/users/${id}`,
  "iam-role": (id) => `/iam/roles/${id}`,
  disk: () => "/compute/disks",
  "ssh-key": () => "/compute/ssh-keys",
  subnet: () => "/networking",
  "static-ip": () => "/networking/static-ips",
  "network-interface": () => "/networking/network-interfaces",
  invoice: () => "/billing",
}

function pathFor(type: SearchResultType, id: string): string {
  return PATH_BY_TYPE[type](id)
}

const KNOWN_STATUSES = new Set<SearchResultStatus>([
  "running",
  "stopped",
  "pending",
  "error",
  "active",
  "inactive",
  "optimal",
  "paid",
  "overdue",
])

/** Normalise a backend status string to the console's status vocabulary. */
function toStatus(s?: string): SearchResultStatus | undefined {
  if (!s) return undefined
  if (KNOWN_STATUSES.has(s as SearchResultStatus)) return s as SearchResultStatus
  switch (s) {
    case "available":
    case "in_use":
    case "in-use":
    case "associated":
    case "succeeded":
      return "active"
    case "provisioning":
    case "creating":
    case "draft":
    case "open":
    case "detaching":
      return "pending"
    case "failed":
      return "error"
    case "terminated":
    case "deleted":
    case "releasing":
      return "inactive"
    default:
      return undefined
  }
}

/** Parse tags (a JSON object from the API, or legacy JSON string) into
 *  ["env:prod"] chips. */
function toTags(raw?: TagsInput): string[] | undefined {
  const obj = parseTags(raw)
  const tags = Object.entries(obj).map(([k, v]) => (v ? `${k}:${v}` : k))
  return tags.length > 0 ? tags : undefined
}

function toResult(hit: SearchHit): SearchResult {
  const type = toResultType(hit.type)
  const descParts = [SEARCH_TYPE_LABELS[type], hit.region].filter(Boolean)
  return {
    id: `${type}-${hit.id}`,
    type,
    label: hit.name,
    description: descParts.join(" · "),
    path: pathFor(type, hit.id),
    status: toStatus(hit.status),
    region: hit.region,
    meta: hit.meta?.filter(Boolean),
    tags: toTags(hit.tags),
    updatedAt: hit.updated_at,
  }
}

function groupResults(results: SearchResult[]): SearchResponse["groups"] {
  const byType = new Map<SearchResultType, SearchResult[]>()
  for (const result of results) {
    const arr = byType.get(result.type) ?? []
    arr.push(result)
    byType.set(result.type, arr)
  }
  return SEARCH_TYPE_ORDER.filter((t) => byType.has(t)).map((type) => ({
    type,
    label: SEARCH_TYPE_LABELS[type],
    results: byType.get(type) ?? [],
  }))
}

function matchModules(q: string): SearchResult[] {
  if (!q) return MODULES
  return MODULES.filter(
    (m) => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
  )
}

export const searchApi = {
  search: async (query: string): Promise<SearchResponse> => {
    const q = query.trim().toLowerCase()

    // Empty query: just offer module navigation (no backend round-trip).
    if (!q) {
      const groups = groupResults(matchModules(""))
      return { query, groups, totalCount: 0 }
    }

    const hits = await apiGet<SearchHit[]>(
      `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query.trim())}`,
    )
    const merged = [...matchModules(q), ...hits.map(toResult)]

    return {
      query,
      groups: groupResults(merged),
      totalCount: merged.length,
    }
  },
}
