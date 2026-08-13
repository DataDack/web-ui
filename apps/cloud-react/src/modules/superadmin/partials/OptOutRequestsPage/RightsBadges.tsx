import { Badge, cn } from "@datadack/common-ui"
import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { isIrreversible } from "./optout-constants"
import type { OptOutRight } from "../../superadmin.types"

/**
 * The rights one request is exercising.
 *
 * Erasure carries the danger tone and an icon; the other two are neutral. That
 * is not a ranking — all three are obligations — it marks the one action that
 * cannot be undone once taken, so an operator scanning the queue can see which
 * rows need care before they open one.
 */
export function RightsBadges({ rights }: Readonly<{ rights: OptOutRight[] }>) {
  const { t } = useTranslation()

  if (rights.length === 0) {
    return <span className="text-[13px] text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {rights.map((right) => (
        <Badge
          key={right}
          variant="outline"
          className={cn(
            "text-[11px] gap-1",
            isIrreversible(right)
              ? "text-status-danger bg-status-danger-bg border-status-danger/25"
              : "text-muted-foreground border-border",
          )}
        >
          {isIrreversible(right) && <Trash2 className="size-3" />}
          {t(`superAdmin.optOutRequests.rights.${right}`, { defaultValue: right })}
        </Badge>
      ))}
    </div>
  )
}
