import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { QuotaRequestStatus } from "../../superadmin.types"

const PILL_CLASSES: Record<QuotaRequestStatus, string> = {
  pending: "text-status-warning bg-status-warning-bg border-status-warning/25",
  approved: "text-status-success bg-status-success-bg border-status-success/25",
  rejected: "text-status-danger bg-status-danger-bg border-status-danger/25",
}

// Review-state pill. The shared StatusBadge treats "pending" as an in-flight
// operation (spinner); here it is a queue state, so it gets a pulsing dot
// instead — nothing is running until a reviewer acts.
export function RequestStatusPill({ status }: Readonly<{ status: QuotaRequestStatus }>) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] gap-1.5", PILL_CLASSES[status])}>
      {status === "pending" && (
        <span className="size-1.5 rounded-full bg-status-warning animate-pulse" />
      )}
      {status === "approved" && <Check className="size-3" />}
      {status === "rejected" && <X className="size-3" />}
      {t(`governance.quotas.status.${status}`, { defaultValue: status })}
    </Badge>
  )
}
