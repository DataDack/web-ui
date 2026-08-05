import type { StatusTone } from "@datadack/common-ui"

import type { AccountStatus, JobStatus, ServerStatus } from "./hosting.types"

/** Backend route roots. Admin surfaces live under each module's /admin group. */
export const HOSTING_API = {
  plans: "/hosting/plans",
  accounts: "/hosting/accounts",
  servers: "/hosting/servers",
  modules: "/hosting/modules",
  jobs: "/hosting/jobs",
  audit: "/hosting/audit",
} as const

export const HOSTING_ROUTES = {
  pricing: "/hosting/plans",
  accounts: "/hosting",
  account: (id: string) => `/hosting/${id}`,
} as const

export const HOSTING_ADMIN_ROUTES = {
  servers: "/admin/hosting/servers",
  serverNew: "/admin/hosting/servers/new",
  serverEdit: (id: string) => `/admin/hosting/servers/${id}/edit`,
  serverGroups: "/admin/hosting/server-groups",
  plans: "/admin/hosting/plans",
  planNew: "/admin/hosting/plans/new",
  planEdit: (sku: string) => `/admin/hosting/plans/${sku}/edit`,
  accounts: "/admin/hosting/accounts",
  account: (id: string) => `/admin/hosting/accounts/${id}`,
  queue: "/admin/hosting/queue",
} as const

export const HOSTING_QUERY_KEYS = {
  publicPlans: ["hosting", "plans"] as const,
  accounts: ["hosting", "accounts"] as const,
  account: (id: string) => ["hosting", "accounts", id] as const,

  adminModules: ["hosting", "admin", "modules"] as const,
  adminServers: ["hosting", "admin", "servers"] as const,
  adminServer: (id: string) => ["hosting", "admin", "servers", id] as const,
  adminServerPackages: (id: string) => ["hosting", "admin", "servers", id, "packages"] as const,
  adminServerGroups: ["hosting", "admin", "server-groups"] as const,
  adminPlans: ["hosting", "admin", "plans"] as const,
  adminPlan: (sku: string) => ["hosting", "admin", "plans", sku] as const,
  adminAccounts: ["hosting", "admin", "accounts"] as const,
  adminAccount: (id: string) => ["hosting", "admin", "accounts", id] as const,
  adminJobs: ["hosting", "admin", "jobs"] as const,
  adminJobCounts: ["hosting", "admin", "jobs", "counts"] as const,
  adminAudit: ["hosting", "admin", "audit"] as const,
  adminImportScan: (serverId: string) => ["hosting", "admin", "import", serverId] as const,
}

/**
 * How often an account in flight is re-read.
 *
 * Provisioning is a queued panel call that normally lands in seconds, so the
 * console polls rather than making the customer refresh. Polling STOPS as soon
 * as nothing is in flight — see useHostingAccounts.
 */
export const PROVISIONING_POLL_MS = 5_000

/** The queue page auto-refreshes: operators watch it while a batch drains. */
export const QUEUE_POLL_MS = 10_000

export const ACCOUNT_STATUS_TONE: Record<AccountStatus, StatusTone> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "warning",
  TERMINATED: "neutral",
  FAILED: "danger",
}

export const SERVER_STATUS_TONE: Record<ServerStatus, StatusTone> = {
  ACTIVE: "success",
  FULL: "warning",
  MAINTENANCE: "info",
  UNREACHABLE: "danger",
}

export const JOB_STATUS_TONE: Record<JobStatus, StatusTone> = {
  QUEUED: "info",
  PROCESSING: "info",
  RETRY: "warning",
  COMPLETED: "success",
  DEAD_LETTER: "danger",
  CANCELLED: "neutral",
}

export const FILL_MODE_OPTIONS = [
  { value: "fill", label: "Fill first — pack one server before using the next" },
  { value: "least_full", label: "Least full — spread across the group" },
  { value: "round_robin", label: "Round robin — rotate by least recently used" },
] as const

export const AUTO_SETUP_OPTIONS = [
  { value: "on_payment", label: "Automatically once payment is received" },
  { value: "on_order", label: "Immediately on order, before payment" },
  { value: "manual", label: "Manually — leave pending for an operator" },
] as const

/** -1 is the unlimited sentinel everywhere in the hosting domain. */
export const UNLIMITED = -1
