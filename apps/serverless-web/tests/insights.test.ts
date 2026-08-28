import { describe, expect, test } from "bun:test"

import { deriveInsights } from "../src/features/observability/insights"
import type { ClusterView, MetricSeries, Worker } from "../src/lib/schemas"

/** A window of identical buckets, so a test can change one thing at a time. */
function series(overrides: Partial<MetricSeries> = {}, bucket: Partial<MetricSeries["buckets"][number]> = {}): MetricSeries {
  const base = {
    timestamp: "2026-08-28T12:00:00Z",
    invocations: 100,
    errors: 0,
    throttles: 0,
    coldStarts: 0,
    avgDurationMs: 50,
    p50DurationMs: 40,
    p95DurationMs: 100,
    p99DurationMs: 150,
    maxDurationMs: 200,
    gbSeconds: 1,
    samples: 100,
    avgCpuSeconds: 0.1,
    avgMemoryMb: 64,
    peakMemoryMb: 80,
    avgInflight: 1,
    ...bucket,
  }
  return {
    since: "-1h",
    until: "now",
    stepSeconds: 60,
    buckets: [base, base, base, base],
    totals: {
      invocations: 400,
      errors: 0,
      errorRate: 0,
      coldStarts: 0,
      coldStartRate: 0,
      avgDurationMs: 50,
      p50DurationMs: 40,
      p95DurationMs: 100,
      p99DurationMs: 150,
      maxDurationMs: 200,
      gbSeconds: 4,
    },
    topFunctions: [],
    ...overrides,
  } as MetricSeries
}

function cluster(overrides: Partial<ClusterView> = {}): ClusterView {
  return {
    at: "2026-08-28T12:00:00Z",
    window: "15m0s",
    reportingNodes: 2,
    reportingWorkers: 2,
    reportingGateways: 0,
    hosts: 2,
    totalMemoryMb: 8000,
    freeMemoryMb: 6000,
    allocMemoryMb: 1000,
    sandboxCount: 2,
    cpuCount: 8,
    cpuPercent: 20,
    loadAverage1: 1,
    netRxBytesPerSec: 0,
    netTxBytesPerSec: 0,
    diskTotalMb: 100000,
    diskFreeMb: 80000,
    nodes: [],
    persisted: false,
    ...overrides,
  } as ClusterView
}

const ids = (input: Parameters<typeof deriveInsights>[0]) => deriveInsights(input).map((i) => i.id)

describe("a healthy platform says nothing", () => {
  test("no findings when nothing is wrong", () => {
    // The most important case. A panel that always has something in it is a
    // panel nobody reads, and the finding that mattered is the one they scroll
    // past.
    expect(deriveInsights({ series: series(), cluster: cluster(), workers: [] })).toEqual([])
  })
})

describe("traffic", () => {
  test("an error rate a caller would notice is reported with its counts", () => {
    const [finding] = deriveInsights({
      series: series({ totals: { ...series().totals, errors: 40, errorRate: 0.1 } }),
    })
    expect(finding?.id).toBe("error-rate")
    expect(finding?.severity).toBe("critical")
    // The number has to be in the title: a severity badge alone tells an
    // operator to worry without telling them how much.
    expect(finding?.title).toContain("10.0%")
  })

  test("throttling is called out separately from failure", () => {
    // These never ran. Folding them into the error rate would blame the
    // function for a ceiling the platform applied.
    expect(ids({ series: series({}, { throttles: 5 }) })).toContain("throttled")
  })

  test("cold starts are only worth mentioning when they are a real share", () => {
    expect(ids({ series: series({ totals: { ...series().totals, coldStartRate: 0.05 } }) })).not.toContain("cold-starts")
    expect(ids({ series: series({ totals: { ...series().totals, coldStartRate: 0.6 } }) })).toContain("cold-starts")
  })
})

describe("latency trend", () => {
  test("a regression is measured against the window's own earlier half", () => {
    const slow = series()
    slow.buckets = [
      { ...slow.buckets[0]!, p95DurationMs: 100 },
      { ...slow.buckets[0]!, p95DurationMs: 100 },
      { ...slow.buckets[0]!, p95DurationMs: 400 },
      { ...slow.buckets[0]!, p95DurationMs: 400 },
    ]
    const [finding] = deriveInsights({ series: slow }).filter((i) => i.id === "latency-regression")
    expect(finding?.title).toContain("4.0×")
  })

  test("a quiet window is not compared", () => {
    // One slow request in an idle period is not a regression, and reporting it
    // as one teaches an operator to distrust the panel.
    const quiet = series()
    quiet.buckets = quiet.buckets.map((b, i) => ({
      ...b,
      invocations: 2,
      p95DurationMs: i < 2 ? 100 : 900,
    }))
    expect(ids({ series: quiet })).not.toContain("latency-regression")
  })

  test("a busy bucket outweighs an idle one", () => {
    // Unweighted, one idle-but-slow bucket would drag the average and report a
    // regression that most requests never saw.
    const skewed = series()
    skewed.buckets = [
      { ...skewed.buckets[0]!, invocations: 1000, p95DurationMs: 100 },
      { ...skewed.buckets[0]!, invocations: 1000, p95DurationMs: 100 },
      { ...skewed.buckets[0]!, invocations: 1000, p95DurationMs: 100 },
      { ...skewed.buckets[0]!, invocations: 20, p95DurationMs: 900 },
    ]
    expect(ids({ series: skewed })).not.toContain("latency-regression")
  })
})

describe("topology, which a metrics tool cannot see", () => {
  test("nodes on one machine are not redundancy", () => {
    const [finding] = deriveInsights({ cluster: cluster({ reportingNodes: 3, hosts: 1 }) })
    expect(finding?.id).toBe("single-host")
    expect(finding?.detail).toContain("loses all of them at once")
  })

  test("nodes spread across machines are not flagged", () => {
    expect(ids({ cluster: cluster({ reportingNodes: 3, hosts: 3 }) })).not.toContain("single-host")
  })

  test("a silent fleet is critical, one silent worker is not", () => {
    const worker = (state: string): Worker =>
      ({ id: state, region: "r", hostname: state, state }) as Worker

    const some = deriveInsights({ workers: [worker("ready"), worker("lost")] })
    expect(some[0]?.severity).toBe("info")

    const all = deriveInsights({ workers: [worker("lost"), worker("lost")] })
    expect(all[0]?.severity).toBe("critical")
  })
})

describe("ordering", () => {
  test("the most severe finding is first", () => {
    // An operator reads the top of a list and stops.
    const findings = deriveInsights({
      series: series({ totals: { ...series().totals, errors: 40, errorRate: 0.1 } }, { throttles: 5 }),
      cluster: cluster({ reportingNodes: 3, hosts: 1 }),
    })
    expect(findings[0]?.severity).toBe("critical")
    expect(findings.at(-1)?.severity).not.toBe("critical")
  })
})

describe("distribution, which is the reason a fleet has more than one node", () => {
  const node = (over: Partial<ClusterView["nodes"][number]>): ClusterView["nodes"][number] =>
    ({
      nodeId: "n",
      hostname: "n",
      role: "worker",
      state: "ready",
      servedPerSec: 0,
      rejectedPerSec: 0,
      meanWaitMs: 0,
      ...over,
    }) as ClusterView["nodes"][number]

  test("a worker refusing everything it is sent is critical", () => {
    // The outage shape: a node serving nothing while still being sent work
    // contributes zero to a cluster total that still looks healthy.
    const findings = deriveInsights({
      cluster: cluster({
        nodes: [
          node({ nodeId: "good", hostname: "good", servedPerSec: 10 }),
          node({ nodeId: "bad", hostname: "bad", rejectedPerSec: 9 }),
        ],
      }),
    })
    const found = findings.find((i) => i.id === "node-refusing-everything")
    expect(found?.severity).toBe("critical")
    expect(found?.title).toContain("1 of 2")
    // It has to name the node, or the operator still has to go looking.
    expect(found?.detail).toContain("bad")
  })

  test("one node taking most of the traffic is a distribution problem", () => {
    const findings = deriveInsights({
      cluster: cluster({
        nodes: [
          node({ nodeId: "a", servedPerSec: 90 }),
          node({ nodeId: "b", servedPerSec: 5 }),
          node({ nodeId: "c", servedPerSec: 5 }),
        ],
      }),
    })
    expect(findings.map((i) => i.id)).toContain("uneven-distribution")
  })

  test("an evenly balanced fleet is not flagged", () => {
    const findings = deriveInsights({
      cluster: cluster({
        nodes: [
          node({ nodeId: "a", servedPerSec: 30 }),
          node({ nodeId: "b", servedPerSec: 34 }),
          node({ nodeId: "c", servedPerSec: 31 }),
        ],
      }),
    })
    expect(findings.map((i) => i.id)).not.toContain("uneven-distribution")
  })

  test("queueing is reported as concurrency, not slowness", () => {
    const findings = deriveInsights({
      cluster: cluster({
        nodes: [
          node({ nodeId: "a", servedPerSec: 5, meanWaitMs: 400 }),
          node({ nodeId: "b", servedPerSec: 5 }),
        ],
      }),
    })
    const found = findings.find((i) => i.id === "queueing")
    expect(found?.detail).toContain("concurrency, not slowness")
  })

  test("a single-node fleet has no distribution to judge", () => {
    const findings = deriveInsights({
      cluster: cluster({ nodes: [node({ servedPerSec: 0, rejectedPerSec: 5 })] }),
    })
    expect(findings.map((i) => i.id)).not.toContain("node-refusing-everything")
  })
})
