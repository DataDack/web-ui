import { useId, useState, type PointerEvent } from "react"

import { cn } from "@datadack/common-ui"

import {
  formatReading,
  formatTooltipTime,
  monotonePath,
  toEpochMs,
  type TimeInput,
} from "./chart-scale"

interface SparklineProps {
  /** Raw series values; rendered left → right, auto-scaled to fit. */
  data: number[]
  /** Stroke colour — any CSS colour (defaults to currentColor). */
  color?: string
  /** Draw a soft gradient area under the line. */
  area?: boolean
  /** Line thickness in CSS px (kept constant via non-scaling-stroke). */
  strokeWidth?: number
  /** ViewBox height in user units; width is fixed at 100. */
  height?: number
  /** Soft neon glow beneath the line, tinted to `color`. */
  glow?: boolean
  /**
   * Hover / touch-scrub readout: a marker snaps to the nearest sample and a
   * small tooltip prints its value (and time, when `timestamps` is given).
   */
  interactive?: boolean
  /** One timestamp per value, shown in the interactive readout. */
  timestamps?: TimeInput[]
  /** Formats a reading in the interactive readout. */
  formatValue?: (value: number) => string
  className?: string
}

const VIEW_W = 100

/** Lightweight, dependency-free SVG sparkline / area chart. */
export function Sparkline({
  data,
  color = "currentColor",
  area = false,
  strokeWidth = 1.75,
  height = 32,
  glow = false,
  interactive = false,
  timestamps,
  formatValue = formatReading,
  className,
}: Readonly<SparklineProps>) {
  const rawId = useId()
  const gradientId = `spark-fill-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`
  const [active, setActive] = useState<number | null>(null)

  if (data.length < 2) {
    return <div className={className} aria-hidden />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  // 8% vertical breathing room so peaks/troughs aren't clipped.
  const pad = height * 0.08
  const usable = height - pad * 2
  const step = VIEW_W / (data.length - 1)

  const points = data.map((value, i) => {
    const x = i * step
    const y = pad + (1 - (value - min) / span) * usable
    return [x, y] as const
  })

  const line = monotonePath(points)
  const fill = `${line} L${String(VIEW_W)} ${String(height)} L0 ${String(height)} Z`

  const svg = (
    <svg
      viewBox={`0 0 ${String(VIEW_W)} ${String(height)}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", interactive ? "block h-full w-full" : className)}
      aria-hidden
    >
      {area && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {area && <path d={fill} fill={`url(#${gradientId})`} stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={
          glow
            ? { filter: `drop-shadow(0 1px 4px color-mix(in srgb, ${color} 80%, transparent))` }
            : undefined
        }
      />
      {interactive && active !== null && active < data.length && (
        <line
          x1={points[active][0]}
          x2={points[active][0]}
          y1={0}
          y2={height}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.5}
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )

  if (!interactive) return svg

  const indexAt = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 1
    return Math.min(Math.max(Math.round(ratio * (data.length - 1)), 0), data.length - 1)
  }

  const current = active !== null && active < data.length ? active : null
  const times = timestamps?.length === data.length ? timestamps.map(toEpochMs) : undefined
  const spanMs = times ? times[times.length - 1] - times[0] : 0
  const leftPct = current !== null ? (points[current][0] / VIEW_W) * 100 : 0
  const topPct = current !== null ? (points[current][1] / height) * 100 : 0
  // Keep the tooltip inside the card: hang it left of the marker near the right
  // edge, centre it mid-way, and let it run right near the left edge.
  let tooltipShift = ""
  if (leftPct > 60) tooltipShift = "-translate-x-full"
  else if (leftPct > 40) tooltipShift = "-translate-x-1/2"

  return (
    <div
      className={cn("relative cursor-crosshair touch-pan-y select-none", className)}
      onPointerMove={(event) => {
        setActive(indexAt(event))
      }}
      onPointerDown={(event) => {
        setActive(indexAt(event))
      }}
      onPointerLeave={() => {
        setActive(null)
      }}
      onPointerCancel={() => {
        setActive(null)
      }}
    >
      {svg}
      {current !== null && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
            style={{
              left: `${String(leftPct)}%`,
              top: `${String(topPct)}%`,
              backgroundColor: color,
            }}
          />
          <span
            className={cn(
              "pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-md border border-border bg-popover/95 px-2 py-1 text-[11px] text-popover-foreground shadow-md backdrop-blur-sm",
              tooltipShift,
            )}
            style={{ left: `${String(leftPct)}%` }}
          >
            {times && (
              <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">
                {formatTooltipTime(times[current], spanMs)}
              </span>
            )}
            <span className="font-mono tabular-nums">{formatValue(data[current])}</span>
          </span>
        </>
      )}
    </div>
  )
}
