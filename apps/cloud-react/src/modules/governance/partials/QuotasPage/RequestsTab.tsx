import { ArrowRight, Check, Inbox, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/modules/monitoring/monitoring.meta"

import type { QuotaRequest, QuotaRequestStatus } from "../../quotas.types"

const STATUS_CLASSES: Record<QuotaRequestStatus, string> = {
  pending: "border-status-warning/25 bg-status-warning-bg text-status-warning",
  approved: "border-status-success/25 bg-status-success-bg text-status-success",
  rejected: "border-status-danger/25 bg-status-danger-bg text-status-danger",
}

function RequestStatusPill({ status }: Readonly<{ status: QuotaRequestStatus }>) {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-mono text-[11px]", STATUS_CLASSES[status])}
    >
      {status === "pending" && (
        <span className="size-1.5 animate-pulse rounded-full bg-status-warning" />
      )}
      {status === "approved" && <Check className="size-3" />}
      {status === "rejected" && <X className="size-3" />}
      {t(`governance.quotas.status.${status}`)}
    </Badge>
  )
}

interface RequestsTabProps {
  requests: QuotaRequest[]
  isLoading: boolean
  onRequest: () => void
}

/** The account's increase requests, newest first, with review outcomes. */
export function RequestsTab({ requests, isLoading, onRequest }: Readonly<RequestsTabProps>) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="glass-1 divide-y divide-border/40 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex h-16 items-center gap-4 px-4">
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="glass-1">
        <EmptyState
          icon={Inbox}
          title={t("governance.quotas.requestsEmpty")}
          description={t("governance.quotas.requestsEmptySubtitle")}
          action={{
            label: t("governance.quotas.requestIncrease"),
            onClick: onRequest,
          }}
        />
      </div>
    )
  }

  return (
    <div className="glass-1 divide-y divide-border/40 overflow-hidden">
      {requests.map((req) => (
        <div key={req.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <RequestStatusPill status={req.status} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {req.quota_name || req.quota_code}
              </div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {req.quota_code}
              </div>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[13px] tabular-nums text-foreground">
              {req.current_limit}
              <ArrowRight className="size-3.5 text-muted-foreground" />
              {req.requested_limit}
            </span>
            <span className="w-16 text-right font-mono text-[12px] text-muted-foreground">
              {timeAgo(req.created_at)}
            </span>
          </div>
          {req.review_note && (
            <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("governance.quotas.reviewNote")}:
              </span>{" "}
              {req.review_note}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
