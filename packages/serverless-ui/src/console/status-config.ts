// Single source of truth mapping backend status strings to visual tones.
// Every status badge in the console renders through this config.

import { css } from "@emotion/css"

export type StatusTone = "success" | "neutral" | "warning" | "danger" | "info"

// The values are emotion-generated class names, so injecting one into any
// `className` works with no Tailwind build behind it. The 25% border mix is
// the border-status-*/25 recipe the Tailwind version used.
const toneClass = (name: StatusTone) => css`
  color: var(--status-${name});
  background: var(--status-${name}-bg);
  border-color: color-mix(in oklab, var(--status-${name}) 25%, transparent);
`

const toneDotClass = (name: StatusTone) => css`
  background: var(--status-${name});
`

export const TONE_CLASSES: Record<StatusTone, string> = {
  success: toneClass("success"),
  neutral: toneClass("neutral"),
  warning: toneClass("warning"),
  danger: toneClass("danger"),
  info: toneClass("info"),
}

export const TONE_DOT_CLASSES: Record<StatusTone, string> = {
  success: toneDotClass("success"),
  neutral: toneDotClass("neutral"),
  warning: toneDotClass("warning"),
  danger: toneDotClass("danger"),
  info: toneDotClass("info"),
}

const STATUS_TONES: Record<string, StatusTone> = {
  // lifecycle
  active: "success",
  ready: "success",
  running: "success",
  available: "success",
  healthy: "success",
  connected: "success",
  // in-flight
  creating: "info",
  provisioning: "info",
  starting: "info",
  registering: "info",
  pending: "warning",
  // attention
  draining: "warning",
  cordoned: "warning",
  degraded: "warning",
  updating: "warning",
  deleting: "warning",
  stopping: "warning",
  // terminal / inert
  stopped: "neutral",
  inactive: "neutral",
  disabled: "neutral",
  unknown: "neutral",
  // failure — a broken worker must never render as neutral grey
  error: "danger",
  failed: "danger",
  unhealthy: "danger",
  offline: "danger",
  lost: "danger",
}

// Statuses describing work still in flight. Badges render these with a spinner
// so a user always sees a loader until the operation actually settles.
const IN_FLIGHT: ReadonlySet<string> = new Set([
  "creating",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
  "updating",
  "pending",
  "registering",
])

export interface StatusConfig {
  tone: StatusTone
  label: string
  /** True when the status is an in-flight transition — render a spinner. */
  busy: boolean
}

export function getStatusConfig(status?: string | null): StatusConfig {
  if (!status) return { tone: "neutral", label: "unknown", busy: false }
  const normalized = status.toLowerCase()
  return {
    tone: STATUS_TONES[normalized] ?? "neutral",
    label: normalized,
    busy: IN_FLIGHT.has(normalized),
  }
}
