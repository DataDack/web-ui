import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { cn } from "@datadack/common-ui"

import {
  buildYScale,
  formatAxisTime,
  formatReading,
  formatTick,
  formatTooltipTime,
  labelIndices,
  monotonePath,
  toEpochMs,
  type TimeInput,
} from "./chart-scale"
import { useElementWidth } from "./useElementWidth"

export interface MetricChartOverlay {
  data: number[]
  color: string
  /** Name shown in the tooltip; defaults to "Threshold" when dashed. */
  label?: string
  /** Draw as a dashed reference line (thresholds, limits) instead of a series. */
  dashed?: boolean
}

interface MetricChartProps {
  /** Raw series values; rendered left → right, oldest first. */
  data: number[]
  /**
   * One timestamp per value (unix seconds, epoch ms, ISO string or Date). When
   * present the chart draws a time axis and the tooltip names the moment.
   */
  timestamps?: TimeInput[]
  /** Name of the primary series in the tooltip. */
  label?: string
  /** Stroke/area colour — any CSS colour (defaults to currentColor). */
  color?: string
  /** Unit suffix for readings. Short units ("%") are also printed on the axis. */
  unit?: string
  /** Overrides how a reading is printed in the tooltip (unit included). */
  formatValue?: (value: number) => string
  /** Overrides how a timestamp is printed on the axis and in the tooltip. */
  formatTime?: (epochMs: number) => string
  /** Pixel height of the chart panel. */
  height?: number
  /** Fixed Y-axis lower bound. */
  min?: number
  /** Fixed Y-axis upper bound. */
  max?: number
  /**
   * Optional second line drawn on the SAME Y-domain as `data` (stroke only, no
   * area fill). Its values are folded into the auto-scale domain so both lines
   * stay on-screen. Used for paired series like PSI "some" + "full".
   */
  overlay?: MetricChartOverlay
  className?: string
}

const PAD_TOP = 10
const PAD_RIGHT = 12
const TIME_AXIS_HEIGHT = 22
const BARE_AXIS_HEIGHT = 6
const MIN_LABEL_GUTTER = 28
/** Horizontal room one time label needs before another fits. */
const TIME_LABEL_SPACING = 96
const TOOLTIP_MIN_WIDTH = 140

interface Selection {
  from: number
  to: number
}

interface DragState {
  anchor: number
  pointerType: string
}

interface Readout {
  x: number
  /** Spoken text; also the slider's aria-valuetext. */
  text: string
  content: ReactNode
}

function timeAnchor(i: number, count: number): "start" | "end" | "middle" {
  if (i === 0) return "start"
  if (i === count - 1) return "end"
  return "middle"
}

function signed(value: number, print: (magnitude: number) => string): string {
  return (value >= 0 ? "+" : "−") + print(Math.abs(value))
}

/**
 * Interactive SVG area chart for time series.
 *
 * - Hover (mouse) or drag a finger across (touch) to scrub: a crosshair
 *   snaps to the nearest sample and a tooltip prints every series' value.
 * - Click-drag with a mouse to select a window: the tooltip then summarises
 *   min / avg / max and the change across it. A click or Esc clears it.
 * - Focus it and use ←/→ (Shift for bigger jumps), Home/End to step through samples.
 *
 * Rendered at real pixel size (measured with ResizeObserver) so labels and
 * strokes stay crisp, with a monotone curve that never overshoots the data.
 */
export function MetricChart({
  data,
  timestamps,
  label = "Value",
  color = "currentColor",
  unit = "%",
  formatValue,
  formatTime,
  height = 160,
  min,
  max,
  overlay,
  className,
}: Readonly<MetricChartProps>) {
  const rawId = useId()
  const gradientId = `metric-fill-${rawId.replace(/[^\w-]/g, "")}`
  const [containerRef, width] = useElementWidth()
  const [active, setActive] = useState<number | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const n = data.length
  if (n < 2) {
    return <div className={className} style={{ height }} aria-hidden />
  }

  // The overlay shares the domain so both lines stay on-screen. It is used only
  // when its length matches `data`, so indices line up sample for sample.
  const overlayData = overlay?.data.length === n ? overlay.data : undefined
  const overlayLabel = overlay?.label ?? (overlay?.dashed ? "Threshold" : "Series 2")
  const parsedTimes = timestamps?.length === n ? timestamps.map(toEpochMs) : undefined
  const times = parsedTimes?.every((ms) => Number.isFinite(ms)) ? parsedTimes : undefined
  const spanMs = times ? times[n - 1] - times[0] : 0

  const readValue = formatValue ?? ((value: number) => `${formatReading(value)}${unit}`)
  const axisTime = (ms: number) => (formatTime ? formatTime(ms) : formatAxisTime(ms, spanMs))
  const momentLabel = (ms: number) => (formatTime ? formatTime(ms) : formatTooltipTime(ms, spanMs))
  // Only short, unspaced units ("%", "ms") fit beside an axis tick.
  const axisUnit = unit.length <= 2 && !unit.startsWith(" ") ? unit : ""

  const plotTop = PAD_TOP
  const plotHeight = Math.max(height - PAD_TOP - (times ? TIME_AXIS_HEIGHT : BARE_AXIS_HEIGHT), 1)
  const plotBottom = plotTop + plotHeight
  const scale = buildYScale(overlayData ? [...data, ...overlayData] : data, {
    min,
    max,
    targetTicks: plotHeight < 120 ? 3 : 4,
  })
  const tickLabels = scale.ticks.map((tick) => formatTick(tick, scale.decimals) + axisUnit)
  const longestTick = Math.max(...tickLabels.map((text) => text.length))
  const plotLeft = Math.max(MIN_LABEL_GUTTER, longestTick * 6.5 + 12)
  const plotWidth = Math.max(width - plotLeft - PAD_RIGHT, 1)
  const span = scale.hi - scale.lo || 1

  const xAt = (index: number) => plotLeft + (index / (n - 1)) * plotWidth
  const yAt = (value: number) => {
    const clamped = Math.min(Math.max(value, scale.lo), scale.hi)
    return plotTop + (1 - (clamped - scale.lo) / span) * plotHeight
  }
  const project = (values: number[]) => values.map((value, i) => [xAt(i), yAt(value)] as const)

  const linePath = monotonePath(project(data))
  const areaPath = `${linePath} L${xAt(n - 1).toFixed(2)} ${String(plotBottom)} L${plotLeft.toFixed(2)} ${String(plotBottom)} Z`
  const overlayPath = overlayData ? monotonePath(project(overlayData)) : null

  const activeIndex = active !== null && active < n ? active : null
  const range = selection && selection.to < n && selection.to > selection.from ? selection : null

  const indexFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const offset = event.clientX - bounds.left - plotLeft
    const index = Math.round((offset / plotWidth) * (n - 1))
    return Math.min(Math.max(index, 0), n - 1)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    const index = indexFromPointer(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { anchor: index, pointerType: event.pointerType }
    setActive(index)
    // A fresh mouse press starts a new selection (and a plain click clears one).
    if (event.pointerType === "mouse") setSelection(null)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const index = indexFromPointer(event)
    setActive(index)
    const drag = dragRef.current
    if (drag?.pointerType === "mouse" && index !== drag.anchor) {
      setSelection({ from: Math.min(drag.anchor, index), to: Math.max(drag.anchor, index) })
    }
  }

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    // Touch readouts stay pinned after the finger lifts; blur clears them.
    if (event.pointerType === "mouse" && !dragRef.current) setActive(null)
  }

  const clearReadout = () => {
    dragRef.current = null
    setActive(null)
    setSelection(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (activeIndex === null && range === null) return
      event.preventDefault()
      clearReadout()
      return
    }
    const jump = event.shiftKey ? Math.max(1, Math.round(n / 10)) : 1
    const keyTargets: Partial<Record<string, number>> = {
      ArrowLeft: Math.max(0, (activeIndex ?? n) - jump),
      ArrowRight: activeIndex === null ? n - 1 : Math.min(n - 1, activeIndex + jump),
      Home: 0,
      End: n - 1,
    }
    const next = keyTargets[event.key]
    if (next === undefined) return
    event.preventDefault()
    setSelection(null)
    setActive(next)
  }

  const rangeReadout = (sel: Selection): Readout => {
    const slice = data.slice(sel.from, sel.to + 1)
    const low = Math.min(...slice)
    const high = Math.max(...slice)
    const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length
    const delta = slice[slice.length - 1] - slice[0]
    const pctText =
      slice[0] === 0 ? "" : ` (${signed((delta / Math.abs(slice[0])) * 100, formatReading)}%)`
    const heading = times
      ? `${momentLabel(times[sel.from])} → ${momentLabel(times[sel.to])}`
      : `${String(slice.length)} samples`
    return {
      x: (xAt(sel.from) + xAt(sel.to)) / 2,
      text: `${label} ${heading}: min ${readValue(low)}, average ${readValue(avg)}, max ${readValue(high)}`,
      content: (
        <>
          <p className="mb-1 font-mono text-[10px] text-muted-foreground">{heading}</p>
          <TooltipRow color={color} label={`${label} min`} value={readValue(low)} />
          <TooltipRow color={color} label={`${label} avg`} value={readValue(avg)} />
          <TooltipRow color={color} label={`${label} max`} value={readValue(high)} />
          <TooltipRow label="Change" value={signed(delta, readValue) + pctText} />
        </>
      ),
    }
  }

  const pointReadout = (index: number): Readout => {
    const heading = times ? momentLabel(times[index]) : null
    const overlayText = overlayData ? `, ${overlayLabel} ${readValue(overlayData[index])}` : ""
    const prefix = heading ? `${heading}: ` : ""
    return {
      x: xAt(index),
      text: `${prefix}${label} ${readValue(data[index])}${overlayText}`,
      content: (
        <>
          {heading && <p className="mb-1 font-mono text-[10px] text-muted-foreground">{heading}</p>}
          <TooltipRow color={color} label={label} value={readValue(data[index])} />
          {overlayData && overlay && (
            <TooltipRow
              color={overlay.color}
              dashed={overlay.dashed}
              label={overlayLabel}
              value={readValue(overlayData[index])}
            />
          )}
        </>
      ),
    }
  }

  let readout: Readout | null = null
  if (range) readout = rangeReadout(range)
  else if (activeIndex !== null) readout = pointReadout(activeIndex)

  const timeLabelCount = Math.max(2, Math.floor(plotWidth / TIME_LABEL_SPACING) + 1)
  const timeTicks = times ? labelIndices(n, timeLabelCount) : []
  const latest = data[n - 1]
  const summary = `${label}: latest ${readValue(latest)}, min ${readValue(Math.min(...data))}, max ${readValue(Math.max(...data))}. Use arrow keys to inspect values.`
  const tooltipStyle =
    readout && readout.x > width * 0.6
      ? { right: Math.max(width - readout.x + 12, 0) }
      : { left: Math.min((readout?.x ?? 0) + 12, Math.max(width - TOOLTIP_MIN_WIDTH, 0)) }

  return (
    // Scrubbed like a slider: pointer, touch and arrow keys move the readout
    // across samples, and assistive tech hears the value text.
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label={summary}
      aria-valuemin={0}
      aria-valuemax={n - 1}
      aria-valuenow={activeIndex ?? n - 1}
      aria-valuetext={readout?.text ?? `${label} ${readValue(latest)}`}
      className={cn(
        "relative w-full cursor-crosshair touch-pan-y select-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
      style={{ height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => {
        dragRef.current = null
      }}
      onPointerCancel={() => {
        // The browser took the gesture over (vertical page scroll) — let it go.
        dragRef.current = null
        setActive(null)
      }}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onBlur={clearReadout}
    >
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={plotTop}
              x2="0"
              y2={plotBottom}
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {scale.ticks.map((tick, i) => (
            <g key={tick}>
              <line
                x1={plotLeft}
                x2={plotLeft + plotWidth}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="var(--border-glass)"
                strokeOpacity={tick === scale.lo ? 1 : 0.6}
                strokeDasharray={tick === scale.lo ? undefined : "2 4"}
              />
              <text
                x={plotLeft - 8}
                y={yAt(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--muted-foreground)"
                fillOpacity={0.75}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {tickLabels[i]}
              </text>
            </g>
          ))}

          {times &&
            timeTicks.map((index, i) => (
              <text
                key={index}
                x={xAt(index)}
                y={height - 5}
                textAnchor={timeAnchor(i, timeTicks.length)}
                fontSize={11}
                fill="var(--muted-foreground)"
                fillOpacity={0.75}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {axisTime(times[index])}
              </text>
            ))}

          {range && (
            <rect
              x={xAt(range.from)}
              y={plotTop}
              width={xAt(range.to) - xAt(range.from)}
              height={plotHeight}
              fill={color}
              fillOpacity={0.1}
              stroke={color}
              strokeOpacity={0.35}
              strokeDasharray="3 3"
            />
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 1px 3px color-mix(in srgb, ${color} 55%, transparent))`,
            }}
          />
          {overlayPath !== null && overlay && (
            <path
              d={overlayPath}
              fill="none"
              stroke={overlay.color}
              strokeWidth={overlay.dashed ? 1.5 : 1.75}
              strokeDasharray={overlay.dashed ? "6 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {activeIndex === null && !range && (
            <circle
              cx={xAt(n - 1)}
              cy={yAt(latest)}
              r={3.5}
              fill={color}
              stroke="var(--card)"
              strokeWidth={1.5}
            />
          )}

          {activeIndex !== null && (
            <g>
              <line
                x1={xAt(activeIndex)}
                x2={xAt(activeIndex)}
                y1={plotTop}
                y2={plotBottom}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.55}
                strokeDasharray="3 3"
              />
              {overlayData && overlay && !overlay.dashed && (
                <circle
                  cx={xAt(activeIndex)}
                  cy={yAt(overlayData[activeIndex])}
                  r={4}
                  fill={overlay.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              )}
              <circle
                cx={xAt(activeIndex)}
                cy={yAt(data[activeIndex])}
                r={4.5}
                fill={color}
                stroke="var(--card)"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
      )}

      {readout !== null && width > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 z-10 min-w-32 rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg backdrop-blur-sm"
          style={tooltipStyle}
        >
          {readout.content}
        </div>
      )}
    </div>
  )
}

function TooltipRow({
  color,
  dashed,
  label,
  value,
}: Readonly<{ color?: string; dashed?: boolean; label: string; value: string }>) {
  let swatch = <span aria-hidden className="w-2.5 shrink-0" />
  if (color && dashed) {
    swatch = (
      <span
        aria-hidden
        className="h-0 w-2.5 shrink-0 border-t-2 border-dashed"
        style={{ borderColor: color }}
      />
    )
  } else if (color) {
    swatch = (
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    )
  }
  return (
    <div className="flex items-center gap-2 leading-5">
      {swatch}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-mono tabular-nums text-foreground">{value}</span>
    </div>
  )
}
