import { useState } from "react"

import { cn, formatBytes, Skeleton } from "@datadack/common-ui"
import { AlertTriangle, ArrowDownUp, ChartLine, Globe } from "lucide-react"

import { MetricChart, Section, StatGrid } from "@/components/console"

import { useProjectAnalytics } from "../../managed-apps.hooks"
import type { Project } from "../../managed-apps.types"

const ANALYTICS_RANGES = [
  { value: "24h", label: "24h", ago: "24h ago" },
  { value: "7d", label: "7d", ago: "7d ago" },
  { value: "30d", label: "30d", ago: "30d ago" },
] as const

/**
 * Analytics — what the edge actually served for this app.
 *
 * Every number is a counter the gateway recorded while serving the request:
 * requests, bytes out, and status classes, flushed to the platform once a
 * minute and bucketed by hour. Nothing here is sampled or estimated, which is
 * also why the empty state is honest: no rows means the edge served nothing
 * in the window.
 */
export function ProjectAnalyticsTab({ project }: Readonly<{ project: Project }>) {
  const [range, setRange] = useState<string>("7d")
  const { data, isLoading } = useProjectAnalytics(project.id, range)

  const points = data?.points ?? []
  const totals = data?.totals
  const ready = !isLoading && data != null
  const agoLabel = ANALYTICS_RANGES.find((r) => r.value === range)?.ago ?? "7d ago"

  const errorRate =
    totals && totals.requests > 0
      ? ((totals.status_4xx + totals.status_5xx) / totals.requests) * 100
      : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] text-muted-foreground">
          Traffic served through the DataDack edge, updated every minute.
        </span>
        <div className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5">
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRange(r.value)
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                range === r.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <StatGrid
        stats={[
          {
            label: "Requests",
            value: totals?.requests ?? 0,
            icon: Globe,
            loading: isLoading,
          },
          {
            label: "Bandwidth",
            value: totals?.bytes_out ?? 0,
            format: (v) => formatBytes(v),
            icon: ArrowDownUp,
            loading: isLoading,
          },
          {
            label: "Server errors (5xx)",
            value: totals?.status_5xx ?? 0,
            icon: AlertTriangle,
            color: (totals?.status_5xx ?? 0) > 0 ? "danger" : "default",
            loading: isLoading,
          },
          {
            label: "Error rate",
            value: errorRate,
            format: (v) => `${v.toFixed(1)}%`,
            icon: ChartLine,
            color: errorRate > 5 ? "warning" : "default",
            loading: isLoading,
          },
        ]}
      />

      {ready && totals?.requests === 0 ? (
        <Section variant="panel" title="No traffic in this range">
          <p className="max-w-lg text-[13px] text-muted-foreground">
            The edge has not served any requests for this app in the selected window. Counters
            appear here within a minute of the first request.
          </p>
        </Section>
      ) : (
        <>
          <TrafficPanel
            title={`Requests per ${data?.interval ?? "hour"}`}
            data={points.map((p) => p.requests)}
            overlay={{
              data: points.map((p) => p.status_5xx),
              color: "rgb(239,68,68)",
            }}
            overlayLabel="5xx"
            color="rgb(34,197,94)"
            ready={ready}
            agoLabel={agoLabel}
          />
          <TrafficPanel
            title={`Bandwidth per ${data?.interval ?? "hour"}`}
            data={points.map((p) => p.bytes_out / (1024 * 1024))}
            color="rgb(14,165,233)"
            unit=" MB"
            ready={ready}
            agoLabel={agoLabel}
          />
        </>
      )}
    </div>
  )
}

function TrafficPanel({
  title,
  data,
  color,
  ready,
  unit = "",
  overlay,
  overlayLabel,
  agoLabel,
}: Readonly<{
  title: string
  data: number[]
  color: string
  ready: boolean
  unit?: string
  overlay?: { data: number[]; color: string }
  overlayLabel?: string
  agoLabel: string
}>) {
  const total = data.reduce((a, b) => a + b, 0)

  return (
    <Section
      variant="panel"
      title={title}
      actions={
        overlay && overlayLabel ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: overlay.color }} />
            {overlayLabel}
          </span>
        ) : undefined
      }
    >
      {ready ? (
        <div className="space-y-3">
          <MetricChart
            data={data}
            color={color}
            unit={unit}
            height={140}
            min={0}
            overlay={overlay}
          />
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground/70">
            <span>{agoLabel}</span>
            <span>
              total {unit === " MB" ? total.toFixed(1) : Math.round(total).toLocaleString()}
              {unit}
            </span>
          </div>
        </div>
      ) : (
        <Skeleton className="h-[160px] w-full rounded-lg" />
      )}
    </Section>
  )
}
