import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { css, cx } from "../lib/emotion"
import { fontMono, glass1 } from "../lib/styles"

/**
 * The console's two chart forms, hand-rolled in SVG.
 *
 * Both read the same shape: a bucketed series with an ISO timestamp per point.
 * Counts get bars (a discrete quantity per interval); latency gets lines (a
 * continuous measure sampled over time). Neither ever draws two y-scales — when
 * two measures do not share units they get two charts.
 */

export interface ChartPoint {
  timestamp: string
  values: number[]
}

export interface ChartSeries {
  label: string
  /** CSS colour, taken from the chart tokens rather than a status tone. */
  color: string
}

const PADDING = { top: 10, right: 14, bottom: 22, left: 46 }
/** Gap between adjacent bars and between stacked segments, in px. */
const MARK_GAP = 2
const CORNER = 4

const frame = css`
  padding: 12px 16px;
`

const headerRow = css`
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const title = css`
  font-size: 13px;
  font-weight: 500;
`

const legend = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 12px;
  row-gap: 4px;
`

const legendItem = css`
  display: flex;
  align-items: center;
  gap: 6px;
`

const swatch = css`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
`

const swatchRound = css`
  border-radius: 9999px;
`

const legendLabel = css`
  color: var(--muted-foreground);
  font-size: 11px;
`

const plotArea = css`
  position: relative;
`

const axisText = css`
  fill: var(--muted-foreground);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
`

const emptyOverlay = css`
  color: var(--muted-foreground);
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`

const tooltipBox = css`
  pointer-events: none;
  position: absolute;
  top: 4px;
  z-index: 10;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--popover);
  color: var(--popover-foreground);
  padding: 6px 10px;
  font-size: 11px;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
`

const tooltipTime = css`
  color: var(--muted-foreground);
  margin-bottom: 4px;
  font-family: ${fontMono};
  font-size: 10px;
`

const tooltipList = css`
  & > * + * {
    margin-top: 2px;
  }
`

const tooltipRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

const tooltipLabel = css`
  color: var(--muted-foreground);
`

const tooltipValue = css`
  margin-left: auto;
  font-family: ${fontMono};
  font-variant-numeric: tabular-nums;
`

/** Measures the container so the SVG renders at real pixel size — scaling a
 *  viewBox to fit would stretch the labels along with the marks. */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  return [ref, width]
}

// Rounds an axis maximum up to the next visually "nice" number.
const NICE_STEPS = [1, 2, 5]

function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = NICE_STEPS.find((candidate) => normalized <= candidate) ?? 10
  return step * magnitude
}

export function formatTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`
  if (value >= 10 || Number.isInteger(value)) return String(Math.round(value))
  return value.toFixed(1)
}

function formatClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

interface ChartFrameProps {
  points: ChartPoint[]
  series: ChartSeries[]
  height: number
  /** Rendered above the plot; identity is never carried by colour alone. */
  title: string
  unit?: string
  emptyLabel?: string
  children: (frame: Frame) => ReactNode
  tooltip: (index: number) => ReactNode
  maxValue: number
}

interface Frame {
  width: number
  height: number
  plotWidth: number
  plotHeight: number
  max: number
  x: (index: number) => number
  y: (value: number) => number
  band: number
  hovered: number | null
}

function ChartFrame({
  points,
  series,
  height,
  title: titleText,
  unit,
  emptyLabel,
  children,
  tooltip,
  maxValue,
}: Readonly<ChartFrameProps>) {
  const [ref, width] = useWidth()
  const [hovered, setHovered] = useState<number | null>(null)

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0)
  const plotHeight = height - PADDING.top - PADDING.bottom
  const max = niceCeiling(maxValue)
  const band = points.length > 0 ? plotWidth / points.length : 0

  const x = useCallback((index: number) => PADDING.left + band * (index + 0.5), [band])
  const y = useCallback(
    (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight,
    [plotHeight, max],
  )

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (band <= 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const offset = event.clientX - bounds.left - PADDING.left
    const index = Math.floor(offset / band)
    setHovered(index >= 0 && index < points.length ? index : null)
  }

  const ticks = [0, 0.5, 1].map((fraction) => max * fraction)
  const isEmpty = maxValue <= 0

  return (
    <div className={cx(glass1, frame)}>
      <div className={headerRow}>
        <h3 className={title}>{titleText}</h3>
        {/* A legend is always present for two or more series, so the reader
            never has to infer identity from colour alone. */}
        {series.length > 1 && (
          <ul className={legend}>
            {series.map((entry) => (
              <li key={entry.label} className={legendItem}>
                <span aria-hidden className={swatch} style={{ backgroundColor: entry.color }} />
                <span className={legendLabel}>{entry.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={ref} className={plotArea}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={unit ? `${titleText} in ${unit}` : titleText}
            onPointerMove={handleMove}
            onPointerLeave={() => {
              setHovered(null)
            }}
          >
            {/* Grid and axis labels are recessive: they orient the eye without
                competing with the data. */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                />
                <text x={PADDING.left - 8} y={y(tick) + 3} textAnchor="end" className={axisText}>
                  {formatTick(tick)}
                </text>
              </g>
            ))}

            {points.map((point, index) => {
              // Roughly five time labels, whatever the bucket count.
              const stride = Math.max(1, Math.ceil(points.length / 5))
              if (index % stride !== 0) return null
              return (
                <text
                  key={point.timestamp}
                  x={x(index)}
                  y={height - 6}
                  textAnchor="middle"
                  className={axisText}
                >
                  {formatClock(point.timestamp)}
                </text>
              )
            })}

            {!isEmpty &&
              children({ width, height, plotWidth, plotHeight, max, x, y, band, hovered })}

            {hovered !== null && !isEmpty && (
              <line
                x1={x(hovered)}
                x2={x(hovered)}
                y1={PADDING.top}
                y2={PADDING.top + plotHeight}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
            )}
          </svg>
        )}

        {isEmpty && width > 0 && (
          <div className={emptyOverlay}>{emptyLabel ?? "No data in this window"}</div>
        )}

        {hovered !== null && !isEmpty && (
          <div
            className={tooltipBox}
            style={{
              // Flip the tooltip to the left half once the cursor passes the
              // midpoint, so it never runs off the panel.
              left: x(hovered) < width / 2 ? x(hovered) + 10 : undefined,
              right: x(hovered) >= width / 2 ? width - x(hovered) + 10 : undefined,
            }}
          >
            <div className={tooltipTime}>{formatClock(points[hovered]?.timestamp ?? "")}</div>
            {tooltip(hovered)}
          </div>
        )}
      </div>
    </div>
  )
}

export interface BarTimeChartProps {
  points: ChartPoint[]
  series: ChartSeries[]
  title: string
  height?: number
  emptyLabel?: string
}

/** Stacked bars for counts. Segments are separated by a surface gap so the
 *  boundary is legible without relying on the colours differing. */
export function BarTimeChart({
  points,
  series,
  title,
  height = 180,
  emptyLabel,
}: Readonly<BarTimeChartProps>) {
  const max = points.reduce((acc, point) => {
    const total = point.values.reduce((sum, value) => sum + value, 0)
    return Math.max(acc, total)
  }, 0)

  return (
    <ChartFrame
      points={points}
      series={series}
      height={height}
      title={title}
      maxValue={max}
      emptyLabel={emptyLabel}
      tooltip={(index) => (
        <ul className={tooltipList}>
          {series.map((entry, seriesIndex) => (
            <li key={entry.label} className={tooltipRow}>
              <span aria-hidden className={swatch} style={{ backgroundColor: entry.color }} />
              <span className={tooltipLabel}>{entry.label}</span>
              <span className={tooltipValue}>
                {formatTick(points[index]?.values[seriesIndex] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    >
      {(chartFrame) => (
        <g>
          {points.map((point, index) => {
            const barWidth = Math.max(1, chartFrame.band - MARK_GAP)
            const left = chartFrame.x(index) - barWidth / 2
            let cursor = PADDING.top + chartFrame.plotHeight

            return (
              <g
                key={point.timestamp}
                opacity={chartFrame.hovered === null || chartFrame.hovered === index ? 1 : 0.55}
              >
                {point.values.map((value, seriesIndex) => {
                  if (value <= 0) return null
                  const barHeight = (value / chartFrame.max) * chartFrame.plotHeight
                  const top = cursor - barHeight
                  cursor = top - MARK_GAP
                  const isTop = point.values.slice(seriesIndex + 1).every((rest) => rest <= 0)
                  return (
                    <path
                      key={series[seriesIndex]?.label ?? seriesIndex}
                      d={barPath(left, top, barWidth, barHeight, isTop)}
                      fill={series[seriesIndex]?.color}
                    />
                  )
                })}
              </g>
            )
          })}
        </g>
      )}
    </ChartFrame>
  )
}

/** A bar anchored to the baseline, with rounded corners only on the free end. */
function barPath(x: number, y: number, width: number, height: number, roundTop: boolean): string {
  const radius = roundTop ? Math.min(CORNER, width / 2, height) : 0
  if (radius <= 0) {
    return `M${String(x)},${String(y)}h${String(width)}v${String(height)}h${String(-width)}z`
  }
  return [
    `M${String(x)},${String(y + height)}`,
    `V${String(y + radius)}`,
    `a${String(radius)},${String(radius)} 0 0 1 ${String(radius)},${String(-radius)}`,
    `h${String(width - radius * 2)}`,
    `a${String(radius)},${String(radius)} 0 0 1 ${String(radius)},${String(radius)}`,
    `V${String(y + height)}`,
    "z",
  ].join("")
}

export interface LineTimeChartProps {
  points: ChartPoint[]
  series: ChartSeries[]
  title: string
  unit?: string
  height?: number
  emptyLabel?: string
}

/** Lines for a continuous measure, with a crosshair marker per series on hover
 *  and a direct label on the last point of each. */
export function LineTimeChart({
  points,
  series,
  title,
  unit,
  height = 180,
  emptyLabel,
}: Readonly<LineTimeChartProps>) {
  const max = points.reduce(
    (acc, point) => Math.max(acc, ...point.values.map((value) => value || 0)),
    0,
  )

  return (
    <ChartFrame
      points={points}
      series={series}
      height={height}
      title={title}
      unit={unit}
      maxValue={max}
      emptyLabel={emptyLabel}
      tooltip={(index) => (
        <ul className={tooltipList}>
          {series.map((entry, seriesIndex) => (
            <li key={entry.label} className={tooltipRow}>
              <span
                aria-hidden
                className={cx(swatch, swatchRound)}
                style={{ backgroundColor: entry.color }}
              />
              <span className={tooltipLabel}>{entry.label}</span>
              <span className={tooltipValue}>
                {formatTick(points[index]?.values[seriesIndex] ?? 0)}
                {unit ? ` ${unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    >
      {(chartFrame) => (
        <g>
          {series.map((entry, seriesIndex) => {
            const path = points
              .map((point, index) => {
                const value = point.values[seriesIndex] ?? 0
                return `${index === 0 ? "M" : "L"}${String(chartFrame.x(index))},${String(chartFrame.y(value))}`
              })
              .join("")
            const lastIndex = points.length - 1
            const lastValue = points[lastIndex]?.values[seriesIndex] ?? 0

            return (
              <g key={entry.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* Direct label on the final point: with four series or fewer,
                    identity should not depend on crossing to the legend. */}
                {lastIndex >= 0 && lastValue > 0 && (
                  <text
                    x={chartFrame.x(lastIndex) + 4}
                    y={chartFrame.y(lastValue) - 5}
                    textAnchor="end"
                    className={axisText}
                  >
                    {entry.label}
                  </text>
                )}
                {chartFrame.hovered !== null && (
                  <circle
                    cx={chartFrame.x(chartFrame.hovered)}
                    cy={chartFrame.y(points[chartFrame.hovered]?.values[seriesIndex] ?? 0)}
                    r={4}
                    fill={entry.color}
                    // A surface ring keeps overlapping markers separable.
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )}
              </g>
            )
          })}
        </g>
      )}
    </ChartFrame>
  )
}

const note = css`
  color: var(--muted-foreground);
  margin-top: 8px;
  font-size: 11px;
`

/** A compact caption under a chart, for the notes that qualify what it shows. */
export function ChartNote({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <p className={cx(note, className)}>{children}</p>
}
