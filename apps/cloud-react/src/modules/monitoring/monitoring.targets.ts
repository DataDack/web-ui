// Target-first alarm addressing.
//
// The backend addresses a metric series by (namespace, metric_name, dimensions).
// A person addresses it by "the 5xx rate on lb-prod-web". This module is the
// translation layer between the two, and it is the reason the create flow can
// ask "which resource?" as its first question.
//
// It is deliberately a client-side catalog for now. When the backend grows
// `GET /monitoring/metrics/catalog`, replace CATALOG's contents with the fetched
// payload — every consumer reads it through `metricsFor()` / `findMetric()`, so
// nothing else changes shape.

import { Braces, HardDrive, Network, Server, type LucideIcon } from "lucide-react"

import type {
    Alarm,
    AlarmComparisonOperator,
    AlarmStatistic,
    MetricDescriptor,
} from "./monitoring.types"

// Repeated literals hoisted so the catalog stays readable and lint-clean.
const AVG = "avg" satisfies AlarmStatistic
const MIN = "min" satisfies AlarmStatistic
const P95 = "p95" satisfies AlarmStatistic
const GT = "gt" satisfies AlarmComparisonOperator
const LT = "lt" satisfies AlarmComparisonOperator
const PCT = "%"
const MBPS = "MB/s"
const COUNT = "count"

export type AlarmTargetType = "loadbalancer" | "instance" | "disk" | "custom"

export interface TargetTypeMeta {
    type: AlarmTargetType
    label: string
    /** Plural, for the search placeholder and counts. */
    plural: string
    icon: LucideIcon
    /** What kind of question this target answers, in the user's words. */
    description: string
    /** Metric namespace every alarm on this target type is written under. */
    namespace: string
    /**
     * Dimension key carrying the resource id. `null` for custom metrics, where
     * the user supplies their own dimensions.
     */
    dimensionKey: string | null
}

export const TARGET_TYPES: readonly TargetTypeMeta[] = [
    {
        type: "loadbalancer",
        label: "Load balancer",
        plural: "load balancers",
        icon: Network,
        description: "Traffic, errors and target health",
        namespace: "lb/loadbalancer",
        dimensionKey: "lb_id",
    },
    {
        type: "instance",
        label: "Instance",
        plural: "instances",
        icon: Server,
        description: "CPU, memory, disk and network",
        namespace: "vm/instance",
        dimensionKey: "instance_id",
    },
    {
        type: "disk",
        label: "Disk",
        plural: "disks",
        icon: HardDrive,
        description: "Capacity and throughput",
        namespace: "disk/volume",
        dimensionKey: "disk_id",
    },
    {
        type: "custom",
        label: "Custom metric",
        plural: "custom metrics",
        icon: Braces,
        description: "Anything you push yourself",
        namespace: "",
        dimensionKey: null,
    },
]

export const TARGET_TYPE_META: Record<AlarmTargetType, TargetTypeMeta> = {
    loadbalancer: TARGET_TYPES[0],
    instance: TARGET_TYPES[1],
    disk: TARGET_TYPES[2],
    custom: TARGET_TYPES[3],
}

// ---------------------------------------------------------------------------
// Metric catalog
// ---------------------------------------------------------------------------

const CATALOG: Record<AlarmTargetType, readonly MetricDescriptor[]> = {
    loadbalancer: [
        {
            metric: "error_rate_5xx",
            label: "5xx error rate",
            unit: PCT,
            description: "Share of responses the backends answered with a 5xx.",
            statistic: AVG,
            operator: GT,
            threshold: 5,
        },
        {
            metric: "requests_per_sec",
            label: "Requests per second",
            unit: "req/s",
            description: "Request rate across every listener.",
            statistic: AVG,
            operator: GT,
            threshold: 1000,
        },
        {
            metric: "latency_p95_ms",
            label: "Latency p95",
            unit: "ms",
            description: "95th-percentile backend response time.",
            statistic: P95,
            operator: GT,
            threshold: 500,
        },
        {
            metric: "healthy_targets",
            label: "Healthy targets",
            unit: COUNT,
            description: "Targets currently passing their health check.",
            statistic: MIN,
            operator: LT,
            threshold: 1,
        },
        {
            metric: "status_up",
            label: "Reachable",
            unit: "",
            description: "1 while the load balancer answers, 0 when it does not.",
            statistic: MIN,
            operator: LT,
            threshold: 1,
        },
    ],
    instance: [
        {
            metric: "cpu_used_pct",
            label: "CPU used",
            unit: PCT,
            description: "Share of the instance's vCPU in use.",
            statistic: AVG,
            operator: GT,
            threshold: 80,
        },
        {
            metric: "ram_used_pct",
            label: "Memory used",
            unit: PCT,
            description: "Share of allocated memory in use.",
            statistic: AVG,
            operator: GT,
            threshold: 85,
        },
        {
            metric: "disk_used_pct",
            label: "Disk used",
            unit: PCT,
            description: "Share of the root volume in use.",
            statistic: AVG,
            operator: GT,
            threshold: 85,
        },
        {
            metric: "net_mbps",
            label: "Network throughput",
            unit: MBPS,
            description: "Combined inbound and outbound traffic.",
            statistic: AVG,
            operator: GT,
            threshold: 100,
        },
        {
            metric: "io_mbps",
            label: "Disk throughput",
            unit: MBPS,
            description: "Combined read and write throughput.",
            statistic: AVG,
            operator: GT,
            threshold: 100,
        },
        {
            metric: "status_up",
            label: "Running",
            unit: "",
            description: "1 while the instance is running, 0 when it is not.",
            statistic: MIN,
            operator: LT,
            threshold: 1,
        },
    ],
    disk: [
        {
            metric: "used_pct",
            label: "Capacity used",
            unit: PCT,
            description: "Share of the volume consumed.",
            statistic: AVG,
            operator: GT,
            threshold: 85,
        },
        {
            metric: "iops",
            label: "IOPS",
            unit: "IOPS",
            description: "Combined read and write operations per second.",
            statistic: AVG,
            operator: GT,
            threshold: 3000,
        },
        {
            metric: "throughput_mbps",
            label: "Throughput",
            unit: MBPS,
            description: "Combined read and write throughput.",
            statistic: AVG,
            operator: GT,
            threshold: 200,
        },
    ],
    custom: [],
}

export function metricsFor(type: AlarmTargetType): readonly MetricDescriptor[] {
    return CATALOG[type]
}

export function findMetric(
    type: AlarmTargetType,
    metric: string
): MetricDescriptor | undefined {
    return CATALOG[type].find((entry) => entry.metric === metric)
}

/** Falls back to a bare descriptor so custom metrics render the same way. */
export function describeMetric(type: AlarmTargetType, metric: string): MetricDescriptor {
    return (
        findMetric(type, metric) ?? {
            metric,
            label: metric,
            unit: "",
            description: "Custom metric.",
            statistic: AVG,
            operator: GT,
            threshold: 0,
        }
    )
}

// ---------------------------------------------------------------------------
// Address translation
// ---------------------------------------------------------------------------

export function namespaceFor(type: AlarmTargetType, customNamespace = ""): string {
    if (type === "custom") return customNamespace.trim()
    return TARGET_TYPE_META[type].namespace
}

export function dimensionsFor(
    type: AlarmTargetType,
    targetId: string,
    customDimensions: Record<string, string> = {}
): Record<string, string> {
    const key = TARGET_TYPE_META[type].dimensionKey
    if (key === null) return customDimensions
    return targetId ? { [key]: targetId } : {}
}

/**
 * Reverse lookup for pages that only have a saved alarm: which target type did
 * this namespace come from, and which resource id does it point at? Alarms
 * written before the namespace convention existed resolve to "custom", which is
 * exactly how they should render.
 */
export function resolveTarget(alarm: Alarm): {
    type: AlarmTargetType
    targetId: string
} {
    for (const meta of TARGET_TYPES) {
        if (meta.type === "custom" || meta.namespace !== alarm.metric_namespace) continue
        const key = meta.dimensionKey
        // Annotated as optional on purpose: the map is typed Record<string,string>
        // but a saved alarm may genuinely lack the dimension.
        const raw: string | undefined = key ? alarm.dimensions[key] : undefined
        return { type: meta.type, targetId: raw ?? "" }
    }
    return { type: "custom", targetId: "" }
}

/** Unit for a saved alarm's metric, resolved through its namespace. */
export function unitForAlarm(alarm: Alarm): string {
    const { type } = resolveTarget(alarm)
    return describeMetric(type, alarm.metric_name).unit
}

/** Human label for a saved alarm's metric, resolved through its namespace. */
export function metricLabelForAlarm(alarm: Alarm): string {
    const { type } = resolveTarget(alarm)
    return describeMetric(type, alarm.metric_name).label
}

/**
 * Suggested alarm name, matching the console's kebab-case resource naming:
 *   lb-prod-web-error-rate-5xx-high
 */
export function suggestAlarmName(
    resourceName: string,
    metric: string,
    operator: AlarmComparisonOperator
): string {
    const direction = operator === "lt" || operator === "lte" ? "low" : "high"
    // The first replace collapses every run of separators into exactly one "-",
    // so the edges can only ever hold a single "-" to trim.
    const slug = (value: string) =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-/, "")
            .replace(/-$/, "")
    const parts = [slug(resourceName), slug(metric), direction].filter(Boolean)
    return parts.join("-").slice(0, 120)
}
