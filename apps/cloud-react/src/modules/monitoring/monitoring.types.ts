// ---------------------------------------------------------------------------
// Backend DTOs — cloud-be-go: apps "monitoring", modules "alerts" + "metrics".
// Field names are snake_case to match the Go JSON contract exactly.
// ---------------------------------------------------------------------------

export type ChannelType = "discord" | "jira" | "webhook"

export type AlertSeverity = "info" | "warning" | "critical"

export interface DiscordChannelConfig {
  webhook_url: string
}

/**
 * Jira channel config. Two auth modes:
 *   - "oauth" (Continue with Jira): only `project_key` (+ optional `cloud_id`
 *     to pick a site) is needed; tokens live in the account's connection.
 *   - "token": classic `base_url` + `email` + `api_token`.
 * `auth_mode` defaults to "token" server-side when omitted.
 */
export interface JiraChannelConfig {
  auth_mode?: "oauth" | "token"
  cloud_id?: string
  base_url?: string
  email?: string
  api_token?: string
  project_key: string
  issue_type?: string
  labels?: string[]
}

/** A connected Atlassian site (GET /channels/jira/connections). No secrets. */
export interface JiraConnection {
  cloud_id: string
  site_url: string
  name?: string
  expires_at?: string
}

/** GET /channels/jira/oauth/authorize-url. */
export interface JiraAuthorizeUrl {
  url: string
}

/** GET /channels/jira/projects?cloud_id=. */
export interface JiraProject {
  key: string
  name: string
}

/** GET /channels/jira/issue-types?cloud_id=&project_key=. */
export interface JiraIssueType {
  id: string
  name: string
  subtask: boolean
}

/** GET /channels/jira/labels?cloud_id=&project_key=. */
export interface JiraLabel {
  name: string
}

export interface WebhookChannelConfig {
  url: string
  secret?: string
}

/** POST /monitoring/alerts/channels/test — exactly one config block per `type`. */
export interface TestChannelRequest {
  type: ChannelType
  severity?: AlertSeverity
  discord?: DiscordChannelConfig
  jira?: JiraChannelConfig
  webhook?: WebhookChannelConfig
}

/**
 * Test-delivery outcome. The backend answers 200 even when delivery fails —
 * `delivered: false` plus `error` describes the failure; only a malformed
 * request is a 400. `issue_key`/`issue_url` are Jira-only extras.
 */
export interface TestChannelResult {
  channel: string
  delivered: boolean
  status_code?: number
  issue_key?: string
  issue_url?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Channels — /monitoring/alerts/channels
// ---------------------------------------------------------------------------

/** Saved channel row — config is masked into `config_summary`, never echoed. */
export interface ChannelResponse {
  id: string
  name: string
  type: ChannelType
  config_summary: string
  min_severity: AlertSeverity
  enabled: boolean
  last_delivery_at: string | null
  last_delivery_status: string
  created_at: string
}

/** POST /channels — exactly one config block per `type`. */
export interface CreateChannelRequest {
  name: string
  type: ChannelType
  min_severity?: AlertSeverity
  discord?: DiscordChannelConfig
  jira?: JiraChannelConfig
  webhook?: WebhookChannelConfig
}

/** The backend test-delivers on create and returns both the row and the result. */
export interface CreateChannelResponse {
  channel: ChannelResponse
  test: TestChannelResult
}

/** PUT /channels/:id — omit the config block to keep the stored config. */
export interface UpdateChannelRequest {
  name?: string
  min_severity?: AlertSeverity
  enabled?: boolean
  discord?: DiscordChannelConfig
  jira?: JiraChannelConfig
  webhook?: WebhookChannelConfig
}

// ---------------------------------------------------------------------------
// Alarms — /monitoring/alerts/alarms
// ---------------------------------------------------------------------------

export type AlarmState = "OK" | "ALARM" | "INSUFFICIENT_DATA"

export type AlarmStatistic = "avg" | "sum" | "min" | "max" | "p95" | "p99"

export type AlarmComparisonOperator = "gt" | "gte" | "lt" | "lte"

export type TreatMissingData = "missing" | "ignore" | "breaching" | "not_breaching"

/**
 * States a channel can be notified about.
 *
 * Mirrors CloudWatch's three independent action lists (AlarmActions, OKActions,
 * InsufficientDataActions): a binding carries any non-empty SUBSET, so "page me
 * on ALARM and when it goes quiet, but not on recovery" is expressible. The
 * superseded single-valued form had a "both" member and no way to say
 * INSUFFICIENT_DATA at all — which is why a resource going silent could not be
 * alerted on. The backend still accepts the old field from older clients; this UI
 * only ever sends sets.
 */
export type AlarmTransition = "ALARM" | "OK" | "INSUFFICIENT_DATA"

/** Channel binding as echoed on an alarm (denormalized with channel info). */
export interface AlarmChannelBinding {
  channel_id: string
  channel_name: string
  channel_type: ChannelType
  on_transitions: AlarmTransition[]
}

export interface Alarm {
  id: string
  name: string
  description: string
  metric_namespace: string
  metric_name: string
  dimensions: Record<string, string>
  statistic: AlarmStatistic
  period_seconds: number
  evaluation_periods: number
  datapoints_to_alarm: number
  comparison_operator: AlarmComparisonOperator
  threshold: number
  treat_missing_data: TreatMissingData
  severity: AlertSeverity
  alarm_type: string
  state: AlarmState
  state_reason: string
  state_updated_at: string
  enabled: boolean
  channels: AlarmChannelBinding[]
  created_at: string
}

/** Channel binding as sent on create/update. */
export interface AlarmChannelBindingInput {
  channel_id: string
  on_transitions: AlarmTransition[]
}

export interface CreateAlarmRequest {
  name: string
  description: string
  metric_namespace: string
  metric_name: string
  dimensions: Record<string, string>
  statistic: AlarmStatistic
  period_seconds: number
  evaluation_periods: number
  datapoints_to_alarm: number
  comparison_operator: AlarmComparisonOperator
  threshold: number
  treat_missing_data: TreatMissingData
  severity: AlertSeverity
  channels: AlarmChannelBindingInput[]
}

/** PUT /alarms/:id is a full replace of the mutable fields (same shape). */
export type UpdateAlarmRequest = CreateAlarmRequest

/**
 * One state transition. `evaluated_datapoints` are the window values that
 * drove the decision — a value of -1 marks a bucket with no datapoints.
 */
export interface AlarmHistoryEntry {
  id: string
  alarm_id: string
  from_state: AlarmState
  to_state: AlarmState
  reason: string
  evaluated_datapoints: number[]
  created_at: string
}

export interface AlarmNotification {
  id: string
  alarm_id: string
  channel_id: string | null
  status: "sent" | "failed"
  http_status: number | null
  error: string
  external_ref: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Metric catalog + alarm targets — UI-side contract (see monitoring.targets.ts).
//
// These are the shapes the target-first create flow works in. They mirror what
// `GET /monitoring/metrics/catalog` should return once it exists, so switching
// the catalog from a client constant to a fetched payload is a one-file change.
// ---------------------------------------------------------------------------

/** One selectable metric on a target type, with the defaults it deserves. */
export interface MetricDescriptor {
  metric: string
  label: string
  /** Display unit ("%", "ms", "req/s"); empty for unitless gauges. */
  unit: string
  description: string
  /** Statistic that makes sense for this metric. */
  statistic: AlarmStatistic
  /** Breach direction that makes sense for this metric. */
  operator: AlarmComparisonOperator
  /** Starting threshold — a sane default, not a recommendation. */
  threshold: number
}

/**
 * A resource the alarm can watch, normalized from whichever service owns it
 * (load balancers, instances, disks) so the picker renders one row shape.
 */
export interface AlarmTarget {
  id: string
  name: string
  /** Raw resource status, rendered through the console's status registry. */
  status: string
  /** One-line secondary detail: addresses, size, attachment. */
  detail: string
}

// ---------------------------------------------------------------------------
// Metrics — /monitoring/metrics/query
// ---------------------------------------------------------------------------

export interface MetricsQueryParams {
  namespace: string
  metric: string
  statistic: AlarmStatistic
  period: number
  dimensions?: Record<string, string>
  /** RFC3339 range bounds. */
  from: string
  to: string
}

/**
 * UI-side rolling-window variant: `windowMs` is resolved to concrete `from`/
 * `to` bounds inside the query fetcher (render code must stay pure), keeping
 * the query key stable across renders.
 */
export interface MetricsWindowQuery {
  namespace: string
  metric: string
  statistic: AlarmStatistic
  period: number
  dimensions?: Record<string, string>
  /** Window length in ms, ending at "now" floored to the minute. */
  windowMs: number
}

/** One aggregation bucket — `value: null` is a real gap (no datapoints). */
export interface MetricsQueryBucket {
  ts: string
  value: number | null
}

export interface MetricsQueryResult {
  namespace: string
  metric_name: string
  statistic: string
  period_seconds: number
  buckets: MetricsQueryBucket[]
}

// ---------------------------------------------------------------------------
// Logs — UI-side types, mock-backed until log endpoints land on the backend.
// ---------------------------------------------------------------------------

export type LogSeverity = "error" | "warn" | "info"

export interface LogGroup {
  id: string
  name: string
  streams: string[]
}

export interface LogEvent {
  /** LogGroup.name this event belongs to */
  group: string
  stream: string
  severity: LogSeverity
  message: string
  /** ISO timestamp of the event */
  at: string
}
