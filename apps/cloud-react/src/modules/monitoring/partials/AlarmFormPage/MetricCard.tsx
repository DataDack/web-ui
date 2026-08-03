// One selectable signal, with its real last-3h line.
//
// The sparkline is a live metrics query against the resource the user picked —
// not decoration. A card with no datapoints says so, because "there is nothing
// to alarm on here yet" is the single most useful thing this grid can tell you.

import { useMemo } from "react"

import { Badge, cn } from "@datadack/common-ui"

import { Sparkline } from "@/components/console"

import { useMetricsQuery } from "../../monitoring.hooks"
import { SERIES_COLOR_OK } from "../../monitoring.meta"
import type { MetricDescriptor, MetricsWindowQuery } from "../../monitoring.types"

const SPARK_WINDOW_MS = 3 * 60 * 60 * 1000

/** Trim to a readable number of significant digits without lying about scale. */
function formatValue(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

export function MetricCard({
  descriptor,
  namespace,
  dimensions,
  selected,
  enabled,
  onSelect,
}: Readonly<{
  descriptor: MetricDescriptor
  namespace: string
  dimensions: Record<string, string>
  selected: boolean
  /** False while no resource is chosen — holds the query instead of firing it. */
  enabled: boolean
  onSelect: (descriptor: MetricDescriptor) => void
}>) {
  const query = useMemo<MetricsWindowQuery | null>(() => {
    if (!enabled || !namespace) return null
    return {
      namespace,
      metric: descriptor.metric,
      statistic: descriptor.statistic,
      period: 60,
      dimensions,
      windowMs: SPARK_WINDOW_MS,
    }
  }, [enabled, namespace, descriptor.metric, descriptor.statistic, dimensions])

  const metrics = useMetricsQuery(query)

  const series = useMemo(
    () =>
      (metrics.data?.buckets ?? [])
        .map((bucket) => bucket.value)
        .filter((value): value is number => value !== null),
    [metrics.data],
  )

  const latest = series.length > 0 ? series[series.length - 1] : null

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        onSelect(descriptor)
      }}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold/25"
          : "border-border hover:border-brand-gold/40 hover:bg-muted/30",
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="min-w-0 text-[13px] font-medium text-foreground">{descriptor.label}</span>
        {descriptor.unit && (
          <Badge variant="outline" className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {descriptor.unit}
          </Badge>
        )}
      </span>

      <span className="block text-[11px] leading-snug text-muted-foreground">
        {descriptor.description}
      </span>

      <span className="flex h-8 items-end gap-2">
        {series.length >= 2 ? (
          <Sparkline
            data={series}
            color={SERIES_COLOR_OK}
            area
            glow
            height={28}
            className="h-7 min-w-0 flex-1"
          />
        ) : (
          <span className="flex-1 text-[11px] text-muted-foreground">
            {metrics.isLoading ? "loading…" : "no data yet"}
          </span>
        )}
        {latest !== null && (
          <span className="shrink-0 font-mono text-[12px] tabular-nums text-foreground">
            {formatValue(latest)}
            {descriptor.unit}
          </span>
        )}
      </span>
    </button>
  )
}
