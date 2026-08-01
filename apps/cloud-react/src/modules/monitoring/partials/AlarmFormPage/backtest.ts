// Rule replay — "would this alarm have fired?"
//
// This is not a mock. It runs the same M-of-N decision the Go evaluator runs
// (apps/monitoring/alerts/service/evaluator_core.go: ComputeState) over the
// buckets the metrics API already stored, so the number under the chart is the
// number the evaluator would have produced had the alarm existed.
//
// One deliberate simplification: the evaluator decides one window per tick and
// records a transition; here we slide the window across the whole range and
// count OK -> ALARM edges. For a fixed rule over fixed history those agree.

import type { AlarmComparisonOperator, TreatMissingData } from "../../monitoring.types"

const COMPARATORS: Record<AlarmComparisonOperator, (value: number, threshold: number) => boolean> =
  {
    gt: (value, threshold) => value > threshold,
    gte: (value, threshold) => value >= threshold,
    lt: (value, threshold) => value < threshold,
    lte: (value, threshold) => value <= threshold,
  }

/** Does one datapoint breach the threshold? Mirrors `breachesThreshold` in Go. */
export function breaches(
  operator: AlarmComparisonOperator,
  value: number,
  threshold: number,
): boolean {
  return COMPARATORS[operator](value, threshold)
}

export interface BacktestRule {
  operator: AlarmComparisonOperator
  threshold: number
  datapointsToAlarm: number
  evaluationPeriods: number
  treatMissingData: TreatMissingData
}

export interface BacktestResult {
  /** OK -> ALARM edges across the replayed range. */
  firings: number
  /** Verdict of the most recent full window. */
  wouldBeInAlarm: boolean
  /** Bucket indexes that count as breaching, for highlighting. */
  breachingIndexes: number[]
}

/**
 * Replay `rule` over `buckets` (oldest first; `null` is a real gap).
 *
 * A gap counts as breaching only under the "breaching" missing-data policy —
 * every other policy treats it as no evidence either way, exactly as
 * ComputeState does.
 */
export function simulateAlarm(
  buckets: readonly (number | null)[],
  rule: BacktestRule,
): BacktestResult {
  const gapBreaches = rule.treatMissingData === "breaching"
  const breaching = buckets.map((value) =>
    value === null ? gapBreaches : breaches(rule.operator, value, rule.threshold),
  )
  const breachingIndexes = breaching.flatMap((hit, index) => (hit ? [index] : []))

  const window = Math.max(1, Math.trunc(rule.evaluationPeriods))
  const needed = Math.max(1, Math.trunc(rule.datapointsToAlarm))

  let firings = 0
  let inAlarm = false
  let wouldBeInAlarm = false

  for (let start = 0; start + window <= breaching.length; start += 1) {
    let count = 0
    for (let offset = 0; offset < window; offset += 1) {
      if (breaching[start + offset]) count += 1
    }
    const alarming = count >= needed
    if (alarming && !inAlarm) firings += 1
    inAlarm = alarming
    wouldBeInAlarm = alarming
  }

  return { firings, wouldBeInAlarm, breachingIndexes }
}

/** How many full windows the range supports — 0 means "not enough history". */
export function windowCount(bucketCount: number, evaluationPeriods: number): number {
  const window = Math.max(1, Math.trunc(evaluationPeriods))
  return Math.max(0, bucketCount - window + 1)
}
