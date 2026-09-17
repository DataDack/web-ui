/**
 * Pure helpers shared by MetricChart and Sparkline: "nice" axis ticks, value
 * formatting that stays readable from 0.004 to 4,000,000, time labels that
 * adapt to the window, and a monotone curve that never overshoots the data.
 */

export type TimeInput = number | string | Date

/** Normalises a timestamp to epoch ms. Numbers below 1e12 are unix seconds. */
export function toEpochMs(input: TimeInput): number {
  if (input instanceof Date) return input.getTime()
  if (typeof input === "number") return input < 1e12 ? input * 1000 : input
  return new Date(input).getTime()
}

const NICE_FRACTIONS = [1, 2, 2.5, 5, 10] as const

/** Rounds a raw step up to 1/2/2.5/5 × 10ⁿ. */
export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const fraction = NICE_FRACTIONS.find((candidate) => normalized <= candidate + 1e-9) ?? 10
  return fraction * magnitude
}

/** Decimal places needed to print every multiple of `step` exactly. */
export function stepDecimals(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0
  for (let decimals = 0; decimals <= 6; decimals++) {
    const scaled = step * 10 ** decimals
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return decimals
  }
  return 6
}

export interface YScale {
  lo: number
  hi: number
  ticks: number[]
  decimals: number
}

/**
 * Builds a readable Y domain. Fixed bounds are honoured exactly; free bounds
 * are padded and snapped outward to a nice step. A series that sits well above
 * zero is not dragged down to a zero baseline (it would flatten into a line),
 * while a non-negative series that approaches zero is anchored at zero.
 */
export function buildYScale(
  values: readonly number[],
  opts: { min?: number; max?: number; targetTicks?: number } = {},
): YScale {
  const finite = values.filter((value) => Number.isFinite(value))
  const targetTicks = Math.max(2, opts.targetTicks ?? 4)

  let dataLo = finite.length > 0 ? Math.min(...finite) : 0
  let dataHi = finite.length > 0 ? Math.max(...finite) : 0
  if (opts.min !== undefined) dataLo = Math.min(dataLo, opts.min)
  if (opts.max !== undefined) dataHi = Math.max(dataHi, opts.max)

  if (dataHi === dataLo) {
    // A flat series still needs a band to sit in, centred on its value.
    const pad = dataHi === 0 ? 1 : Math.abs(dataHi) * 0.1
    dataLo = opts.min ?? (dataLo >= 0 && dataLo - pad < 0 ? 0 : dataLo - pad)
    dataHi = opts.max ?? dataHi + pad
  }

  let lo = opts.min ?? dataLo
  let hi = opts.max ?? dataHi
  if (opts.min === undefined) {
    if (dataLo >= 0 && dataLo <= (dataHi - dataLo) * 0.5) lo = 0
    else lo = dataLo - (dataHi - dataLo) * 0.08
  }
  if (opts.max === undefined) hi = dataHi + (dataHi - lo) * 0.08

  const step = niceStep((hi - lo) / targetTicks)
  if (opts.min === undefined) lo = Math.floor(lo / step + 1e-9) * step
  if (opts.max === undefined) hi = Math.ceil(hi / step - 1e-9) * step
  if (hi <= lo) hi = lo + step

  const ticks: number[] = []
  const first = Math.ceil(lo / step - 1e-9) * step
  for (let tick = first; tick <= hi + step * 1e-6; tick += step) {
    ticks.push(Math.abs(tick) < step * 1e-9 ? 0 : tick)
    if (ticks.length > 12) break
  }
  return { lo, hi, ticks, decimals: stepDecimals(step) }
}

/** Compact axis label: 1.5k, 2M, 0.25 — at the precision the step needs. */
export function formatTick(value: number, decimals: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${trimZeros((value / 1_000_000).toFixed(1))}M`
  if (abs >= 10_000) return `${trimZeros((value / 1000).toFixed(1))}k`
  return trimZeros(value.toFixed(Math.min(decimals, 3)))
}

/** Human-readable reading for tooltips: about three significant digits. */
export function formatReading(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${trimZeros((value / 1_000_000).toFixed(2))}M`
  if (abs >= 10_000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (abs >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
  if (abs >= 10) return trimZeros(value.toFixed(1))
  if (abs >= 1) return trimZeros(value.toFixed(2))
  if (abs === 0) return "0"
  return trimZeros(value.toPrecision(2))
}

function trimZeros(text: string): string {
  if (!text.includes(".")) return text
  let end = text.length
  while (text[end - 1] === "0") end--
  if (text[end - 1] === ".") end--
  return text.slice(0, end)
}

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

/** Axis label for a timestamp, sized to how wide the window is. */
export function formatAxisTime(ms: number, spanMs: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return ""
  if (spanMs <= 2 * DAY_MS) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }
  if (spanMs <= 120 * DAY_MS) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

/** Tooltip label for a timestamp: always includes the clock, and the date once
 *  the window can span more than one day. */
export function formatTooltipTime(ms: number, spanMs: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return ""
  const clock = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    ...(spanMs <= 2 * HOUR_MS ? { second: "2-digit" } : {}),
  })
  if (spanMs <= 20 * HOUR_MS) return clock
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  return `${day}, ${clock}`
}

/** Indices for ~`count` evenly spaced labels, always including both ends. */
export function labelIndices(length: number, count: number): number[] {
  if (length <= 0) return []
  if (length === 1 || count <= 1) return [length - 1]
  const slots = Math.min(count, length)
  const indices = new Set<number>()
  for (let slot = 0; slot < slots; slot++) {
    indices.add(Math.round((slot * (length - 1)) / (slots - 1)))
  }
  return [...indices]
}

/**
 * Monotone cubic (Fritsch–Carlson) path through the points. Unlike a Catmull-Rom
 * curve it never overshoots, so a spike to 100% is never drawn as 104%.
 */
export function monotonePath(points: readonly (readonly [number, number])[]): string {
  const n = points.length
  if (n === 0) return ""
  const fmt = (value: number) => value.toFixed(2)
  if (n < 3) {
    return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`).join(" ")
  }

  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    slopes.push(x1 === x0 ? 0 : (y1 - y0) / (x1 - x0))
  }

  const tangents: number[] = [slopes[0]]
  for (let i = 1; i < n - 1; i++) {
    const left = slopes[i - 1]
    const right = slopes[i]
    tangents.push(left * right <= 0 ? 0 : (left + right) / 2)
  }
  tangents.push(slopes[n - 2])

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
      continue
    }
    const a = tangents[i] / slopes[i]
    const b = tangents[i + 1] / slopes[i]
    const magnitude = a * a + b * b
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude)
      tangents[i] = scale * a * slopes[i]
      tangents[i + 1] = scale * b * slopes[i]
    }
  }

  let path = `M${fmt(points[0][0])} ${fmt(points[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const dx = (x1 - x0) / 3
    path += ` C${fmt(x0 + dx)} ${fmt(y0 + tangents[i] * dx)} ${fmt(x1 - dx)} ${fmt(y1 - tangents[i + 1] * dx)} ${fmt(x1)} ${fmt(y1)}`
  }
  return path
}
