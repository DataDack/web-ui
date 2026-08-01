import { CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { StatusBadge } from "@/components/console"
import { Skeleton } from "@/components/ui/skeleton"

export interface AttentionItem {
  id: string
  name: string
  /** Localized resource-kind label, e.g. "VM" / "Disk". */
  kind: string
  status: string
  to: string
}

interface AttentionQueueProps {
  items: AttentionItem[]
  isLoading: boolean
}

/**
 * Surfaces only resources in a non-nominal state (errored/stopped instances,
 * unattached disks, suspended autoscaling groups). When the fleet is healthy
 * the queue collapses to a single "all nominal" line rather than empty space.
 */
export function AttentionQueue({ items, isLoading }: Readonly<AttentionQueueProps>) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <CheckCircle2 className="size-5 text-status-success" />
        <p className="text-[13px] font-medium text-foreground">
          {t("compute.overview.attention.nominal")}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {t("compute.overview.attention.nominalHint")}
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Link
            to={item.to}
            className="group flex items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-foreground">
                {item.name || item.id}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {item.kind}
              </span>
            </span>
            <StatusBadge status={item.status} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
