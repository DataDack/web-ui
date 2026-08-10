import { useMemo, useState } from "react"

import { Activity, RefreshCw } from "lucide-react"

import {
  css,
  cx,
  fontMono,
  formatTick,
  media,
  mix,
  type ChartPoint,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import type { FunctionDetailLabels } from "./labels"
import { MetricCard } from "./MetricCard"
import { MetricComingSoonCard } from "./MetricComingSoonCard"
import { useFunctionMetrics } from "../../data/queries"
import { useServerlessContext } from "../../data/transport"
import type { FunctionEntity, MetricBucket } from "../../data/types"

const toolbar = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

const toolbarIcon = css`
  width: 13px;
  height: 13px;
  color: var(--muted-foreground);
`

const rangeChip = css`
  border-radius: 0.375rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 3px 9px;
  font-family: ${fontMono};
  font-size: 10px;
  color: var(--muted-foreground);
  background: none;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;

  &:hover {
    color: var(--foreground);
  }
`

const rangeChipActive = css`
  border-color: ${mix("--brand-gold", 60)};
  background: ${mix("--brand-gold", 10)};
  color: var(--brand-gold);
`

const refreshButton = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: none;
  padding: 2px 4px;
  font-family: ${fontMono};
  font-size: 10px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const spinning = css`
  animation: metric-refresh-spin 900ms linear infinite;

  @keyframes metric-refresh-spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const blurb = css`
  margin: 10px 0 14px;
  font-size: 13px;
  color: var(--muted-foreground);
`

const notice = css`
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--status-warning, var(--muted-foreground));
`

const failure = css`
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--destructive);
`

const grid = css`
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr);

  ${media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${media.lg} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

/**
 * The windows the range chips select.
 *
 * `since` is a negative Go duration because the control plane accepts one — a
 * poll then never has to recompute a timestamp, and the query key stays stable
 * across refetches instead of changing every second. Days are spelled in hours
 * for the same reason: Go's ParseDuration has no "d" unit. Each step keeps the
 * bucket count between roughly 25 and 60, well under the server's 500 cap.
 */
const RANGES = [
  { label: "1h", since: "-1h", step: "1m" },
  { label: "3h", since: "-3h", step: "5m" },
  { label: "12h", since: "-12h", step: "15m" },
  { label: "1d", since: "-24h", step: "30m" },
  { label: "3d", since: "-72h", step: "1h" },
  { label: "1w", since: "-168h", step: "6h" },
] as const

/**
 * The palette both grids draw from, confined to the tokens the theme actually
 * defines: --chart-1..3, --destructive and --status-success (never --chart-4/5).
 */
const COLOR = {
  one: "var(--chart-1)",
  two: "var(--chart-2)",
  three: "var(--chart-3)",
  danger: "var(--destructive)",
  success: "var(--status-success)",
  /** The error half of a stacked bar, where the theme has a chart-specific red. */
  failed: "var(--chart-error, var(--destructive))",
} as const

/**
 * The metrics nothing measures yet, in Lambda's order, with the same
 * deterministic mock shapes they have always had. They stay in the grid rather
 * than disappearing: the tab is also the roadmap for what per-function
 * telemetry will cover.
 *
 * Everything else on this tab is real. Recursion detection and the async-queue
 * metrics need the control plane to emit counters it does not have — the async
 * job records exist, but nothing aggregates event age or delivery failure into
 * the series.
 */
function comingSoonCards(labels: FunctionDetailLabels): {
  key: string
  title: string
  unit: string
  series: { label: string; color: string; points: readonly number[] }[]
}[] {
  const metrics = labels.monitor.metrics
  return [
    {
      key: "recursive",
      ...metrics.recursive,
      series: [{ label: "Detected", color: COLOR.three, points: [0, 0, 1, 0, 0, 0, 0, 1] }],
    },
    {
      key: "asyncEventAge",
      ...metrics.asyncEventAge,
      series: [{ label: "Age", color: COLOR.two, points: [4, 6, 5, 9, 7, 8, 6, 10] }],
    },
    {
      key: "asyncEvents",
      ...metrics.asyncEvents,
      series: [{ label: "Received", color: COLOR.one, points: [5, 9, 7, 12, 10, 14, 11, 16] }],
    },
    {
      key: "asyncFailures",
      ...metrics.asyncFailures,
      series: [{ label: "Failures", color: COLOR.danger, points: [0, 0, 1, 0, 0, 0, 1, 0] }],
    },
    {
      key: "iteratorAge",
      ...metrics.iteratorAge,
      series: [{ label: "Age", color: COLOR.three, points: [6, 5, 8, 7, 10, 8, 9, 7] }],
    },
  ]
}

/** Buckets → chart points, reading the fields each card plots. */
function pointsFrom(
  buckets: MetricBucket[],
  values: (bucket: MetricBucket) => number[],
): ChartPoint[] {
  return buckets.map((bucket) => ({ timestamp: bucket.timestamp, values: values(bucket) }))
}

export interface MonitorTabProps {
  fn: FunctionEntity
  labels: FunctionDetailLabels
  /** Cache partition, matching the other tabs — cloud-react keys by region. */
  scope?: string
  className?: string
}

/**
 * Per-function metrics, charted from GET /v1/metrics/series.
 *
 * The seven cards the control plane can answer are real; the five it cannot are
 * still coming-soon previews, blurred so they can never be mistaken for
 * measurements. A console whose transport has no `getMetricSeries` sees the
 * whole grid as previews rather than a wall of empty axes.
 */
export function MonitorTab({ fn, labels, scope, className }: Readonly<MonitorTabProps>) {
  const { capabilities } = useServerlessContext()
  const [rangeIndex, setRangeIndex] = useState(1)
  const range = RANGES[rangeIndex] ?? RANGES[1]

  const { data, error, isFetching, refetch } = useFunctionMetrics(
    capabilities.metrics ? fn.name : "",
    { functionName: fn.name, since: range.since, step: range.step },
    scope,
  )

  const buckets = useMemo(() => data?.buckets ?? [], [data])
  const totals = data?.totals

  // Succeeded is derived rather than served: the series counts invocations and
  // errors, and a stacked bar needs the two to sum to the total, not overlap.
  const invocationPoints = useMemo(
    () =>
      pointsFrom(buckets, (bucket) => [
        Math.max(bucket.invocations - bucket.errors, 0),
        bucket.errors,
      ]),
    [buckets],
  )
  const durationPoints = useMemo(
    () => pointsFrom(buckets, (bucket) => [bucket.avgDurationMs, bucket.maxDurationMs]),
    [buckets],
  )
  const errorPoints = useMemo(() => pointsFrom(buckets, (bucket) => [bucket.errors]), [buckets])
  const throttlePoints = useMemo(
    () => pointsFrom(buckets, (bucket) => [bucket.throttles]),
    [buckets],
  )
  const concurrencyPoints = useMemo(
    () => pointsFrom(buckets, (bucket) => [bucket.avgInflight, bucket.peakInflight]),
    [buckets],
  )
  const coldStartPoints = useMemo(
    () => pointsFrom(buckets, (bucket) => [bucket.coldStarts]),
    [buckets],
  )
  const computePoints = useMemo(() => pointsFrom(buckets, (bucket) => [bucket.gbSeconds]), [buckets])

  const throttleTotal = useMemo(
    () => buckets.reduce((sum, bucket) => sum + bucket.throttles, 0),
    [buckets],
  )
  const peakConcurrency = useMemo(
    () => buckets.reduce((peak, bucket) => Math.max(peak, bucket.peakInflight), 0),
    [buckets],
  )

  const metrics = labels.monitor.metrics
  const summary = labels.monitor.summary
  const previews = comingSoonCards(labels)

  return (
    <div className={className}>
      <div className={toolbar}>
        <Activity aria-hidden className={toolbarIcon} />
        {RANGES.map((option, index) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={index === rangeIndex}
            onClick={() => {
              setRangeIndex(index)
            }}
            className={cx(rangeChip, index === rangeIndex && rangeChipActive)}
          >
            {option.label}
          </button>
        ))}
        {capabilities.metrics && (
          <button
            type="button"
            className={refreshButton}
            onClick={() => {
              void refetch()
            }}
          >
            <RefreshCw
              aria-hidden
              className={cx(toolbarIcon, isFetching && spinning)}
            />
            {labels.monitor.refresh}
          </button>
        )}
      </div>

      <p className={blurb}>
        {capabilities.metrics ? labels.monitor.blurb : labels.monitor.unavailable}
      </p>

      {error && (
        <p className={failure}>
          {errorMessage(error, labels.monitor.loadFailed)}
        </p>
      )}
      {data?.truncated && <p className={notice}>{labels.monitor.truncated}</p>}

      <div className={grid}>
        {capabilities.metrics && (
          <>
            <MetricCard
              kind="bar"
              {...metrics.invocations}
              points={invocationPoints}
              series={[
                { label: "Succeeded", color: COLOR.one },
                { label: "Failed", color: COLOR.failed },
              ]}
              summary={summary.total(formatTick(totals?.invocations ?? 0))}
            />
            <MetricCard
              kind="line"
              {...metrics.duration}
              points={durationPoints}
              series={[
                { label: "Average", color: COLOR.two },
                { label: "Maximum", color: COLOR.three },
              ]}
              summary={summary.average(`${formatTick(totals?.avgDurationMs ?? 0)} ms`)}
            />
            <MetricCard
              kind="bar"
              {...metrics.errors}
              points={errorPoints}
              series={[{ label: "Errors", color: COLOR.danger }]}
              summary={summary.successRate(
                `${(100 - (totals?.errorRate ?? 0) * 100).toFixed(1)}%`,
              )}
            />
            <MetricCard
              kind="bar"
              {...metrics.throttles}
              points={throttlePoints}
              series={[{ label: "Throttles", color: COLOR.two }]}
              summary={summary.total(formatTick(throttleTotal))}
            />
            {/* Concurrency is a worker-reported gauge, so an empty plot means
                nothing sampled — never "zero in flight". */}
            <MetricCard
              kind="line"
              {...metrics.concurrent}
              points={concurrencyPoints}
              series={[
                { label: "Average", color: COLOR.one },
                { label: "Peak", color: COLOR.two },
              ]}
              summary={summary.peak(formatTick(peakConcurrency))}
              emptyLabel={labels.monitor.noSamples}
            />
            <MetricCard
              kind="bar"
              {...metrics.coldStarts}
              points={coldStartPoints}
              series={[{ label: "Cold starts", color: COLOR.three }]}
              summary={summary.total(formatTick(totals?.coldStarts ?? 0))}
            />
            <MetricCard
              kind="line"
              {...metrics.compute}
              points={computePoints}
              series={[{ label: "GB-seconds", color: COLOR.one }]}
              summary={summary.total((totals?.gbSeconds ?? 0).toFixed(4))}
            />
          </>
        )}

        {(capabilities.metrics ? previews : [...realCardPreviews(labels), ...previews]).map(
          (metric) => (
            <MetricComingSoonCard
              key={metric.key}
              title={metric.title}
              unit={metric.unit}
              comingSoonLabel={labels.monitor.comingSoon}
              series={metric.series}
            />
          ),
        )}
      </div>
    </div>
  )
}

/**
 * The charted metrics, as previews. Only reached when the console wired no
 * metrics transport: a grid of empty axes would read as "this function has no
 * traffic" rather than "this console cannot ask".
 */
function realCardPreviews(labels: FunctionDetailLabels): {
  key: string
  title: string
  unit: string
  series: { label: string; color: string; points: readonly number[] }[]
}[] {
  const metrics = labels.monitor.metrics
  return [
    {
      key: "invocations",
      ...metrics.invocations,
      series: [
        { label: "Invocations", color: COLOR.one, points: [3, 8, 5, 12, 9, 15, 11, 18] },
      ],
    },
    {
      key: "duration",
      ...metrics.duration,
      series: [
        { label: "Average", color: COLOR.two, points: [8, 10, 9, 14, 11, 13, 10, 12] },
        { label: "Maximum", color: COLOR.three, points: [14, 17, 15, 19, 16, 18, 15, 17] },
      ],
    },
    {
      key: "errors",
      ...metrics.errors,
      series: [
        { label: "Errors", color: COLOR.danger, points: [1, 0, 2, 1, 0, 1, 0, 0] },
        {
          label: "Success rate",
          color: COLOR.success,
          points: [17, 18, 16, 17, 19, 18, 19, 19],
        },
      ],
    },
    {
      key: "throttles",
      ...metrics.throttles,
      series: [{ label: "Throttles", color: COLOR.two, points: [0, 1, 0, 0, 2, 0, 1, 0] }],
    },
    {
      key: "concurrent",
      ...metrics.concurrent,
      series: [{ label: "Concurrent", color: COLOR.one, points: [2, 4, 3, 6, 5, 8, 6, 7] }],
    },
    {
      key: "coldStarts",
      ...metrics.coldStarts,
      series: [{ label: "Cold starts", color: COLOR.three, points: [2, 1, 3, 1, 0, 2, 1, 1] }],
    },
    {
      key: "compute",
      ...metrics.compute,
      series: [{ label: "GB-seconds", color: COLOR.one, points: [3, 5, 4, 8, 6, 9, 7, 11] }],
    },
  ]
}
