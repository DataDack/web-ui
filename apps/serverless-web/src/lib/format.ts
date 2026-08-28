/**
 * Formatters shared by the fleet views.
 *
 * They live here rather than beside the table that first needed them because a
 * module that exports both components and plain functions loses fast refresh —
 * and because the node detail page has to render the same numbers the list does.
 * Two implementations of "how big is this" drift, and the drift shows up as two
 * screens disagreeing about the same node.
 */

/** Bytes per second at human scale. Undefined in, undefined out: a rate that was
 *  never reported must render as "—" rather than as a confident 0 B/s. */
export function formatRate(bytesPerSec?: number): string | undefined {
  if (bytesPerSec === undefined) return undefined
  if (bytesPerSec < 1024) return `${String(Math.round(bytesPerSec))} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

/** Megabytes at human scale, promoting to GB past four digits. */
export function formatMb(mb?: number): string | undefined {
  if (mb === undefined) return undefined
  if (mb < 1024) return `${String(Math.round(mb))} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

/** The tone a usage bar takes. Extracted so the thresholds are stated once and
 *  read the same on every surface that draws one. */
export function usageTone(percent: number): string {
  if (percent >= 90) return "bg-destructive"
  if (percent >= 70) return "bg-warning"
  return "bg-primary"
}

/** A measure that was never reported reads as "—", never as a confident zero. */
export function orDash(value: string | undefined): string {
  return value ?? "—"
}
