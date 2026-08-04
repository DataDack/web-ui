import { Activity } from "lucide-react"

import { css, cx, fontMono, media, mix } from "@datadack/common-ui"

import type { FunctionDetailLabels } from "./labels"
import { MetricComingSoonCard } from "./MetricComingSoonCard"
import type { FunctionEntity } from "../../data/types"

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
`

const rangeChipActive = css`
  border-color: ${mix("--brand-gold", 60)};
  background: ${mix("--brand-gold", 10)};
  color: var(--brand-gold);
`

const blurb = css`
  margin: 10px 0 14px;
  font-size: 13px;
  color: var(--muted-foreground);
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

const RANGES = ["1h", "3h", "12h", "1d", "3d", "1w"]

interface MetricSeries {
  label: string
  color: string
  points: readonly number[]
}

/**
 * Lambda's ten metric cards, in Lambda's order, each with plausible-but-fake
 * deterministic shapes. Palette is confined to the tokens the theme actually
 * defines: --chart-1..3, --destructive, --status-success (never --chart-4/5).
 * Series labels are part of the blurred decoration and never reach AT.
 */
function metricCards(labels: FunctionDetailLabels): {
  key: string
  title: string
  unit: string
  series: MetricSeries[]
}[] {
  const metrics = labels.monitor.metrics
  return [
    {
      key: "invocations",
      ...metrics.invocations,
      series: [
        { label: "Invocations", color: "var(--chart-1)", points: [3, 8, 5, 12, 9, 15, 11, 18] },
      ],
    },
    {
      key: "duration",
      ...metrics.duration,
      series: [
        { label: "Average", color: "var(--chart-2)", points: [8, 10, 9, 14, 11, 13, 10, 12] },
        { label: "Maximum", color: "var(--chart-3)", points: [14, 17, 15, 19, 16, 18, 15, 17] },
      ],
    },
    {
      key: "errors",
      ...metrics.errors,
      series: [
        { label: "Errors", color: "var(--destructive)", points: [1, 0, 2, 1, 0, 1, 0, 0] },
        {
          label: "Success rate",
          color: "var(--status-success)",
          points: [17, 18, 16, 17, 19, 18, 19, 19],
        },
      ],
    },
    {
      key: "throttles",
      ...metrics.throttles,
      series: [{ label: "Throttles", color: "var(--chart-2)", points: [0, 1, 0, 0, 2, 0, 1, 0] }],
    },
    {
      key: "concurrent",
      ...metrics.concurrent,
      series: [{ label: "Concurrent", color: "var(--chart-1)", points: [2, 4, 3, 6, 5, 8, 6, 7] }],
    },
    {
      key: "recursive",
      ...metrics.recursive,
      series: [{ label: "Detected", color: "var(--chart-3)", points: [0, 0, 1, 0, 0, 0, 0, 1] }],
    },
    {
      key: "asyncEventAge",
      ...metrics.asyncEventAge,
      series: [{ label: "Age", color: "var(--chart-2)", points: [4, 6, 5, 9, 7, 8, 6, 10] }],
    },
    {
      key: "asyncEvents",
      ...metrics.asyncEvents,
      series: [{ label: "Received", color: "var(--chart-1)", points: [5, 9, 7, 12, 10, 14, 11, 16] }],
    },
    {
      key: "asyncFailures",
      ...metrics.asyncFailures,
      series: [{ label: "Failures", color: "var(--destructive)", points: [0, 0, 1, 0, 0, 0, 1, 0] }],
    },
    {
      key: "iteratorAge",
      ...metrics.iteratorAge,
      series: [{ label: "Age", color: "var(--chart-3)", points: [6, 5, 8, 7, 10, 8, 9, 7] }],
    },
  ]
}

export interface MonitorTabProps {
  fn: FunctionEntity
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The Monitor tab before per-function metrics land: an inert range toolbar and
 * the full Lambda card grid rendered as honest coming-soon previews, so the tab
 * shows exactly what is being built rather than a blank panel.
 */
export function MonitorTab({ labels, className }: Readonly<MonitorTabProps>) {
  return (
    <div className={className}>
      {/* Decorative controls for a range picker that filters nothing yet. */}
      <div aria-hidden className={toolbar}>
        <Activity className={toolbarIcon} />
        {RANGES.map((range) => (
          <span key={range} className={cx(rangeChip, range === "3h" && rangeChipActive)}>
            {range}
          </span>
        ))}
      </div>

      <p className={blurb}>{labels.monitor.blurb}</p>

      <div className={grid}>
        {metricCards(labels).map((metric) => (
          <MetricComingSoonCard
            key={metric.key}
            title={metric.title}
            unit={metric.unit}
            comingSoonLabel={labels.monitor.comingSoon}
            series={metric.series}
          />
        ))}
      </div>
    </div>
  )
}
