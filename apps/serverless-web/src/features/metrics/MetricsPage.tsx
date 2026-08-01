import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Activity, AlertTriangle, Gauge, Snowflake, Timer } from "lucide-react"

import { apiErrorMessage } from "@/lib/api"
import { useDashboard, useMetricSeries } from "@/lib/queries"
import type { MetricSeries } from "@/lib/schemas"

import {
  BarTimeChart,
  cellMono,
  cellText,
  ChartNote,
  type ChartPoint,
  cn,
  formatTick,
  LineTimeChart,
  PageHeader,
  ResourceTable,
  StatCard,
  StatGrid,
} from "@datadack/serverless-ui"

/** The windows the control plane's relative `since` parameter accepts. */
const RANGES = [
  { label: "15m", since: "-15m", step: "30s" },
  { label: "1h", since: "-1h", step: "60s" },
  { label: "6h", since: "-6h", step: "5m" },
  { label: "24h", since: "-24h", step: "15m" },
] as const

type FunctionTotal = MetricSeries["topFunctions"][number]

export function MetricsPage() {
  const [rangeIndex, setRangeIndex] = useState(1)
  const [functionName, setFunctionName] = useState("")
  const range = RANGES[rangeIndex] ?? RANGES[1]

  const { data: dashboard } = useDashboard()
  const functions = dashboard?.detail.functions ?? []

  const { data, isLoading, error } = useMetricSeries({
    since: range.since,
    step: range.step,
    function: functionName || undefined,
  })

  const buckets = useMemo(() => data?.buckets ?? [], [data])

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
        title="Metrics"
        icon={Activity}
        description="Invocation rate, latency and resource use over time, bucketed by the control plane."
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

      {error && (
        <div className="border-status-danger/40 bg-status-danger-bg text-status-danger mb-4 rounded-lg border px-3 py-2 text-[12px]">
          {apiErrorMessage(error)}
        </div>
      )}

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
      <ResourceTable
        data={data?.topFunctions ?? []}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Filter functions…"
        emptyIcon={Gauge}
        emptyTitle="No invocations in this window"
        emptyDescription="Invoke a function and its totals appear here."
      />
    </>
  )
}
