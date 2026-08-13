import { Badge, cn } from "@datadack/common-ui"
import { Check, Loader, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { OptOutStatus } from "../../superadmin.types"

const PILL_CLASSES: Record<OptOutStatus, string> = {
  new: "text-status-warning bg-status-warning-bg border-status-warning/25",
  in_progress: "text-status-info bg-status-info-bg border-status-info/25",
  completed: "text-status-success bg-status-success-bg border-status-success/25",
  rejected: "text-status-danger bg-status-danger-bg border-status-danger/25",
}

// Working-state pill for one privacy request. "new" gets the pulsing dot the
// other queues give their untouched state — same meaning, that somebody is
// waiting on us, and here with a clock attached.
//
// "rejected" is in the danger tone rather than a muted one, unlike the contact
// queue's "spam". Declining to action a rights request is a decision somebody
// may have to defend, not a row being filed away, and it should not look quiet.
export function OptOutStatusPill({ status }: Readonly<{ status: OptOutStatus }>) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] gap-1.5", PILL_CLASSES[status])}>
      {status === "new" && <span className="size-1.5 rounded-full bg-status-warning animate-pulse" />}
      {status === "in_progress" && <Loader className="size-3" />}
      {status === "completed" && <Check className="size-3" />}
      {status === "rejected" && <X className="size-3" />}
      {t(`superAdmin.optOutRequests.status.${status}`, { defaultValue: status })}
    </Badge>
  )
}
