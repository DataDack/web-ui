import type { ScheduleSummary } from "./schedule"

/**
 * The label functions `summaryText` needs. A structural type rather than a
 * reference to `FunctionDetailLabels` so `schedule.ts` and this file stay pure
 * of the label tree, and so a caller can pass any bundle with these members.
 */
export interface ScheduleSummaryLabels {
  everySeconds: (count: number) => string
  everyMinutes: (count: number) => string
  everyHours: (count: number) => string
  everyDays: (count: number) => string
  dailyAt: (time: string) => string
  hourly: string
  once: string
}

/**
 * A schedule in words: "every 5 minutes", "every day at 09:30 UTC".
 *
 * Split from the summary itself because plurals and word order are the
 * translator's business, not the parser's — the package carries no i18n, so the
 * console hands in the sentences and this only picks which one.
 */
export function summaryText(summary: ScheduleSummary, labels: ScheduleSummaryLabels): string {
  switch (summary.kind) {
    case "seconds":
      return labels.everySeconds(summary.value)
    case "minutes":
      return labels.everyMinutes(summary.value)
    case "hours":
      return labels.everyHours(summary.value)
    case "days":
      return labels.everyDays(summary.value)
    case "dailyAt":
      return labels.dailyAt(summary.time)
    case "hourly":
      return labels.hourly
    case "once":
      return labels.once
    case "raw":
      // Accepted by the control plane but with no tidier phrasing here. Showing
      // the expression verbatim beats inventing a description for it.
      return summary.text
  }
}
