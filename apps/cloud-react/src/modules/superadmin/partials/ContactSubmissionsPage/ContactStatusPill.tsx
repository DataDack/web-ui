import { Badge, cn } from "@datadack/common-ui"
import { Ban, Check, MailCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ContactSubmissionStatus } from "../../superadmin.types"

const PILL_CLASSES: Record<ContactSubmissionStatus, string> = {
  new: "text-status-warning bg-status-warning-bg border-status-warning/25",
  contacted: "text-status-info bg-status-info-bg border-status-info/25",
  closed: "text-status-success bg-status-success-bg border-status-success/25",
  spam: "text-muted-foreground bg-muted/40 border-border",
}

// Triage-state pill for one contact submission. "new" gets the pulsing dot the
// quota queue gives "pending" — same meaning, that somebody is waiting on us —
// while spam is deliberately the quietest thing on the row: it is filed, not
// finished, and nothing about it should pull an eye.
export function ContactStatusPill({ status }: Readonly<{ status: ContactSubmissionStatus }>) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] gap-1.5", PILL_CLASSES[status])}>
      {status === "new" && <span className="size-1.5 rounded-full bg-status-warning animate-pulse" />}
      {status === "contacted" && <MailCheck className="size-3" />}
      {status === "closed" && <Check className="size-3" />}
      {status === "spam" && <Ban className="size-3" />}
      {t(`superAdmin.contactSubmissions.status.${status}`, { defaultValue: status })}
    </Badge>
  )
}
