import { useState } from "react"

import { cn, Skeleton } from "@datadack/common-ui"
import { Activity, Radio } from "lucide-react"

import { MetricChart, Section } from "@/components/console"

import { useProjectMetrics } from "../../managed-apps.hooks"
import type { Project } from "../../managed-apps.types"

const METRIC_RANGES = [
  { value: "hour", label: "1h", ago: "1h ago" },
  { value: "day", label: "24h", ago: "24h ago" },
  { value: "week", label: "7d", ago: "7d ago" },
  { value: "month", label: "30d", ago: "30d ago" },
] as const

/**
 * Observability — the app container's own resource series, read from the
 * cluster's per-guest RRD data. Real measurements only: when the container is
 * not provisioned (or the cluster cannot be read) the tab says so rather than
 * charting a fabricated series.
 */
export function ProjectObservabilityTab({ project }: Readonly<{ project: Project }>) {
  const [range, setRange] = useState<string>("day")
  const { data, isLoading } = useProjectMetrics(project.id, range)

  const points = data?.points ?? []
  const ready = !isLoading && points.length >= 2
  const unavailable = !isLoading && data?.source !== "proxmox"
  const agoLabel = METRIC_RANGES.find((r) => r.value === range)?.ago ?? "24h ago"

  if (unavailable) {
    // Honest, not "coming soon": either the container is not provisioned yet,
    // or the cluster could not be read just now. Both mean "no measurements",
    // and the platform never charts a fabricated series in their place.
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 glass-1-bg px-6 py-14 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl glass-1-bg-raised">
          <Activity className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No metrics yet</h2>
        <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">
          Metrics chart the app container&apos;s real resource usage and begin once the app is
          deployed. If the app is already live, the cluster couldn&apos;t be read just now — this
          view retries on its own.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px]">
          <Radio className="size-3.5 text-status-success" />
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-success/70" />
            <span className="relative inline-flex size-2 rounded-full bg-status-success" />
          </span>
          <span className="text-foreground">Live</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            container metrics{data?.node ? ` · ${data.node}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5">
          {METRIC_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRange(r.value)
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                range === r.value
                  ? "glass-1-bg-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <MetricPanel
        title="CPU utilization (%)"
        data={points.map((p) => p.cpu)}
        color="rgb(34,197,94)"
        ready={ready}
        agoLabel={agoLabel}
      />
      <MetricPanel
        title="Memory usage (%)"
        data={points.map((p) => p.mem)}
        color="rgb(99,102,241)"
        ready={ready}
        agoLabel={agoLabel}
      />
      <MetricPanel
        title="Disk usage (%)"
        data={points.map((p) => p.disk)}
        color="rgb(245,158,11)"
        ready={ready}
        agoLabel={agoLabel}
      />
      <MetricPanel
        title="Network throughput (MB/s)"
        data={points.map((p) => p.net)}
        color="rgb(14,165,233)"
        ready={ready}
        unit=" MB/s"
        agoLabel={agoLabel}
      />
      <MetricPanel
        title="Disk I/O (MB/s)"
        data={points.map((p) => p.io)}
        color="rgb(217,70,239)"
        ready={ready}
        unit=" MB/s"
        agoLabel={agoLabel}
      />
    </div>
  )
}

/**
 * One chart with its current/avg/peak header. A lean sibling of the VM
 * console's panel rather than an import from another module's partials.
 */
function MetricPanel({
  title,
  data,
  color,
  ready,
  unit = "%",
  agoLabel,
}: Readonly<{
  title: string
  data: number[]
  color: string
  ready: boolean
  unit?: string
  agoLabel: string
}>) {
  const current = data.length > 0 ? data[data.length - 1] : 0
  const peak = data.length > 0 ? Math.max(...data) : 0
  const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0
  const isPercent = unit === "%"
  const fmt = (v: number) => (isPercent ? v.toFixed(1) : v.toFixed(2))

  return (
    <Section variant="panel" title={title}>
      {ready ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color }}>
              {fmt(current)}
              <span className="text-sm text-muted-foreground">{unit}</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              avg {fmt(avg)}
              {unit} · peak {fmt(peak)}
              {unit}
            </span>
          </div>
          <MetricChart
            data={data}
            color={color}
            unit={unit}
            height={140}
            min={isPercent ? 0 : undefined}
            max={isPercent ? 100 : undefined}
          />
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground/70">
            <span>{agoLabel}</span>
            <span>now</span>
          </div>
        </div>
      ) : (
        <Skeleton className="h-[190px] w-full rounded-lg" />
      )}
    </Section>
  )
}
