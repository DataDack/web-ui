import { describe, expect, it } from "bun:test"

import {
  buildYScale,
  formatReading,
  formatTick,
  labelIndices,
  monotonePath,
  niceStep,
  toEpochMs,
} from "../src/components/console/chart-scale"
import { balanceSeries, trailingDayStarts } from "../src/modules/billing/billing.utils"

describe("niceStep", () => {
  it("rounds up to 1/2/2.5/5 × 10ⁿ", () => {
    expect(niceStep(0.7)).toBe(1)
    expect(niceStep(1.3)).toBe(2)
    expect(niceStep(2.2)).toBe(2.5)
    expect(niceStep(23)).toBe(25)
    expect(niceStep(0.031)).toBeCloseTo(0.05)
  })
})

describe("buildYScale", () => {
  it("keeps a locked percent domain with quarter ticks", () => {
    const scale = buildYScale([12, 40, 33], { min: 0, max: 100 })
    expect(scale.lo).toBe(0)
    expect(scale.hi).toBe(100)
    expect(scale.ticks).toEqual([0, 25, 50, 75, 100])
  })

  it("does not collapse small readings to zero labels", () => {
    const scale = buildYScale([0.01, 0.04, 0.02], { min: 0 })
    expect(scale.hi).toBeGreaterThanOrEqual(0.04)
    const labels = scale.ticks.map((tick) => formatTick(tick, scale.decimals))
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.some((label) => label !== "0")).toBe(true)
  })

  it("does not drag a high, narrow series down to a zero baseline", () => {
    const scale = buildYScale([940, 960, 955])
    expect(scale.lo).toBeGreaterThan(800)
    expect(scale.hi).toBeGreaterThanOrEqual(960)
  })

  it("anchors a series that approaches zero at zero", () => {
    const scale = buildYScale([2, 30, 12])
    expect(scale.lo).toBe(0)
    expect(scale.hi).toBeGreaterThanOrEqual(30)
  })

  it("gives a flat series a band to sit in", () => {
    const zero = buildYScale([0, 0, 0])
    expect(zero.hi).toBeGreaterThan(zero.lo)
    const flat = buildYScale([5, 5])
    expect(flat.lo).toBeLessThan(5)
    expect(flat.hi).toBeGreaterThan(5)
  })
})

describe("formatReading", () => {
  it("prints about three significant digits across magnitudes", () => {
    expect(formatReading(0)).toBe("0")
    expect(formatReading(0.0042)).toBe("0.0042")
    expect(formatReading(3.14159)).toBe("3.14")
    expect(formatReading(42.25)).toBe("42.3")
    expect(formatReading(2_500_000)).toBe("2.5M")
  })
})

describe("labelIndices", () => {
  it("always includes both ends and never duplicates", () => {
    expect(labelIndices(60, 5)).toEqual([0, 15, 30, 44, 59])
    expect(labelIndices(3, 10)).toEqual([0, 1, 2])
    expect(labelIndices(0, 4)).toEqual([])
  })
})

describe("toEpochMs", () => {
  it("accepts unix seconds, epoch ms and ISO strings", () => {
    expect(toEpochMs(1_700_000_000)).toBe(1_700_000_000_000)
    expect(toEpochMs(1_700_000_000_000)).toBe(1_700_000_000_000)
    expect(toEpochMs("2026-09-17T00:00:00Z")).toBe(Date.parse("2026-09-17T00:00:00Z"))
  })
})

describe("monotonePath", () => {
  it("never overshoots a spike", () => {
    const points = [
      [0, 100],
      [10, 100],
      [20, 0],
      [30, 100],
      [40, 100],
    ] as const
    const path = monotonePath(points)
    const numbers = path
      .replaceAll("M", " ")
      .replaceAll("C", " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map(Number)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(100)
  })
})

describe("billing chart series", () => {
  const now = Date.parse("2026-09-17T15:00:00Z")

  it("aligns day starts with the spend window", () => {
    const days = trailingDayStarts(3, now)
    expect(days).toEqual([
      Date.parse("2026-09-15"),
      Date.parse("2026-09-16"),
      Date.parse("2026-09-17"),
    ])
  })

  it("returns a flat, timestamped balance line when the window is empty", () => {
    const series = balanceSeries([], 50, 30, now)
    expect(series.map((p) => p.balance)).toEqual([50, 50])
    expect(series[1].t).toBe(now)
  })
})
