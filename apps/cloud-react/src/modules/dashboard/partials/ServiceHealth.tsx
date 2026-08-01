import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"

import { HomePanel } from "./HomePanel"
import { useServiceHealth } from "../dashboard.hooks"
import type { HealthStatus } from "../dashboard.types"

const STATUS_META: Record<HealthStatus, { color: string; labelKey: string }> = {
  operational: { color: "#5bd08a", labelKey: "dashboard.home.serviceHealth.operational" },
  elevated: { color: "#e9b94f", labelKey: "dashboard.home.serviceHealth.elevated" },
  degraded: { color: "#e9b94f", labelKey: "dashboard.home.serviceHealth.degraded" },
  outage: { color: "#f07a66", labelKey: "dashboard.home.serviceHealth.outage" },
  inactive: { color: "#8a8f98", labelKey: "dashboard.home.serviceHealth.inactive" },
  coming_soon: { color: "#8a8f98", labelKey: "dashboard.home.serviceHealth.comingSoon" },
}

/** Relative "Xs ago" / "Xm ago" string from a fetch timestamp. */
function formatAgo(from: number): string {
  const secs = Math.max(0, Math.round((Date.now() - from) / 1000))
  if (secs < 60) return `${secs}s`
  return `${Math.round(secs / 60)}m`
}

export function ServiceHealth() {
  const { t } = useTranslation()
  const { data: health, isLoading } = useServiceHealth()

  return (
    <HomePanel
      title={t("dashboard.home.serviceHealth.title")}
      action={
        health && t("dashboard.home.serviceHealth.updated", { time: formatAgo(health.fetchedAt) })
      }
      bodyClassName="pb-4"
    >
      {isLoading || !health ? (
        <div className="space-y-3 py-1">
          {["h1", "h2", "h3", "h4", "h5"].map((k) => (
            <Skeleton key={k} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <ul>
          {health.items.map((s) => {
            // Statuses are normalized at the API boundary, so the
            // lookup is total by construction.
            const meta = STATUS_META[s.status]
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
              >
                <span className="flex-1 truncate text-sm text-foreground">{s.name}</span>
                <span
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: meta.color }}
                >
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{
                      background: meta.color,
                      boxShadow: `0 0 8px ${meta.color}`,
                    }}
                  />
                  {t(meta.labelKey)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </HomePanel>
  )
}
