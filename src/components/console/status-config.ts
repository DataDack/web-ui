// Single source of truth mapping backend status strings to visual tones.
// Every status badge in the console renders through this config.

export type StatusTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info'

export const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'text-status-success bg-status-success-bg border-status-success/25',
  neutral: 'text-status-neutral bg-status-neutral-bg border-status-neutral/25',
  warning: 'text-status-warning bg-status-warning-bg border-status-warning/25',
  danger: 'text-status-danger bg-status-danger-bg border-status-danger/25',
  info: 'text-status-info bg-status-info-bg border-status-info/25',
}

export const TONE_DOT_CLASSES: Record<StatusTone, string> = {
  success: 'bg-status-success',
  neutral: 'bg-status-neutral',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  info: 'bg-status-info',
}

const STATUS_TONES: Record<string, StatusTone> = {
  // lifecycle
  active: 'success',
  ready: 'success',
  running: 'success',
  available: 'success',
  healthy: 'success',
  connected: 'success',
  // in-flight
  creating: 'info',
  provisioning: 'info',
  pending: 'warning',
  starting: 'info',
  registering: 'info',
  // attention
  draining: 'warning',
  cordoned: 'warning',
  degraded: 'warning',
  updating: 'warning',
  deleting: 'warning',
  stopping: 'warning',
  // terminal / inert
  stopped: 'neutral',
  inactive: 'neutral',
  disabled: 'neutral',
  unknown: 'neutral',
  // failure
  error: 'danger',
  failed: 'danger',
  unhealthy: 'danger',
  offline: 'danger',
  lost: 'danger',
}

// Statuses describing work still in flight. Badges render these with a spinner
// so a user always sees a loader until the operation actually settles.
const IN_FLIGHT: ReadonlySet<string> = new Set([
  'creating',
  'provisioning',
  'starting',
  'stopping',
  'deleting',
  'updating',
  'pending',
  'registering',
])

export interface StatusConfig {
  tone: StatusTone
  label: string
  /** True when the status is an in-flight transition — render a spinner. */
  busy: boolean
}

export function getStatusConfig(status?: string | null): StatusConfig {
  if (!status) return { tone: 'neutral', label: 'unknown', busy: false }
  const normalized = status.toLowerCase()
  return {
    tone: STATUS_TONES[normalized] ?? 'neutral',
    label: normalized,
    busy: IN_FLIGHT.has(normalized),
  }
}
