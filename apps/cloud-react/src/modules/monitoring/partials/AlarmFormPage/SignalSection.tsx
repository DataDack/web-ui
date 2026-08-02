// Section 2 — "Signal".
//
// The signals offered are the ones the chosen kind of resource actually emits,
// each with the statistic, direction and starting threshold that make sense for
// it. Picking one fills the condition in below, so the rule starts out sane.

import { Input, Label } from "@datadack/common-ui"

import { MetricCard } from "./MetricCard"
import { metricsFor, type AlarmTargetType } from "../../monitoring.targets"
import type { MetricDescriptor } from "../../monitoring.types"

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

export function SignalSection({
  targetType,
  metric,
  namespace,
  dimensions,
  hasTarget,
  targetLabel,
  error,
  onMetricChange,
  onMetricSelect,
}: Readonly<{
  targetType: AlarmTargetType
  metric: string
  /** Resolved namespace for the chosen target type. */
  namespace: string
  /** Dimensions of the first selected resource — what the sparklines query. */
  dimensions: Record<string, string>
  hasTarget: boolean
  /** Name of the resource the sparklines are drawn from. */
  targetLabel: string
  error?: string
  onMetricChange: (value: string) => void
  onMetricSelect: (descriptor: MetricDescriptor) => void
}>) {
  if (targetType === "custom") {
    return (
      <div className="space-y-1.5">
        <Label className={LABEL_CLASS}>Metric name</Label>
        <Input
          value={metric}
          onChange={(event) => {
            onMetricChange(event.target.value)
          }}
          placeholder="e.g. request_latency_ms"
          className="font-mono text-[13px]"
          autoComplete="off"
        />
        <p className="text-[12px] text-muted-foreground">
          Exactly as you push it, inside the namespace above.
        </p>
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </div>
    )
  }

  if (!hasTarget) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
        Pick a resource above to see its signals.
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      <div
        role="radiogroup"
        aria-label="Signal to watch"
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
      >
        {metricsFor(targetType).map((descriptor) => (
          <MetricCard
            key={descriptor.metric}
            descriptor={descriptor}
            namespace={namespace}
            dimensions={dimensions}
            selected={descriptor.metric === metric}
            enabled={hasTarget}
            onSelect={onMetricSelect}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Lines show the last 3 hours{targetLabel ? ` on ${targetLabel}` : ""}.
      </p>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
