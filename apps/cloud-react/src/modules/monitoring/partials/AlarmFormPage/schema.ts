// The whole alarm form in one schema.
//
// The old create page validated a metric identity (namespace + metric name +
// free-text dimensions). This one validates what the user actually answers —
// which resource, which signal, which rule, who gets told — and translates that
// into the backend's (namespace, metric, dimensions) address on submit.
//
// Everything here is pure: the page, the summary rail and the readiness
// checklist all read the same functions, so what the checklist ticks and what
// the submit button allows can never drift apart.

import { z } from "zod/v4"

import {
  dimensionsFor,
  namespaceFor,
  resolveTarget,
  type AlarmTargetType,
} from "../../monitoring.targets"
import type { Alarm, CreateAlarmRequest } from "../../monitoring.types"

// ---------------------------------------------------------------------------
// Enumerations — mirrored from the backend DTOs, kept as const tuples so zod
// and TypeScript agree on the literal unions.
// ---------------------------------------------------------------------------

export const TARGET_TYPE_VALUES = ["loadbalancer", "instance", "disk", "custom"] as const

const STATISTIC_VALUES = ["avg", "sum", "min", "max", "p95", "p99"] as const
const OPERATOR_VALUES = ["gt", "gte", "lt", "lte"] as const
const TREAT_MISSING_VALUES = ["missing", "ignore", "breaching", "not_breaching"] as const
const SEVERITY_VALUES = ["info", "warning", "critical"] as const
const TRANSITION_VALUES = ["ALARM", "OK", "INSUFFICIENT_DATA"] as const

/** The three cadences the evaluator and the metrics query both accept. */
export const PERIOD_VALUES = [60, 300, 900] as const

export type PeriodSeconds = (typeof PERIOD_VALUES)[number]

const CUSTOM: AlarmTargetType = "custom"

// ---------------------------------------------------------------------------
// Dimensions — free-form "key=value" pairs, comma or newline separated.
// Salvaged verbatim from the old page: it is the only part of the metric-identity
// UI that survives, and only for custom metrics.
// ---------------------------------------------------------------------------

export function parseDimensions(text: string): Record<string, string> | null {
  const dims: Record<string, string> = {}
  for (const raw of text.split(/[\n,]/)) {
    const pair = raw.trim()
    if (!pair) continue
    const eq = pair.indexOf("=")
    if (eq <= 0 || eq === pair.length - 1) return null
    dims[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
  }
  return dims
}

/** Inverse of {@link parseDimensions} — for seeding the edit form. */
export function formatDimensionPairs(dimensions: Record<string, string>): string {
  return Object.entries(dimensions)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ")
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const NUMBER_MESSAGE = "Enter a number"
const WHOLE_NUMBER_MESSAGE = "Must be a whole number"

export const alarmFormSchema = z
  .object({
    // 1 — what to watch
    targetType: z.enum(TARGET_TYPE_VALUES),
    targetIds: z.array(z.string()),
    customNamespace: z.string(),
    customDimensions: z.string(),
    // 2 — signal
    metric: z.string().min(1, "Choose a signal to watch"),
    // 3 — condition
    statistic: z.enum(STATISTIC_VALUES),
    periodSeconds: z.union([z.literal(60), z.literal(300), z.literal(900)]),
    operator: z.enum(OPERATOR_VALUES),
    threshold: z.coerce.number<number>({ message: "Enter a numeric threshold" }),
    datapointsToAlarm: z.coerce
      .number<number>({ message: NUMBER_MESSAGE })
      .int(WHOLE_NUMBER_MESSAGE)
      .min(1, "At least 1 period must breach"),
    evaluationPeriods: z.coerce
      .number<number>({ message: NUMBER_MESSAGE })
      .int(WHOLE_NUMBER_MESSAGE)
      .min(1, "At least 1 period")
      .max(24, "At most 24 periods"),
    treatMissingData: z.enum(TREAT_MISSING_VALUES),
    // 4 — notifications
    severity: z.enum(SEVERITY_VALUES),
    // Each bound channel carries its own SET of states to be told about —
    // CloudWatch's three independent action lists. A selected channel with an
    // empty set would be a channel that is never notified, so the form keeps
    // at least one state ticked.
    channels: z.array(
      z.object({
        channel_id: z.string(),
        on_transitions: z.array(z.enum(TRANSITION_VALUES)).min(1),
      }),
    ),
    // 5 — name
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(120, "Maximum 120 characters"),
    description: z.string().max(500, "Maximum 500 characters"),
  })
  .refine((values) => values.datapointsToAlarm <= values.evaluationPeriods, {
    message: "Cannot need more breaching periods than the window holds",
    path: ["datapointsToAlarm"],
  })
  .superRefine((values, ctx) => {
    if (values.targetType === CUSTOM) {
      if (!values.customNamespace.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["customNamespace"],
          message: "Namespace is required for a custom metric",
        })
      }
      if (parseDimensions(values.customDimensions) === null) {
        ctx.addIssue({
          code: "custom",
          path: ["customDimensions"],
          message: "Use key=value pairs, separated by commas",
        })
      }
      return
    }
    if (values.targetIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["targetIds"],
        message: "Pick at least one resource to watch",
      })
    }
  })

export type FormValues = z.infer<typeof alarmFormSchema>

export type ChannelBinding = FormValues["channels"][number]

export const DEFAULT_VALUES: FormValues = {
  targetType: "loadbalancer",
  targetIds: [],
  customNamespace: "",
  customDimensions: "",
  metric: "",
  statistic: "avg",
  periodSeconds: 60,
  operator: "gt",
  threshold: 80,
  datapointsToAlarm: 3,
  evaluationPeriods: 5,
  treatMissingData: "missing",
  severity: "warning",
  channels: [],
  name: "",
  description: "",
}

// ---------------------------------------------------------------------------
// Numeric reading — react-hook-form hands number inputs back as strings while
// the user types (zod coerces only on submit), so every consumer that shows a
// live number reads it through here instead of trusting the static type.
// ---------------------------------------------------------------------------

export function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

// ---------------------------------------------------------------------------
// Payload building
// ---------------------------------------------------------------------------

const MAX_NAME = 120

/** Kebab-case slug. Split-and-join rather than a greedy regex: no backtracking. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]/)
    .filter(Boolean)
    .join("-")
}

/** Record lookups are typed as total, so misses are resolved explicitly. */
function resourceName(targetNames: Record<string, string>, targetId: string): string {
  if (Object.hasOwn(targetNames, targetId)) return targetNames[targetId]
  return targetId.slice(0, 8)
}

/**
 * With several resources selected the user gets one alarm each, so each name is
 * suffixed with the resource it watches — otherwise the list shows five rows
 * called the same thing and nobody can tell which is which.
 */
function alarmNameFor(
  base: string,
  targetId: string,
  targetNames: Record<string, string>,
  multi: boolean,
): string {
  if (!multi) return base.slice(0, MAX_NAME)
  const suffix = slugify(resourceName(targetNames, targetId))
  if (!suffix) return base.slice(0, MAX_NAME)
  const room = Math.max(3, MAX_NAME - suffix.length - 1)
  return `${base.slice(0, room)}-${suffix}`
}

/**
 * One payload per selected resource. The backend has no notion of a multi-target
 * alarm, so the fan-out happens here and the page reports each result honestly.
 */
export function buildPayloads(
  values: FormValues,
  targetNames: Record<string, string>,
): CreateAlarmRequest[] {
  const customDimensions = parseDimensions(values.customDimensions) ?? {}
  const base = {
    description: values.description.trim(),
    metric_namespace: namespaceFor(values.targetType, values.customNamespace),
    metric_name: values.metric.trim(),
    statistic: values.statistic,
    period_seconds: values.periodSeconds,
    evaluation_periods: values.evaluationPeriods,
    datapoints_to_alarm: values.datapointsToAlarm,
    comparison_operator: values.operator,
    threshold: values.threshold,
    treat_missing_data: values.treatMissingData,
    severity: values.severity,
    channels: values.channels.map((binding) => ({
      channel_id: binding.channel_id,
      on_transitions: binding.on_transitions,
    })),
  }
  // A custom metric addresses itself through its own dimensions, so it fans
  // out to exactly one alarm.
  const ids = values.targetType === CUSTOM ? [""] : values.targetIds
  const multi = ids.length > 1
  const trimmedName = values.name.trim()
  return ids.map((targetId) => ({
    ...base,
    name: alarmNameFor(trimmedName, targetId, targetNames, multi),
    dimensions: dimensionsFor(values.targetType, targetId, customDimensions),
  }))
}

/** Closest offered cadence — the form only exposes 1/5/15 minutes. */
function nearestPeriod(seconds: number): PeriodSeconds {
  return PERIOD_VALUES.reduce((best, candidate) =>
    Math.abs(candidate - seconds) < Math.abs(best - seconds) ? candidate : best,
  )
}

/** Seeds the edit route from a saved alarm, reversing the address translation. */
export function alarmToFormValues(alarm: Alarm): FormValues {
  const { type, targetId } = resolveTarget(alarm)
  const isCustom = type === CUSTOM
  return {
    targetType: type,
    targetIds: targetId ? [targetId] : [],
    customNamespace: isCustom ? alarm.metric_namespace : "",
    customDimensions: isCustom ? formatDimensionPairs(alarm.dimensions) : "",
    metric: alarm.metric_name,
    statistic: alarm.statistic,
    periodSeconds: nearestPeriod(alarm.period_seconds),
    operator: alarm.comparison_operator,
    threshold: alarm.threshold,
    datapointsToAlarm: alarm.datapoints_to_alarm,
    evaluationPeriods: alarm.evaluation_periods,
    treatMissingData: alarm.treat_missing_data,
    severity: alarm.severity,
    channels: alarm.channels.map((binding) => ({
      channel_id: binding.channel_id,
      on_transitions: binding.on_transitions,
    })),
    name: alarm.name,
    description: alarm.description,
  }
}

// ---------------------------------------------------------------------------
// Readiness — the "am I done?" affordance a stepper would have given, without
// sequencing anybody. One row per section, in page order.
// ---------------------------------------------------------------------------

export const SECTION_IDS = {
  target: "target",
  signal: "signal",
  condition: "condition",
  notify: "notify",
  name: "name",
} as const

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS]

export interface ReadinessRow {
  id: SectionId
  label: string
  ok: boolean
  hint: string
}

/** True once the form addresses a real series — a resource, or a namespace. */
export function isTargetReady(values: FormValues): boolean {
  if (values.targetType === CUSTOM) {
    return (
      values.customNamespace.trim().length > 0 && parseDimensions(values.customDimensions) !== null
    )
  }
  return values.targetIds.length > 0
}

function isConditionReady(values: FormValues): boolean {
  const threshold = numeric(values.threshold)
  const needed = numeric(values.datapointsToAlarm)
  const window = numeric(values.evaluationPeriods)
  if (threshold === null || needed === null || window === null) return false
  if (!Number.isInteger(needed) || !Number.isInteger(window)) return false
  return needed >= 1 && window >= 1 && window <= 24 && needed <= window
}

function targetHint(values: FormValues): string {
  if (values.targetType !== CUSTOM) return "Pick at least one resource"
  if (!values.customNamespace.trim()) return "Name the namespace you push under"
  return "Dimensions must be key=value pairs"
}

export function readiness(values: FormValues): ReadinessRow[] {
  return [
    {
      id: SECTION_IDS.target,
      label: "What to watch",
      ok: isTargetReady(values),
      hint: targetHint(values),
    },
    {
      id: SECTION_IDS.signal,
      label: "Signal",
      ok: values.metric.trim().length > 0,
      hint: "Choose a signal",
    },
    {
      id: SECTION_IDS.condition,
      label: "Condition",
      ok: isConditionReady(values),
      hint: "Set a threshold and how many periods must breach",
    },
    {
      id: SECTION_IDS.notify,
      label: "Notifications",
      ok: values.channels.length > 0,
      hint: "No channels — it will track state, but nobody is told",
    },
    {
      id: SECTION_IDS.name,
      label: "Name",
      ok: values.name.trim().length >= 3,
      hint: "Name it (3 characters or more)",
    },
  ]
}

/**
 * Why the submit button is disabled, or null when it is not. Notifications are
 * deliberately not blocking: an alarm with no channels still tracks state, and
 * the checklist says so rather than refusing to save.
 */
export function submitBlocker(values: FormValues): string | null {
  const blocking = readiness(values).filter((row) => row.id !== SECTION_IDS.notify)
  return blocking.find((row) => !row.ok)?.hint ?? null
}
