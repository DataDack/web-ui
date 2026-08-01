// Section 3 — "Condition".
//
// The rule reads as one sentence with the controls sitting inside it, so nobody
// has to assemble "datapoints to alarm" and "evaluation periods" into meaning in
// their head. Underneath, the same rule is replayed over the last 24 hours of
// stored buckets using the evaluator's own M-of-N logic: the honest answer to
// "will this page me every ten minutes?".

import { useMemo, useState } from "react"

import { ChevronDown } from "lucide-react"
import type { UseFormRegister } from "react-hook-form"

import { MetricChart } from "@/components/console"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { Badge } from "@datadack/serverless-ui"

import { simulateAlarm, windowCount } from "./backtest"
import { numeric, type FormValues, type PeriodSeconds } from "./schema"
import { useMetricsQuery } from "../../monitoring.hooks"
import {
  OPERATOR_OPTIONS,
  PERIOD_OPTIONS,
  SERIES_COLOR_ALARM,
  SERIES_COLOR_OK,
  THRESHOLD_COLOR,
  TREAT_MISSING_OPTIONS,
  periodLabel,
} from "../../monitoring.meta"
import type {
  AlarmComparisonOperator,
  AlarmStatistic,
  MetricsWindowQuery,
  TreatMissingData,
} from "../../monitoring.types"

const BACKTEST_WINDOW_MS = 24 * 60 * 60 * 1000

const STATISTICS: readonly AlarmStatistic[] = ["avg", "sum", "min", "max", "p95", "p99"]

const INLINE_TRIGGER_CLASS = "h-8 w-auto gap-1 border-dashed px-2 text-[13px]"
const INLINE_NUMBER_CLASS = "h-8 w-20 px-2 text-center font-mono text-[13px]"
const ERROR_CLASS = "text-[11px] text-destructive"

/**
 * What the replay is allowed to claim.
 *
 * With nothing stored, "would have fired 0 times" reads as "this rule is quiet"
 * when the truth is "there is nothing to judge it against" — and that is the
 * state every load-balancer and instance signal is in until the metric adapters
 * ship. Say so instead of implying a verdict.
 */
function replaySentence(
  stored: number,
  periods: number,
  fullWindows: number,
  window: number,
  firings: number,
): string {
  if (stored === 0) {
    return "No datapoints stored for this signal yet, so there is nothing to replay this rule against."
  }
  if (fullWindows === 0) {
    return `Only ${String(periods)} periods of history — this rule needs ${String(window)} before it can decide anything.`
  }
  return `This rule would have fired ${String(firings)} ${firings === 1 ? "time" : "times"} in the last 24 hours.`
}

export function ConditionSection({
  namespace,
  dimensions,
  metric,
  metricLabel,
  unit,
  hasSignal,
  statistic,
  periodSeconds,
  operator,
  treatMissingData,
  threshold,
  datapointsToAlarm,
  evaluationPeriods,
  register,
  errors,
  onStatisticChange,
  onOperatorChange,
  onPeriodChange,
  onTreatMissingChange,
}: Readonly<{
  namespace: string
  dimensions: Record<string, string>
  /** Raw metric name — what the metrics query addresses. */
  metric: string
  /** Human label — what the sentence reads. */
  metricLabel: string
  unit: string
  hasSignal: boolean
  statistic: AlarmStatistic
  periodSeconds: PeriodSeconds
  operator: AlarmComparisonOperator
  treatMissingData: TreatMissingData
  threshold: number
  datapointsToAlarm: number
  evaluationPeriods: number
  register: UseFormRegister<FormValues>
  errors: {
    threshold?: string
    datapointsToAlarm?: string
    evaluationPeriods?: string
  }
  onStatisticChange: (value: AlarmStatistic) => void
  onOperatorChange: (value: AlarmComparisonOperator) => void
  onPeriodChange: (value: PeriodSeconds) => void
  onTreatMissingChange: (value: TreatMissingData) => void
}>) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const thresholdValue = numeric(threshold)
  const neededValue = numeric(datapointsToAlarm)
  const windowValue = numeric(evaluationPeriods)

  const query = useMemo<MetricsWindowQuery | null>(() => {
    if (!hasSignal || !namespace || !metric) return null
    return {
      namespace,
      metric,
      statistic,
      period: periodSeconds,
      dimensions,
      windowMs: BACKTEST_WINDOW_MS,
    }
  }, [hasSignal, namespace, metric, statistic, periodSeconds, dimensions])

  const metrics = useMetricsQuery(query)
  const buckets = useMemo(
    () => (metrics.data?.buckets ?? []).map((bucket) => bucket.value),
    [metrics.data],
  )
  const series = useMemo(
    () => buckets.filter((value): value is number => value !== null),
    [buckets],
  )

  const backtest = useMemo(
    () =>
      simulateAlarm(buckets, {
        operator,
        threshold: thresholdValue ?? 0,
        datapointsToAlarm: neededValue ?? 1,
        evaluationPeriods: windowValue ?? 1,
        treatMissingData,
      }),
    [buckets, operator, thresholdValue, neededValue, windowValue, treatMissingData],
  )

  const fullWindows = windowCount(buckets.length, windowValue ?? 1)
  const chartColor = backtest.wouldBeInAlarm ? SERIES_COLOR_ALARM : SERIES_COLOR_OK

  const replayNote = replaySentence(
    series.length,
    buckets.length,
    fullWindows,
    windowValue ?? 1,
    backtest.firings,
  )

  return (
    <div className="space-y-4">
      {/* The rule, as a sentence. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px] text-foreground">
        <span>Alert when the</span>
        <Select
          value={statistic}
          onValueChange={(value) => {
            onStatisticChange(value as AlarmStatistic)
          }}
        >
          <SelectTrigger className={INLINE_TRIGGER_CLASS} aria-label="Statistic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATISTICS.map((option) => (
              <SelectItem key={option} value={option} className="font-mono text-[13px]">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-medium">{metricLabel || "signal"}</span>
        <span>is</span>
        <Select
          value={operator}
          onValueChange={(value) => {
            onOperatorChange(value as AlarmComparisonOperator)
          }}
        >
          <SelectTrigger className={INLINE_TRIGGER_CLASS} aria-label="Direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="any"
          aria-label="Threshold"
          className={INLINE_NUMBER_CLASS}
          {...register("threshold")}
        />
        {unit && <span className="text-muted-foreground">{unit}</span>}
        <span>for</span>
        <Input
          type="number"
          min={1}
          aria-label="Periods that must breach"
          className={INLINE_NUMBER_CLASS}
          {...register("datapointsToAlarm")}
        />
        <span>of the last</span>
        <Input
          type="number"
          min={1}
          aria-label="Periods evaluated"
          className={INLINE_NUMBER_CLASS}
          {...register("evaluationPeriods")}
        />
        <span>periods of</span>
        <Select
          value={String(periodSeconds)}
          onValueChange={(value) => {
            onPeriodChange(Number(value) as PeriodSeconds)
          }}
        >
          <SelectTrigger className={INLINE_TRIGGER_CLASS} aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(errors.threshold ?? errors.datapointsToAlarm ?? errors.evaluationPeriods) && (
        <div className="space-y-0.5">
          {errors.threshold && <p className={ERROR_CLASS}>{errors.threshold}</p>}
          {errors.datapointsToAlarm && <p className={ERROR_CLASS}>{errors.datapointsToAlarm}</p>}
          {errors.evaluationPeriods && <p className={ERROR_CLASS}>{errors.evaluationPeriods}</p>}
        </div>
      )}

      {/* The same rule, replayed over real history. */}
      {!hasSignal && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
          Choose a signal above to see it charted against this threshold.
        </p>
      )}

      {hasSignal && (
        <div className="space-y-2 rounded-xl border border-border-glass bg-muted/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-muted-foreground">
              Last 24 hours at {periodLabel(periodSeconds)} · threshold in amber
            </p>
            {backtest.wouldBeInAlarm && (
              <Badge
                variant="outline"
                className="shrink-0 gap-1.5 font-mono text-[11px] text-status-danger bg-status-danger-bg border-status-danger/25"
              >
                <span className="size-1.5 rounded-full bg-status-danger" />
                Would be in alarm now
              </Badge>
            )}
          </div>

          {series.length < 2 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              {metrics.isLoading
                ? "Loading the last 24 hours…"
                : "No datapoints stored for this signal yet — nothing to chart."}
            </p>
          ) : (
            <MetricChart
              data={series}
              color={chartColor}
              unit={unit}
              height={180}
              overlay={{
                data: series.map(() => thresholdValue ?? 0),
                color: THRESHOLD_COLOR,
              }}
            />
          )}

          <p className="text-[12px] text-muted-foreground">{replayNote}</p>
        </div>
      )}

      {/* Advanced — gaps policy. Visible, just folded away by default. */}
      <div className="border-t border-border-glass pt-3">
        <button
          type="button"
          onClick={() => {
            setAdvancedOpen((open) => !open)
          }}
          aria-expanded={advancedOpen}
          className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", advancedOpen && "rotate-180")}
          />
          Advanced — if data stops arriving
        </button>
        {advancedOpen && (
          <div
            role="radiogroup"
            aria-label="If data stops arriving"
            className="mt-2.5 grid gap-2 sm:grid-cols-2"
          >
            {TREAT_MISSING_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                role="radio"
                aria-checked={option.value === treatMissingData}
                onClick={() => {
                  onTreatMissingChange(option.value)
                }}
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-all",
                  option.value === treatMissingData
                    ? "border-brand-gold bg-brand-gold/5"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <span className="block text-[13px] font-medium text-foreground">
                  {option.label}
                </span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
