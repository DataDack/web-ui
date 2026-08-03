import { useId } from "react"

import { cn } from "@datadack/common-ui"

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
  className,
}: Readonly<SparklineProps>) {
  const gradientId = useId()

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

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ")
  const fill = `${line} L${String(VIEW_W)} ${String(height)} L0 ${String(height)} Z`

  return (
    <svg
      viewBox={`0 0 ${String(VIEW_W)} ${String(height)}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
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
        style={glow ? { filter: `drop-shadow(0 1px 4px ${color}cc)` } : undefined}
      />
    </svg>
  )
}
