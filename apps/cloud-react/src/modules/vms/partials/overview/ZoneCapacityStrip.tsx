import { useMemo } from "react"

import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { ComputeZoneStatus } from "../../vms.types"

interface ZoneCapacityStripProps {
  zones: ComputeZoneStatus[]
  isLoading: boolean
}

interface ZoneRow {
  zone: string
  total: number
  running: number
}

/**
 * Signature element: a per-zone capacity readout. Each row shows running vs
 * total instances as a thin segmented bar with a live pulse when the zone has
 * anything running — a control-room pulse-check across Datadack's sovereign
 * Noida-NCR availability zones.
 */
export function ZoneCapacityStrip({ zones, isLoading }: Readonly<ZoneCapacityStripProps>) {
  const { t } = useTranslation()

  const rows = useMemo<ZoneRow[]>(
    () =>
      zones
        .map((z) => ({ zone: z.code, total: z.total, running: z.running }))
        .sort((a, b) => b.total - a.total || a.zone.localeCompare(b.zone)),
    [zones],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40 shrink-0" />
            <Skeleton className="h-2 flex-1 rounded-full" />
            <Skeleton className="h-4 w-12 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-muted-foreground">
        {t("compute.overview.zones.empty")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const pct = row.total > 0 ? Math.round((row.running / row.total) * 100) : 0
        const live = row.running > 0
        return (
          <div key={row.zone} className="flex items-center gap-4">
            <div className="flex w-44 shrink-0 items-center gap-2">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  live ? "animate-pulse bg-status-success" : "bg-muted-foreground/40",
                )}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-[12px] font-medium text-foreground">
                  {row.zone}
                </span>
              </span>
            </div>

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-status-success transition-[width] duration-500 ease-out"
                style={{ width: `${pct.toString()}%` }}
              />
            </div>

            <span className="w-16 shrink-0 text-right font-mono text-[12px] tabular-nums text-foreground">
              <span className={live ? "text-status-success" : "text-muted-foreground"}>
                {row.running}
              </span>
              <span className="text-muted-foreground">/{row.total}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
