import type { ClusterView, MetricSeries, Worker } from "@/lib/schemas"

/**
 * Findings derived from what is already on screen.
 *
 * This is the part a general-purpose dashboard cannot do. Grafana can draw every
 * one of these series better than we can; what it cannot do is know that a
 * latency chart and a fleet chart are the same incident, that three nodes on one
 * host is not redundancy, or that a function with one assignment has no second
 * copy to fail over to. Those are facts about THIS platform's topology, and the
 * platform is the only thing that holds them.
 *
 * The rules below are deliberately few and each states a number. A panel of
 * amber badges that do not say what they measured is noise an operator learns to
 * scroll past, and the first thing they scroll past is the one that mattered.
 */

export type InsightSeverity = "critical" | "warning" | "info"

export interface Insight {
  id: string
  severity: InsightSeverity
  /** What is true. States the measurement, not an adjective. */
  title: string
  /** Why it matters, and what it means for someone deciding whether to act. */
  detail: string
}

export interface InsightInput {
  series?: MetricSeries
  cluster?: ClusterView
  workers?: Worker[]
}

/** Above this, a node has no meaningful headroom left for a burst. */
const CPU_SATURATED = 85
/** Below this share of its memory free, a node cannot take another environment. */
const MEMORY_TIGHT_PERCENT = 10
/** An error rate a caller would notice. */
const ERROR_RATE_NOTICEABLE = 0.01
/** A latency change large enough not to be noise at these sample sizes. */
const LATENCY_REGRESSION_FACTOR = 1.5
/** Below this many invocations a percentile comparison is not worth making. */
const MIN_SAMPLES_FOR_TREND = 20

export function deriveInsights(input: InsightInput): Insight[] {
  const found: Insight[] = [
    ...trafficInsights(input.series),
    ...latencyTrend(input.series),
    ...fleetInsights(input.cluster),
    ...distributionInsights(input.cluster),
    ...redundancyInsights(input.cluster, input.workers),
  ]

  // Most severe first. An operator reads the top of a list and stops, so the
  // order is the difference between a finding being seen and being buried.
  const rank: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 }
  return found.sort((a, b) => rank[a.severity] - rank[b.severity])
}

function trafficInsights(series?: MetricSeries): Insight[] {
  if (!series) return []
  const { totals } = series
  const out: Insight[] = []

  if (totals.invocations > 0 && totals.errorRate >= ERROR_RATE_NOTICEABLE) {
    out.push({
      id: "error-rate",
      severity: totals.errorRate >= 0.05 ? "critical" : "warning",
      title: `${(totals.errorRate * 100).toFixed(1)}% of invocations failed`,
      detail: `${String(totals.errors)} of ${String(totals.invocations)} in this window. A function error and a platform failure both land here — the Errors column in the table below says which functions, and the logs say which kind.`,
    })
  }

  const throttled = series.buckets.reduce((sum, b) => sum + b.throttles, 0)
  if (throttled > 0) {
    out.push({
      id: "throttled",
      severity: "warning",
      title: `${String(throttled)} invocations were throttled`,
      detail:
        "A ceiling was hit, not a fault. These never ran, so they are absent from the latency numbers rather than slow in them — a p95 that looks healthy alongside throttling is measuring only the requests that got through.",
    })
  }

  if (totals.invocations > 0 && totals.coldStartRate >= 0.25) {
    out.push({
      id: "cold-starts",
      severity: totals.coldStartRate >= 0.5 ? "warning" : "info",
      title: `${(totals.coldStartRate * 100).toFixed(0)}% of invocations were cold starts`,
      detail:
        "Each one paid for a runtime to start before any of your code ran, so it is latency the function cannot be blamed for. Sustained cold starts mean environments are being reaped faster than traffic reuses them, or capacity is churning.",
    })
  }

  return out
}

/**
 * Latency compared against the first half of its own window.
 *
 * A percentile alone says nothing about whether anything changed — 400 ms is
 * fine for one function and an outage for another. The window's own earlier half
 * is the only baseline available here, and it is a fair one for the question
 * being asked: "is this worse than it was a few minutes ago".
 */
function latencyTrend(series?: MetricSeries): Insight[] {
  if (!series || series.buckets.length < 4) return []

  const midpoint = Math.floor(series.buckets.length / 2)
  const earlier = series.buckets.slice(0, midpoint)
  const later = series.buckets.slice(midpoint)

  const samples = (part: typeof earlier) => part.reduce((sum, b) => sum + b.invocations, 0)
  if (samples(earlier) < MIN_SAMPLES_FOR_TREND || samples(later) < MIN_SAMPLES_FOR_TREND) {
    return []
  }

  // Weighted by invocations: an idle bucket with one slow request must not
  // count as much as a busy one, or the comparison measures quiet periods.
  const weightedP95 = (part: typeof earlier) => {
    const total = samples(part)
    if (total === 0) return 0
    return part.reduce((sum, b) => sum + b.p95DurationMs * b.invocations, 0) / total
  }

  const before = weightedP95(earlier)
  const after = weightedP95(later)
  if (before <= 0 || after < before * LATENCY_REGRESSION_FACTOR) return []

  return [
    {
      id: "latency-regression",
      severity: after >= before * 3 ? "critical" : "warning",
      title: `p95 rose ${(after / before).toFixed(1)}× within this window`,
      detail: `${before.toFixed(0)} ms in the first half, ${after.toFixed(0)} ms in the second. Check the cold-start and throttle chart first: both raise latency without the function itself having changed.`,
    },
  ]
}

function fleetInsights(cluster?: ClusterView): Insight[] {
  if (!cluster) return []
  const out: Insight[] = []

  if (cluster.reportingNodes === 0) {
    return [
      {
        id: "no-nodes",
        severity: "critical",
        title: "No nodes are reporting",
        detail:
          "Nothing has arrived inside the window. Either the fleet is down or it cannot reach the control plane — and from here those look identical, so check a node directly before assuming which.",
      },
    ]
  }

  if (cluster.cpuPercent >= CPU_SATURATED) {
    out.push({
      id: "cluster-cpu",
      severity: "warning",
      title: `Cluster CPU at ${cluster.cpuPercent.toFixed(0)}%`,
      detail:
        "Averaged across reporting machines, so an individual node may be worse. At this level a traffic burst queues rather than scaling, and cold starts get slower because there is no spare core to start a runtime on.",
    })
  }

  if (cluster.totalMemoryMb > 0) {
    const freePercent = (cluster.freeMemoryMb / cluster.totalMemoryMb) * 100
    if (freePercent <= MEMORY_TIGHT_PERCENT) {
      out.push({
        id: "cluster-memory",
        severity: "critical",
        title: `Only ${freePercent.toFixed(0)}% of fleet memory is available`,
        detail:
          "A new execution environment reserves memory before it runs. Below this there is nowhere to place one, so the next deploy or scale-up fails placement rather than running slowly.",
      })
    }
  }

  if (cluster.diskTotalMb > 0) {
    const freePercent = (cluster.diskFreeMb / cluster.diskTotalMb) * 100
    if (freePercent <= MEMORY_TIGHT_PERCENT) {
      out.push({
        id: "cluster-disk",
        severity: "warning",
        title: `Only ${freePercent.toFixed(0)}% of fleet disk is free`,
        detail:
          "Deployment packages are unpacked to disk before a function can start. A full node fails every cold start on it while continuing to serve whatever is already warm, which makes it look intermittent.",
      })
    }
  }

  return out
}

/**
 * How work is spread, and who is refusing it.
 *
 * The two questions a load-balanced fleet has to be able to answer, and the two
 * a cluster total cannot: a fleet balancing evenly and a fleet sending
 * everything to one node have the same throughput, and a node refusing every
 * request contributes zero to a total that still looks healthy.
 */
function distributionInsights(cluster?: ClusterView): Insight[] {
  const nodes = (cluster?.nodes ?? []).filter((n) => n.role !== "gateway")
  if (nodes.length < 2) return []
  const out: Insight[] = []

  const refusing = nodes.filter((n) => n.rejectedPerSec > 0 && n.servedPerSec === 0)
  if (refusing.length > 0) {
    out.push({
      id: "node-refusing-everything",
      severity: "critical",
      title: `${String(refusing.length)} of ${String(nodes.length)} workers are refusing every request they receive`,
      detail: `${refusing.map((n) => n.hostname || n.nodeId).join(", ")} — serving nothing while still being sent work. The rejection reason on the node's card says whether that is a credential the control plane no longer matches, an address that resolves to more than one machine, or capacity.`,
    })
  }

  const served = nodes.map((n) => n.servedPerSec)
  const total = served.reduce((sum, rate) => sum + rate, 0)
  if (total > 1) {
    const busiest = Math.max(...served)
    // Two-thirds of the traffic on one node out of three or more is a
    // distribution problem, not variance.
    if (nodes.length >= 3 && busiest / total >= 0.66) {
      out.push({
        id: "uneven-distribution",
        severity: "warning",
        title: `One worker is taking ${((busiest / total) * 100).toFixed(0)}% of the traffic`,
        detail:
          "Across workers that should be sharing it. Either placement put the busy function on one node, or the address the control plane holds for several nodes resolves to the same one.",
      })
    }
  }

  const queued = nodes.filter((n) => n.meanWaitMs >= 50)
  if (queued.length > 0) {
    out.push({
      id: "queueing",
      severity: queued.some((n) => n.meanWaitMs >= 250) ? "warning" : "info",
      title: `Invocations are queueing on ${String(queued.length)} of ${String(nodes.length)} workers`,
      detail: `Up to ${Math.max(...queued.map((n) => n.meanWaitMs)).toFixed(0)} ms spent waiting for an execution environment before any function code ran. This is latency the function cannot be blamed for: it is concurrency, not slowness.`,
    })
  }

  return out
}

/**
 * Redundancy, which is the finding a metrics tool cannot make.
 *
 * It needs the topology: how many machines are behind the nodes, and how many
 * copies of a workload exist. Both are facts this platform holds and no
 * dashboard fed by a metrics endpoint can see.
 */
function redundancyInsights(cluster?: ClusterView, workers?: Worker[]): Insight[] {
  const out: Insight[] = []

  if (cluster && cluster.reportingNodes > 1 && cluster.hosts === 1) {
    out.push({
      id: "single-host",
      severity: "warning",
      title: `${String(cluster.reportingNodes)} nodes, all on one machine`,
      detail:
        "They share that machine's cores, memory and failure. The node count reads as redundancy and is not: losing the host loses all of them at once, and their combined headroom is one machine's, not several.",
    })
  }

  if (workers && workers.length > 0) {
    const live = workers.filter((w) => ["ready", "active"].includes(w.state.toLowerCase()))
    const silent = workers.length - live.length
    if (silent > 0) {
      out.push({
        id: "registered-not-live",
        severity: silent >= workers.length ? "critical" : "info",
        title: `${String(silent)} of ${String(workers.length)} registered workers are not ready`,
        detail:
          "A registered worker that is not reporting still occupies a row and no capacity. The gap between registered and reporting is the number worth watching — it grows when workers restart without keeping their identity.",
      })
    }
  }

  return out
}
