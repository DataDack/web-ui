// Shared presentation vocabulary for the monitoring module.
//
// Alarm states are not part of the console's shared status-config registry, so
// they get their own tone map here — but only ONCE. This module previously kept
// three diverging copies of these labels (list, detail, overview), which is how
// "INSUFFICIENT_DATA" ended up rendering as three different strings.
//
// Wording rule: the raw backend enums never reach the screen. In particular
// INSUFFICIENT_DATA reads as "Not reporting", because it almost always means the
// resource is off or nothing is pushing the metric — not that the alarm broke.

import type {
    Alarm,
    AlarmComparisonOperator,
    AlarmState,
    AlarmTransition,
    TreatMissingData,
} from "./monitoring.types"

// ---------------------------------------------------------------------------
// Alarm state
// ---------------------------------------------------------------------------

export interface AlarmStateMeta {
    label: string
    /** Longer form for empty states and tooltips. */
    hint: string
    badgeClass: string
    dotClass: string
    stripeClass: string
}

export const ALARM_STATE_META: Record<AlarmState, AlarmStateMeta> = {
    OK: {
        label: "OK",
        hint: "The metric is inside its threshold.",
        badgeClass: "text-status-success bg-status-success-bg border-status-success/25",
        dotClass: "bg-status-success",
        stripeClass: "bg-status-success",
    },
    ALARM: {
        label: "In alarm",
        hint: "The metric is breaching its threshold.",
        badgeClass: "text-status-danger bg-status-danger-bg border-status-danger/25",
        dotClass: "bg-status-danger",
        stripeClass: "bg-status-danger",
    },
    INSUFFICIENT_DATA: {
        label: "Not reporting",
        hint: "No datapoints arrived in the evaluation window — the resource may be off, or nothing is pushing this metric yet.",
        badgeClass: "text-status-neutral bg-status-neutral-bg border-status-neutral/25",
        dotClass: "bg-status-neutral",
        stripeClass: "bg-status-neutral",
    },
}

export function alarmStateLabel(state: AlarmState): string {
    return ALARM_STATE_META[state].label
}

// The chips that render these live in ./components/StateChips.tsx — keeping this
// module free of JSX is what lets every page import it without losing fast
// refresh.

// ---------------------------------------------------------------------------
// Comparison operators
// ---------------------------------------------------------------------------

export const OPERATOR_SYMBOLS: Record<AlarmComparisonOperator, string> = {
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
}

/** Sentence form, for the plain-language condition builder. */
export const OPERATOR_PHRASES: Record<AlarmComparisonOperator, string> = {
    gt: "above",
    gte: "at or above",
    lt: "below",
    lte: "at or below",
}

export const OPERATOR_OPTIONS: readonly {
    value: AlarmComparisonOperator
    label: string
}[] = [
    { value: "gt", label: "above" },
    { value: "gte", label: "at or above" },
    { value: "lt", label: "below" },
    { value: "lte", label: "at or below" },
]

// ---------------------------------------------------------------------------
// Missing-data policy — plain language, because "treat missing data: missing"
// told nobody anything.
// ---------------------------------------------------------------------------

export const TREAT_MISSING_OPTIONS: readonly {
    value: TreatMissingData
    label: string
    hint: string
}[] = [
    {
        value: "missing",
        label: "Mark it as not reporting",
        hint: "Default. The gap is visible on this page, but Not reporting notifies nobody — pick 'Treat the gap as a breach' if you want to be told when a resource goes quiet.",
    },
    {
        value: "ignore",
        label: "Keep the current state",
        hint: "Gaps change nothing, and nobody is notified — useful for metrics that report irregularly.",
    },
    {
        value: "breaching",
        label: "Treat the gap as a breach",
        hint: "Silence is bad news: the alarm fires and your channels are notified. The only option that tells you a resource stopped reporting.",
    },
    {
        value: "not_breaching",
        label: "Treat the gap as healthy",
        hint: "Use when a metric only reports while something is wrong.",
    },
]

export const TREAT_MISSING_LABELS: Record<TreatMissingData, string> = {
    missing: "marked as not reporting",
    ignore: "ignored",
    breaching: "treated as a breach",
    not_breaching: "treated as healthy",
}

// ---------------------------------------------------------------------------
// Per-channel notification direction
// ---------------------------------------------------------------------------

/**
 * The three states a channel can be told about, each independent — the same shape
 * as CloudWatch's AlarmActions / OKActions / InsufficientDataActions. Pick any
 * combination per channel.
 */
export const TRANSITION_OPTIONS: readonly {
    value: AlarmTransition
    label: string
    hint: string
}[] = [
    { value: "ALARM", label: "Alarm", hint: "When it starts breaching." },
    { value: "OK", label: "Recovery", hint: "When it comes back inside the threshold." },
    {
        value: "INSUFFICIENT_DATA",
        label: "Stopped reporting",
        hint: "When datapoints stop arriving — a resource deleted, powered off, or an agent that died.",
    },
]

/** Short per-state word, for chips and summaries. */
export const TRANSITION_LABELS: Record<AlarmTransition, string> = {
    ALARM: "alarm",
    OK: "recovery",
    INSUFFICIENT_DATA: "stopped reporting",
}

/**
 * What a newly bound channel hears about. ALARM + OK is exactly what the old
 * single-valued "both" meant, so selecting a channel behaves as it always did
 * until someone opts into "stopped reporting".
 */
export const DEFAULT_TRANSITIONS: readonly AlarmTransition[] = ["ALARM", "OK"]

/** Canonical order, so two equal sets always render and serialize identically. */
export function orderTransitions(states: readonly AlarmTransition[]): AlarmTransition[] {
    return TRANSITION_OPTIONS.filter((option) => states.includes(option.value)).map(
        (option) => option.value
    )
}

/**
 * A binding's routing as one readable phrase: "alarm and recovery",
 * "stopped reporting only", "all three states".
 */
export function describeTransitions(states: readonly AlarmTransition[]): string {
    if (states.length === 0) return "nothing — this channel is never notified"
    const ordered = orderTransitions(states)
    if (ordered.length === TRANSITION_OPTIONS.length) return "all three states"
    const words = ordered.map((state) => TRANSITION_LABELS[state])
    if (words.length === 1) return `${words[0]} only`
    return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`
}

// ---------------------------------------------------------------------------
// Period options — the evaluator's standard cadence is 60s, and the metrics
// query rejects anything that is not a whole number of minutes.
// ---------------------------------------------------------------------------

export const PERIOD_OPTIONS: readonly { value: number; label: string }[] = [
    { value: 60, label: "1 minute" },
    { value: 300, label: "5 minutes" },
    { value: 900, label: "15 minutes" },
]

export function periodLabel(seconds: number): string {
    return PERIOD_OPTIONS.find((option) => option.value === seconds)?.label ?? `${String(seconds)}s`
}

// ---------------------------------------------------------------------------
// Chart ranges
// ---------------------------------------------------------------------------

export interface ChartRange {
    id: string
    label: string
    windowMs: number
}

export const CHART_RANGES: readonly ChartRange[] = [
    { id: "1h", label: "1h", windowMs: 60 * 60 * 1000 },
    { id: "3h", label: "3h", windowMs: 3 * 60 * 60 * 1000 },
    { id: "12h", label: "12h", windowMs: 12 * 60 * 60 * 1000 },
    { id: "24h", label: "24h", windowMs: 24 * 60 * 60 * 1000 },
]

export const DEFAULT_CHART_RANGE = CHART_RANGES[1]

// 6-digit hex literals only: MetricChart derives its glow as `${color}cc`, which
// is a valid CSS colour only for hex values.
export const SERIES_COLOR_OK = "#818cf8"
export const SERIES_COLOR_ALARM = "#ef4444"
export const THRESHOLD_COLOR = "#f59e0b"

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

const MINUTE_MS = 60_000

/** Compact "time since": just now, 12m ago, 3h ago, 2d ago. */
export function timeAgo(iso: string): string {
    const deltaMs = Date.now() - new Date(iso).getTime()
    if (Number.isNaN(deltaMs)) return "—"
    const minutes = Math.floor(deltaMs / MINUTE_MS)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${String(minutes)}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${String(hours)}h ago`
    return `${String(Math.floor(hours / 24))}d ago`
}

/** Bare duration without the "ago" suffix — for "in alarm for 18 minutes". */
export function durationSince(iso: string): string {
    const deltaMs = Date.now() - new Date(iso).getTime()
    if (Number.isNaN(deltaMs)) return "—"
    const minutes = Math.floor(deltaMs / MINUTE_MS)
    if (minutes < 1) return "less than a minute"
    if (minutes < 60) return `${String(minutes)} minute${minutes === 1 ? "" : "s"}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${String(hours)} hour${hours === 1 ? "" : "s"}`
    const days = Math.floor(hours / 24)
    return `${String(days)} day${days === 1 ? "" : "s"}`
}

export function formatDateTime(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export function formatDimensions(dimensions: Record<string, string>): string {
    const pairs = Object.entries(dimensions)
    if (pairs.length === 0) return "—"
    return pairs.map(([key, value]) => `${key}=${value}`).join(", ")
}

// ---------------------------------------------------------------------------
// Condition summaries — one implementation, three call sites.
// ---------------------------------------------------------------------------

/** Dense form for table cells: "avg > 80 · 3/5 × 60s". */
export function conditionSummary(alarm: Alarm): string {
    return [
        `${alarm.statistic} ${OPERATOR_SYMBOLS[alarm.comparison_operator]} ${String(alarm.threshold)}`,
        `${String(alarm.datapoints_to_alarm)}/${String(alarm.evaluation_periods)} × ${String(alarm.period_seconds)}s`,
    ].join(" · ")
}

export function thresholdText(alarm: Alarm): string {
    return `${OPERATOR_SYMBOLS[alarm.comparison_operator]} ${String(alarm.threshold)}`
}

/**
 * Full sentence for the detail header. Reads the way the condition step reads,
 * so what you configured and what you see afterwards match word for word.
 */
export function conditionSentence(alarm: Alarm, metricLabel?: string, unit?: string): string {
    const metric = metricLabel ?? alarm.metric_name
    const suffix = unit ? ` ${unit}` : ""
    return (
        `Alerts when the ${alarm.statistic} of ${metric} is ` +
        `${OPERATOR_PHRASES[alarm.comparison_operator]} ${String(alarm.threshold)}${suffix} ` +
        `for ${String(alarm.datapoints_to_alarm)} of the last ${String(alarm.evaluation_periods)} ` +
        `periods of ${periodLabel(alarm.period_seconds)}, with gaps ` +
        `${TREAT_MISSING_LABELS[alarm.treat_missing_data]}.`
    )
}
