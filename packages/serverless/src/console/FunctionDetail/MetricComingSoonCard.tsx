import { css, cx, fontMono, glass1, mix } from "@datadack/common-ui"

const card = css`
  border-radius: 0.625rem;
  border: 1px solid ${mix("--border", 55)};
  padding: 12px;
`

const headerRow = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const title = css`
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
`

const pill = css`
  flex-shrink: 0;
  border-radius: 9999px;
  background: ${mix("--brand-gold", 10)};
  padding: 2px 8px;
  font-family: ${fontMono};
  font-size: 10px;
  color: var(--brand-gold);
`

const unitLine = css`
  margin: 1px 0 0;
  font-size: 10px;
  color: var(--muted-foreground);
`

/* The sparkline is a preview of a chart that does not exist yet — blurred and
   inert so it cannot be mistaken for data, and hidden from assistive tech. */
const mock = css`
  filter: blur(1.5px);
  pointer-events: none;
  user-select: none;
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

const TICKS = ["12:00", "12:30", "13:00", "13:30", "14:00"]

/** Points → an SVG polyline path across a 100×20 viewBox. */
function toPath(points: readonly number[]): string {
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

export interface MetricComingSoonCardProps {
  title: string
  unit: string
  comingSoonLabel: string
  /**
   * Deterministic literal points rather than random values: the mock must
   * render identically on every paint, and Math.random would also make it
   * flicker under React's double-render in development.
   */
  series: readonly { label: string; color: string; points: readonly number[] }[]
  className?: string
}

/**
 * One Lambda-style metric card for the Monitor tab before per-function metrics
 * exist: real title and unit, a blurred decorative sparkline, and a gold
 * "Coming soon" pill carrying the only accessible signal.
 */
export function MetricComingSoonCard({
  title: metricTitle,
  unit,
  comingSoonLabel,
  series,
  className,
}: Readonly<MetricComingSoonCardProps>) {
  return (
    <div
      className={cx(glass1, card, className)}
      aria-label={`${metricTitle} — ${comingSoonLabel}`}
    >
      <div className={headerRow}>
        <h4 className={title}>{metricTitle}</h4>
        <span className={pill}>{comingSoonLabel}</span>
      </div>
      <p className={unitLine}>{unit}</p>

      <div aria-hidden className={mock}>
        <svg className={chart} viewBox="0 0 100 20" preserveAspectRatio="none" fill="none">
          {series.map((line) => (
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
          {series.map((line) => (
            <span key={line.label}>
              <span className={legendDot} style={{ background: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
