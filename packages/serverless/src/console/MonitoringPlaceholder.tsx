import { Activity, LineChart } from "lucide-react"

import { contentEnter, css, cx, fontMono, glass1, glass2, glass3, media, mix } from "@datadack/common-ui"

const root = css`
  position: relative;
  overflow: hidden;
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px ${mix("--border", 60)};
`

const mock = css`
  pointer-events: none;
  user-select: none;
  filter: blur(2px);
  padding: 16px;
`

const overlay = css`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  background: linear-gradient(
    to bottom,
    ${mix("--background", 40)},
    ${mix("--background", 70)},
    ${mix("--background", 85)}
  );
  backdrop-filter: blur(3px);
`

const card = css`
  max-width: 24rem;
  padding: 20px 24px;
  text-align: center;
  border-radius: 0.75rem;
  box-shadow:
    0 0 0 1px ${mix("--border", 70)},
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
`

const cardIconTile = css`
  margin: 0 auto 12px;
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
`

const cardIcon = css`
  color: var(--brand-gold);
  width: 20px;
  height: 20px;
`

const cardTitle = css`
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
`

const cardBlurb = css`
  color: var(--muted-foreground);
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.625;
`

/* ── the dimmed mock ─────────────────────────────────────────────────── */

const toolbar = css`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
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

const tile = css`
  border-radius: 0.625rem;
  border: 1px solid ${mix("--border", 55)};
  padding: 12px;
`

const tileTitle = css`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
`

const tileUnit = css`
  margin: 1px 0 0;
  font-size: 10px;
  color: var(--muted-foreground);
`

const chart = css`
  margin-top: 10px;
  height: 64px;
  width: 100%;
`

const axis = css`
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-family: ${fontMono};
  font-size: 9px;
  color: ${mix("--muted-foreground", 55)};
`

const legend = css`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  font-family: ${fontMono};
  font-size: 9px;
  color: var(--muted-foreground);
`

const legendDot = css`
  display: inline-block;
  width: 8px;
  height: 2px;
  margin-right: 4px;
  vertical-align: middle;
  border-radius: 1px;
`

interface Metric {
  title: string
  unit: string
  series: { label: string; color: string; points: number[] }[]
}

/**
 * Plausible-but-fake shapes. Deterministic literals rather than random values:
 * the mock must render identically on every paint, and Math.random would also
 * make it flicker under React's double-render in development.
 */
const METRICS: Metric[] = [
  {
    title: "Invocations",
    unit: "Count",
    series: [{ label: "Invocations [sum]", color: "var(--chart-1)", points: [3, 8, 5, 12, 9, 15, 11, 18] }],
  },
  {
    title: "Duration",
    unit: "Milliseconds",
    series: [
      { label: "Average", color: "var(--chart-2)", points: [8, 10, 9, 14, 11, 13, 10, 12] },
      { label: "Maximum", color: "var(--chart-3)", points: [14, 17, 15, 19, 16, 18, 15, 17] },
    ],
  },
  {
    title: "Error count and success rate",
    unit: "Count",
    series: [
      { label: "Errors [max]", color: "var(--destructive)", points: [1, 0, 2, 1, 0, 1, 0, 0] },
      { label: "Success rate [min]", color: "var(--status-success)", points: [17, 18, 16, 17, 19, 18, 19, 19] },
    ],
  },
  {
    title: "Throttles",
    unit: "Count",
    series: [{ label: "Throttles [max]", color: "var(--chart-4)", points: [0, 1, 0, 0, 2, 0, 1, 0] }],
  },
  {
    title: "Concurrent executions",
    unit: "Count",
    series: [{ label: "Concurrent [max]", color: "var(--chart-5)", points: [2, 4, 3, 6, 5, 8, 6, 7] }],
  },
  {
    title: "Async delivery failures",
    unit: "Count",
    series: [{ label: "Dead letter [sum]", color: "var(--chart-2)", points: [0, 0, 1, 0, 0, 0, 1, 0] }],
  },
]

const TICKS = ["12:00", "12:30", "13:00", "13:30", "14:00"]
const RANGES = ["1h", "3h", "12h", "1d", "3d", "1w"]

/** Points → an SVG polyline path across a 100×20 viewBox. */
function toPath(points: number[]): string {
  const max = Math.max(...points, 1)
  const step = 100 / Math.max(points.length - 1, 1)
  return points
    .map((value, index) => {
      const x = (index * step).toFixed(1)
      const y = (20 - (value / max) * 18).toFixed(1)
      return `${index === 0 ? "M" : "L"}${x} ${y}`
    })
    .join(" ")
}

function MetricTile({ metric }: Readonly<{ metric: Metric }>) {
  return (
    <div className={cx(glass1, tile)}>
      <h4 className={tileTitle}>{metric.title}</h4>
      <p className={tileUnit}>{metric.unit}</p>
      <svg className={chart} viewBox="0 0 100 20" preserveAspectRatio="none" fill="none">
        {metric.series.map((line) => (
          <path
            key={line.label}
            d={toPath(line.points)}
            stroke={line.color}
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className={axis}>
        {TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className={legend}>
        {metric.series.map((line) => (
          <span key={line.label}>
            <span className={legendDot} style={{ background: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export interface MonitoringPlaceholderProps {
  functionName: string
  /** Overlay copy overrides, for consoles with a different story. */
  title?: string
  message?: string
  className?: string
}

/**
 * The Monitor tab before per-function metrics exist: a dimmed, inert mock of
 * the metric grid behind a "coming soon" card, so the tab reads as a feature
 * being built rather than an empty panel.
 *
 * Everything below the overlay is decoration — no data, no interactivity — and
 * is hidden from assistive tech. The overlay carries the only real message.
 * Mirrors CodeEditorPlaceholder, which does the same for the Code tab.
 */
export function MonitoringPlaceholder({
  functionName,
  title,
  message,
  className,
}: Readonly<MonitoringPlaceholderProps>) {
  return (
    <div className={cx(glass2, contentEnter, root, className)}>
      <div aria-hidden className={mock}>
        <div className={toolbar}>
          <Activity size={13} style={{ color: "var(--muted-foreground)" }} />
          <span className={cx(rangeChip, rangeChipActive)}>3h</span>
          {RANGES.filter((range) => range !== "3h").map((range) => (
            <span key={range} className={rangeChip}>
              {range}
            </span>
          ))}
        </div>
        <div className={grid}>
          {METRICS.map((metric) => (
            <MetricTile key={metric.title} metric={metric} />
          ))}
        </div>
      </div>

      <div className={overlay}>
        <div className={cx(glass3, card)}>
          <div className={cx(glass1, cardIconTile)}>
            <LineChart className={cardIcon} />
          </div>
          <h3 className={cardTitle}>{title ?? "Coming soon"}</h3>
          <p className={cardBlurb}>
            {message ??
              `Invocation, duration, error and throttle metrics for ${functionName} aren’t available yet. Use the function’s logs in the meantime.`}
          </p>
        </div>
      </div>
    </div>
  )
}
