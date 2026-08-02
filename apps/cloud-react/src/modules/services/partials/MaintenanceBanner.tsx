import { Badge, Button } from "@datadack/common-ui"
import { AlertTriangle, Clock, X } from "lucide-react"

import type { ServiceMaintenance } from "../services.types"

interface MaintenanceBannerProps {
  maintenance: ServiceMaintenance
  affectedSubServices?: string[]
  onDismiss?: () => void
}

function timeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return "ending soon"
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `~${String(h)}h ${String(m)}m remaining`
  return `~${String(m)}m remaining`
}

function impactLabel(impact: ServiceMaintenance["impact"]): string {
  if (impact === "none") return "No impact"
  if (impact === "partial") return "Partial impact"
  return "Full impact"
}

export function MaintenanceBanner({
  maintenance,
  affectedSubServices = [],
  onDismiss,
}: Readonly<MaintenanceBannerProps>) {
  const impact = maintenance.impact

  return (
    <div
      className="rounded-xl px-4 py-3.5 flex items-start gap-3"
      style={{
        background: impact === "full" ? "rgba(255,180,171,0.08)" : "rgba(255,183,123,0.08)",
        border:
          impact === "full"
            ? "1px solid rgba(255,180,171,0.25)"
            : "1px solid rgba(255,183,123,0.25)",
      }}
    >
      {/* Icon */}
      <AlertTriangle
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: impact === "full" ? "var(--destructive)" : "var(--secondary)" }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{maintenance.title}</span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono"
            style={{
              color: impact === "full" ? "var(--destructive)" : "var(--secondary)",
              borderColor: impact === "full" ? "rgba(255,180,171,0.3)" : "rgba(255,183,123,0.3)",
              background: "transparent",
            }}
          >
            {impactLabel(impact)}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mt-1 leading-5">{maintenance.message}</p>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeRemaining(maintenance.endTime)}
          </span>
          {affectedSubServices.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Affected: {affectedSubServices.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  )
}
