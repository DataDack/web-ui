// Single source of truth mapping backend status strings to visual tones.
// Every status badge in the console renders through this config.

export type StatusTone = "success" | "neutral" | "warning" | "danger" | "info"

export const TONE_CLASSES: Record<StatusTone, string> = {
  success: "text-status-success bg-status-success-bg border-status-success/25",
  neutral: "text-status-neutral bg-status-neutral-bg border-status-neutral/25",
  warning: "text-status-warning bg-status-warning-bg border-status-warning/25",
  danger: "text-status-danger bg-status-danger-bg border-status-danger/25",
  info: "text-status-info bg-status-info-bg border-status-info/25",
}

export const TONE_DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-status-success",
  neutral: "bg-status-neutral",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
  info: "bg-status-info",
}

const STATUS_TONES: Record<string, StatusTone> = {
  // lifecycle
  running: "success",
  active: "success",
  available: "success",
  attached: "success",
  operational: "success",
  paid: "success",
  healthy: "success",
  connected: "success",
  // load-balancer target health, written by the backend's HAProxy poller.
  // Without these an unhealthy backend would render as neutral grey — the one
  // colour it must never be.
  unhealthy: "danger",
  draining: "warning",
  unused: "neutral",
  initial: "info",
  // in-flight
  creating: "info",
  "in-use": "info",
  assigned: "info",
  provisioning: "info",
  // VPC router realization: guest started but no transport yet (booting),
  // transport up and pushing config (configuring). Same "in progress" tone as
  // provisioning — they're just later steps in the same rollout.
  booting: "info",
  configuring: "info",
  // A serverless function that exists but has never run: its package is stored
  // and its config is valid, but no worker has stood a sandbox up for it yet.
  // Not a failure and not ready — the same in-progress tone as provisioning.
  draft: "info",
  starting: "info",
  stopping: "warning",
  terminating: "warning",
  // support ticket lifecycle
  open: "info",
  in_progress: "warning",
  waiting_user: "warning",
  resolved: "success",
  // attention
  pending: "warning",
  suspended: "warning",
  restarting: "warning",
  updating: "warning",
  deleting: "warning",
  degraded: "warning",
  maintenance: "warning",
  overdue: "warning",
  detaching: "warning",
  // terminal / inert
  stopped: "neutral",
  inactive: "neutral",
  detached: "neutral",
  unassigned: "neutral",
  reserved: "neutral",
  void: "neutral",
  closed: "neutral",
  disabled: "neutral",
  expired: "neutral",
  cancelled: "neutral",
  // failure
  error: "danger",
  failed: "danger",
  outage: "danger",
  unpaid: "danger",
}

// Statuses describing work still in flight. Badges render these with a spinner
// so a user always sees a loader until the operation actually settles.
const IN_FLIGHT_STATUSES: ReadonlySet<string> = new Set([
  "creating",
  "provisioning",
  "booting",
  "configuring",
  // A draft is waiting on a worker, so it spins rather than sitting still —
  // it resolves on its own once a sandbox reports ready.
  "draft",
  "starting",
  "stopping",
  "restarting",
  "deleting",
  "terminating",
  "detaching",
  "updating",
  "pending",
])

export interface StatusConfig {
  tone: StatusTone
  labelKey: string
  /** True when the status is an in-flight transition — render a spinner. */
  busy: boolean
}

export function getStatusConfig(status?: string | null): StatusConfig {
  if (!status) return { tone: "neutral", labelKey: "status.unknown", busy: false }
  const normalized = status.toLowerCase()
  return {
    tone: STATUS_TONES[normalized] ?? "neutral",
    labelKey: `status.${normalized}`,
    busy: IN_FLIGHT_STATUSES.has(normalized),
  }
}
