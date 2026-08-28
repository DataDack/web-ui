import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import {
  Activity,
  AlertTriangle,
  Gauge,
  HardDrive,
  Network,
  Server,
  Snowflake,
  Timer,
} from "lucide-react"

import { InfrastructurePanel } from "@/features/observability/InfrastructurePanel"
import { deriveInsights } from "@/features/observability/insights"
import { InsightsPanel } from "@/features/observability/InsightsPanel"
import { apiErrorMessage } from "@/lib/api"
import { formatMb, formatRate, nodesOnHosts, orDash } from "@/lib/format"
import { useDashboard, useFleetMetrics, useMetricSeries } from "@/lib/queries"
import type { MetricSeries } from "@/lib/schemas"

import {
  BarTimeChart,
  ChartNote,
  LineTimeChart,
  PageHeader,
  DataTable,
  EmptyState,
  StatCard,
  StatGrid,
  cellMono,
  cellText,
  cn,
  formatTick,
  type ChartPoint,
} from "@datadack/common-ui"
/** The windows the control plane's relative `since` parameter accepts. */
const RANGES = [
  { label: "15m", since: "-15m", step: "30s" },
  { label: "1h", since: "-1h", step: "60s" },
  { label: "6h", since: "-6h", step: "5m" },
  { label: "24h", since: "-24h", step: "15m" },
] as const

type FunctionTotal = MetricSeries["topFunctions"][number]


// No per-row sparkline here, deliberately. The control plane buckets per
// function only when one is SELECTED, so an unfiltered table has the fleet-wide
// series and nothing per row — a chart drawn from it would be identical on every
// row while implying each row's own shape. Click a function to filter; the
// charts above then are that function's, measured rather than inferred.

export function MetricsPage() {
  const [rangeIndex, setRangeIndex] = useState(1)
  const [functionName, setFunctionName] = useState("")
  const range = RANGES[rangeIndex] ?? RANGES[1]

  const { data: dashboard } = useDashboard()
  const functions = dashboard?.detail.functions ?? []
  // The machines, alongside the workload they run. Kept on the same screen
  // deliberately: latency doubling and the node it runs on sitting at 95% CPU
  // are the same incident, and separating them is how it takes an hour.
  const fleet = useFleetMetrics()
  const cluster = fleet.data

  const { data, isFetching, isLoading, refetch, error } = useMetricSeries({
    since: range.since,
    step: range.step,
    function: functionName || undefined,
  })

  const buckets = useMemo(() => data?.buckets ?? [], [data])

  // What the numbers add up to, in words. Derived from exactly what is on
  // screen, so a finding can always be checked against the chart above it.
  const insights = useMemo(
    () =>
      deriveInsights({
        series: data,
        cluster,
        workers: dashboard?.detail.workers,
      }),
    [data, cluster, dashboard],
  )

  // Two charts rather than one with two y-scales: counts and milliseconds do
  // not share a scale, and forcing them onto one axis makes both unreadable.
  const invocationPoints = useMemo<ChartPoint[]>(
    () =>
      buckets.map((bucket) => ({
        timestamp: bucket.timestamp,
        values: [Math.max(bucket.invocations - bucket.errors, 0), bucket.errors],
      })),
    [buckets],
  )
  const latencyPoints = useMemo<ChartPoint[]>(
    () =>
      buckets.map((bucket) => ({
        timestamp: bucket.timestamp,
        values: [bucket.p50DurationMs, bucket.p95DurationMs, bucket.p99DurationMs],
      })),
    [buckets],
  )
  const resourcePoints = useMemo<ChartPoint[]>(
    () =>
      buckets.map((bucket) => ({
        timestamp: bucket.timestamp,
        values: [bucket.avgMemoryMb, bucket.peakMemoryMb],
      })),
    [buckets],
  )
  // Cold starts and throttles are the two that explain a latency chart. A p95
  // that doubled because the fleet was cold and one that doubled because the
  // tenant hit a ceiling look identical until these are next to it.
  const saturationPoints = useMemo<ChartPoint[]>(
    () =>
      buckets.map((bucket) => ({
        timestamp: bucket.timestamp,
        values: [bucket.coldStarts, bucket.throttles],
      })),
    [buckets],
  )
  const concurrencyPoints = useMemo<ChartPoint[]>(
    () =>
      buckets.map((bucket) => ({
        timestamp: bucket.timestamp,
        values: [bucket.avgInflight],
      })),
    [buckets],
  )

  const columns = useMemo<ColumnDef<FunctionTotal>[]>(
    () => [
      {
        accessorKey: "functionName",
        header: "Function",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setFunctionName(row.original.functionName)
            }}
            className="hover:text-brand-gold font-mono text-[13px] font-medium underline-offset-2 hover:underline"
          >
            {row.original.functionName}
          </button>
        ),
      },
      {
        accessorKey: "invocations",
        header: "Invocations",
        cell: ({ row }) => cellMono(row.original.invocations),
      },
      {
        accessorKey: "errors",
        header: "Errors",
        cell: ({ row }) =>
          row.original.errors > 0 ? (
            <span className="text-status-danger font-mono text-[12px]">{row.original.errors}</span>
          ) : (
            cellMono(0)
          ),
      },
      {
        accessorKey: "avgDurationMs",
        header: "Avg",
        cell: ({ row }) => cellMono(`${formatTick(row.original.avgDurationMs)} ms`),
      },
      {
        accessorKey: "p95DurationMs",
        header: "p95",
        cell: ({ row }) => cellMono(`${formatTick(row.original.p95DurationMs)} ms`),
      },
      {
        accessorKey: "gbSeconds",
        header: "GB-seconds",
        cell: ({ row }) => cellText(row.original.gbSeconds.toFixed(4)),
      },
    ],
    [],
  )

  const totals = data?.totals

  return (
    <>
      <PageHeader
        title="Observability"
        icon={Activity}
        description="The workload and the machines under it, on one screen — invocations, latency, saturation and the fleet serving them."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="border-border bg-card inline-flex overflow-hidden rounded-lg border">
          {RANGES.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setRangeIndex(index)
              }}
              className={cn(
                "px-2.5 py-1 font-mono text-[11px] transition-colors",
                index === rangeIndex
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <select
          value={functionName}
          onChange={(event) => {
            setFunctionName(event.target.value)
          }}
          className="border-border bg-card text-foreground h-[26px] rounded-lg border px-2 text-[12px]"
          aria-label="Filter by function"
        >
          <option value="">All functions</option>
          {functions.map((fn) => (
            <option key={fn.id} value={fn.name}>
              {fn.name}
            </option>
          ))}
        </select>

        {data?.truncated && (
          <span className="text-status-warning text-[11px]">
            Window truncated — the control plane hit its row cap, so this covers less than{" "}
            {range.label}.
          </span>
        )}
      </div>

      <InsightsPanel insights={insights} loading={isLoading || fleet.isLoading} />

      {/* The fleet first, then the workload on it. In that order because when
          both are wrong the fleet is usually why, and a reader who sees the
          workload first spends the first minute in the wrong place. */}
      <StatGrid className="mb-4">
        <StatCard
          label="Fleet"
          value={cluster ? nodesOnHosts(cluster.reportingNodes, cluster.hosts) : "—"}
          icon={Server}
          loading={fleet.isLoading}
        />
        <StatCard
          label="Cluster CPU"
          value={cluster ? `${cluster.cpuPercent.toFixed(0)}%` : "—"}
          icon={Gauge}
          color={cluster && cluster.cpuPercent >= 85 ? "danger" : "default"}
          loading={fleet.isLoading}
        />
        <StatCard
          label="Memory available"
          value={
            cluster
              ? `${orDash(formatMb(cluster.freeMemoryMb))} of ${orDash(formatMb(cluster.totalMemoryMb))}`
              : "—"
          }
          icon={HardDrive}
          loading={fleet.isLoading}
        />
        <StatCard
          label="Network"
          value={
            cluster
              ? `↓${orDash(formatRate(cluster.netRxBytesPerSec))} ↑${orDash(formatRate(cluster.netTxBytesPerSec))}`
              : "—"
          }
          icon={Network}
          loading={fleet.isLoading}
        />
      </StatGrid>

      <StatGrid className="mb-4">
        <StatCard
          label="Invocations"
          value={totals ? formatTick(totals.invocations) : 0}
          icon={Activity}
          loading={isLoading}
        />
        <StatCard
          label="Error rate"
          value={totals ? `${(totals.errorRate * 100).toFixed(1)}%` : "0%"}
          icon={AlertTriangle}
          color={totals && totals.errorRate > 0 ? "danger" : "default"}
          loading={isLoading}
        />
        <StatCard
          label="p95 duration"
          value={totals ? `${formatTick(totals.p95DurationMs)} ms` : "—"}
          icon={Timer}
          loading={isLoading}
        />
        <StatCard
          label="Cold starts"
          value={totals ? formatTick(totals.coldStarts) : 0}
          icon={Snowflake}
          loading={isLoading}
        />
      </StatGrid>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <div>
          <BarTimeChart
            title="Invocations"
            points={invocationPoints}
            series={[
              { label: "Succeeded", color: "var(--chart-1)" },
              { label: "Failed", color: "var(--chart-error)" },
            ]}
          />
          <ChartNote>
            Counted from execution records, so every invocation is one row rather than a sampled
            estimate.
          </ChartNote>
        </div>

        <div>
          <LineTimeChart
            title="Duration percentiles"
            unit="ms"
            points={latencyPoints}
            series={[
              { label: "p50", color: "var(--chart-1)" },
              { label: "p95", color: "var(--chart-2)" },
              { label: "p99", color: "var(--chart-3)" },
            ]}
          />
          <ChartNote>
            Percentiles are computed per bucket over that bucket&apos;s invocations, not averaged
            from another average.
          </ChartNote>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <div>
          <BarTimeChart
            title="Cold starts and throttles"
            points={saturationPoints}
            series={[
              { label: "Cold starts", color: "var(--chart-3)" },
              { label: "Throttled", color: "var(--chart-error)" },
            ]}
          />
          <ChartNote>
            The two that explain a latency chart. A p95 that doubled because the fleet was cold and
            one that doubled because a tenant hit a ceiling look identical until these sit beside
            it.
          </ChartNote>
        </div>

        <div>
          <LineTimeChart
            title="Concurrent executions"
            points={concurrencyPoints}
            series={[{ label: "Mean in flight", color: "var(--chart-2)" }]}
          />
          <ChartNote>
            Mean concurrency per bucket. Read against the sandbox counts on the fleet below:
            concurrency flat against a ceiling while requests queue is a capacity problem, not a
            slow function.
          </ChartNote>
        </div>
      </div>

      <div className="mb-6">
        <LineTimeChart
          title="Memory used"
          unit="MB"
          points={resourcePoints}
          series={[
            { label: "Mean", color: "var(--chart-1)" },
            { label: "Peak", color: "var(--chart-2)" },
          ]}
          emptyLabel="No worker samples in this window"
        />
        <ChartNote>
          Reported by workers as gauges. An empty chart means nothing sampled, which is not the same
          as zero memory in use.
        </ChartNote>
      </div>

      {/* The table is also the accessible view of the charts above: every value
          plotted is readable here without relying on colour. */}
      <section className="mb-6">
        <h2 className="mb-3 text-[13px] font-medium">Fleet</h2>
        <InfrastructurePanel cluster={cluster} loading={fleet.isLoading} />
      </section>

      <DataTable
        data={data?.topFunctions ?? []}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Filter functions…"
        empty={
          <EmptyState
            icon={Gauge}
            title="No invocations in this window"
            description="Invoke a function and its totals appear here."
          />
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        error={error ? apiErrorMessage(error) : undefined}
        onRetry={() => void refetch()}
      />
    </>
  )
}
