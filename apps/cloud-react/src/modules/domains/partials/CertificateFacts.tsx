import { Badge } from "@datadack/common-ui"
import type { TFunction } from "i18next"

import type { Certificate } from "../certificates.types"

/** How many days are left, in words that carry the urgency the number alone does not. */
export function ExpiryText({ cert, t }: Readonly<{ cert: Certificate; t: TFunction }>) {
  if (!cert.not_after) return <span className="text-muted-foreground">—</span>
  const days = cert.days_remaining
  if (days < 0) {
    return (
      <span className="text-status-danger">
        {t("domains.certificates.expiredAgo", { count: -days })}
      </span>
    )
  }
  // Only an imported certificate's countdown is a deadline; a managed one renews.
  let tone = ""
  if (!cert.auto_renew && days <= 14) tone = "text-status-danger"
  else if (!cert.auto_renew && days <= 30) tone = "text-status-warning"
  return <span className={tone}>{t("domains.certificates.daysLeft", { count: days })}</span>
}

export function SourceBadge({ cert, t }: Readonly<{ cert: Certificate; t: TFunction }>) {
  return (
    <Badge variant="outline" className="text-[11px]">
      {t(`domains.certificates.source.${cert.source}`)}
    </Badge>
  )
}
