import {
  BarTimeChart,
  LineTimeChart,
  css,
  cx,
  fontMono,
  mix,
  type ChartPoint,
  type ChartSeries,
} from "@datadack/common-ui"

/* The chart component already draws its own glass panel, so this adds only the
   footer that carries the unit and the window's headline number. */
const wrapper = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
`

const footer = css`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 2px 0;
  font-size: 10px;
  color: var(--muted-foreground);
`

const summaryText = css`
  font-family: ${fontMono};
  color: ${mix("--foreground", 80)};
`

export interface MetricCardProps {
  /** Counts get bars (a discrete quantity per bucket), measures get lines. */
  kind: "bar" | "line"
  title: string
  unit: string
  points: ChartPoint[]
  series: ChartSeries[]
  /**
   * The window's headline number, already formatted. Shown beside the unit so
   * the card answers "how much, in total" without reading the chart — and so a
   * flat-looking chart still carries its magnitude.
   */
  summary?: string
  /**
   * What an empty plot means. Worth overriding for the gauge-backed cards: no
   * worker samples is not the same statement as zero concurrency.
   */
  emptyLabel?: string
  className?: string
}

/**
 * One Monitor-tab card backed by real series data.
 *
 * Its sibling `MetricComingSoonCard` stays in the grid for the metrics the
 * control plane does not emit yet; anything rendered through here is measured,
 * never mocked.
 */
export function MetricCard({
  kind,
  title,
  unit,
  points,
  series,
  summary,
  emptyLabel,
  className,
}: Readonly<MetricCardProps>) {
  const height = 150
  return (
    <div className={cx(wrapper, className)}>
      {kind === "bar" ? (
        <BarTimeChart
          title={title}
          points={points}
          series={series}
          height={height}
          emptyLabel={emptyLabel}
        />
      ) : (
        <LineTimeChart
          title={title}
          unit={unit}
          points={points}
          series={series}
          height={height}
          emptyLabel={emptyLabel}
        />
      )}
      <p className={footer}>
        <span>{unit}</span>
        {summary && <span className={summaryText}>{summary}</span>}
      </p>
    </div>
  )
}
