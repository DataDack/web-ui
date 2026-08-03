import { Badge, Button, cn } from "@datadack/common-ui"
import { ArrowUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { QuotaRing } from "../../components/QuotaRing"
import { type QuotaTone, quotaTone } from "../../components/QuotaRing/quota-tone"
import type { EffectiveQuota } from "../../quotas.types"

const BAR_CLASSES: Record<QuotaTone, string> = {
  ok: "bg-status-success",
  warn: "bg-status-warning",
  full: "bg-status-danger",
}

interface QuotaRowProps {
  quota: EffectiveQuota
  onRequest: (code: string) => void
}

/** One quota inside a module card: identity · state badges · usage · action.
 *  The usage block and action slot sit at fixed positions so bars and figures
 *  align vertically across rows. */
export function QuotaRow({ quota, onRequest }: Readonly<QuotaRowProps>) {
  const { t } = useTranslation()
  const unlimited = quota.limit === -1
  const tone = quotaTone(quota.usage, quota.limit)
  const ratio = unlimited || quota.limit <= 0 ? 0 : Math.min(quota.usage / quota.limit, 1)

  return (
    <div className="group flex h-14 items-center gap-3 px-4 transition-colors hover:bg-muted/50 sm:gap-4">
      <QuotaRing
        used={quota.usage}
        limit={quota.limit}
        size={32}
        strokeWidth={3}
        className="hidden sm:inline-flex"
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{quota.name}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{quota.code}</div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {quota.adjusted && (
          <Badge
            variant="outline"
            className="gap-1 border-status-warning/25 bg-status-warning-bg font-mono text-[11px] tabular-nums text-status-warning"
          >
            <ArrowUpRight className="size-3" />
            {quota.source === "plan_change"
              ? t("governance.quotas.adjustedPlanBadge")
              : t("governance.quotas.adjustedBadge", {
                  from: quota.adjusted_from ?? "—",
                  to: quota.limit,
                })}
          </Badge>
        )}
        {quota.scope === "user" && (
          <Badge
            variant="outline"
            className="hidden text-[11px] text-muted-foreground lg:inline-flex"
          >
            {t("governance.quotas.perUser")}
          </Badge>
        )}
      </div>

      {/* Usage: slim bar + figures. The bar collapses on small screens,
                the figures stay so usage is always readable. */}
      <div className="flex shrink-0 items-center gap-3">
        {unlimited ? (
          <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
            {t("governance.quotas.unlimited")}
          </Badge>
        ) : (
          <>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={quota.limit}
              aria-valuenow={quota.usage}
              aria-label={t("governance.quotas.usageOf", {
                used: quota.usage,
                limit: quota.limit,
              })}
              className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted md:block lg:w-40"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                  BAR_CLASSES[tone],
                )}
                style={{ width: `${String(Math.round(ratio * 100))}%` }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
              {quota.usage} / {quota.limit}
            </span>
          </>
        )}
      </div>

      {quota.adjustable && (
        <Button
          variant="ghost"
          size="sm"
          className="hidden shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:inline-flex"
          onClick={() => {
            onRequest(quota.code)
          }}
        >
          {t("governance.quotas.requestIncrease")}
        </Button>
      )}
    </div>
  )
}
