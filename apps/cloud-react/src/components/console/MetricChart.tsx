import { useId } from "react"

import { cn } from "@/lib/utils"

interface MetricChartProps {
    /** Raw series values; rendered left → right, oldest first. */
    data: number[]
    /** Stroke/area colour — any CSS colour (defaults to currentColor). */
    color?: string
    /** Unit suffix appended to the gridline labels (defaults to "%"). */
    unit?: string
    /** Pixel height of the chart panel. */
    height?: number
    /** Fixed Y-axis lower bound — when paired with `max`, the domain is locked. */
    min?: number
    /** Fixed Y-axis upper bound. */
    max?: number
    /**
     * Optional second line drawn on the SAME Y-domain as `data` (stroke only, no
     * area fill). Its values are folded into the auto-scale domain so both lines
     * stay on-screen. Used for paired series like PSI "some" + "full".
     */
    overlay?: { data: number[]; color: string }
    className?: string
}

// The SVG draws in a 0..100 user-unit box and is stretched to fill its (padded)
// container via preserveAspectRatio="none"; gridlines/labels live in HTML so the
// text stays crisp and un-stretched.
const VIEW_W = 100
const VIEW_H = 100
const GRID_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const

/**
 * Dependency-free SVG area chart — a richer, full-width sibling of Sparkline.
 * Shares its gradient-fill + glowing-stroke technique, adds a fixed Y domain,
 * subtle horizontal gridlines and faint value labels for the dark glass UI.
 */
export function MetricChart({
    data,
    color = "currentColor",
    unit = "%",
    height = 160,
    min,
    max,
    overlay,
    className,
}: Readonly<MetricChartProps>) {
    const gradientId = useId()

    if (data.length < 2) {
        return <div className={className} style={{ height }} aria-hidden />
    }

    // The overlay (if any) shares the domain so both lines stay on-screen. We keep
    // it only when its length matches `data`, so a single truthy check gates use.
    const overlayColor = overlay?.color ?? "currentColor"
    const overlayData =
        overlay?.data.length === data.length ? overlay.data : undefined
    const domainValues = overlayData ? [...data, ...overlayData] : data
    const lo = min ?? Math.min(...domainValues)
    const hi = max ?? Math.max(...domainValues)
    const span = hi - lo || 1
    const step = VIEW_W / (data.length - 1)

    const project = (values: number[]) =>
        values.map((value, i) => {
            const x = i * step
            const y = (1 - (value - lo) / span) * VIEW_H
            return [x, y] as const
        })

    const toPath = (pts: readonly (readonly [number, number])[]) =>
        pts
            .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
            .join(" ")

    const points = project(data)
    const line = toPath(points)
    const overlayLine = overlayData ? toPath(project(overlayData)) : null
    const fill = `${line} L${String(VIEW_W)} ${String(VIEW_H)} L0 ${String(VIEW_H)} Z`

    return (
        <div className={cn("relative w-full", className)} style={{ height }} aria-hidden>
            {GRID_FRACTIONS.map((f) => {
                const value = hi - f * span
                return (
                    <div
                        key={f}
                        className="absolute inset-x-0 flex -translate-y-1/2 items-center"
                        style={{ top: `${String(f * 100)}%` }}
                    >
                        <span className="w-8 shrink-0 pr-1.5 text-right text-[11px] text-muted-foreground/60">
                            {Math.round(value)}
                            {unit}
                        </span>
                        <div className="h-px flex-1 bg-border-glass/60" />
                    </div>
                )
            })}
            <div className="absolute inset-0 pl-8">
                <svg
                    viewBox={`0 0 ${String(VIEW_W)} ${String(VIEW_H)}`}
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                    aria-hidden
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <path d={fill} fill={`url(#${gradientId})`} stroke="none" />
                    <path
                        d={line}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        style={{ filter: `drop-shadow(0 1px 4px ${color}cc)` }}
                    />
                    {overlayLine != null && (
                        <path
                            d={overlayLine}
                            fill="none"
                            stroke={overlayColor}
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ filter: `drop-shadow(0 1px 4px ${overlayColor}cc)` }}
                        />
                    )}
                </svg>
            </div>
        </div>
    )
}
