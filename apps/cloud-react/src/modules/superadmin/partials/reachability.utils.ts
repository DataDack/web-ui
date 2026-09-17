import type { AnomalyKind } from "../superadmin.types"

export const ANOMALY_LABELS: Record<AnomalyKind, string> = {
  recovered_after_outage: "Back after ≥1 day silent",
  unattached_responding: "Answering, attached to nothing",
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

export function humanSeconds(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  if (days > 0) return hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${String(hours)}h ${String(minutes)}m` : `${String(minutes)}m`
}
