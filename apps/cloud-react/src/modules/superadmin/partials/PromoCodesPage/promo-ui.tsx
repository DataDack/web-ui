import { cn } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import type { PromoCode, PromoState, RedemptionStatus } from "@/modules/promotions"

import { formatPct, formatRupees, useScopeSentence } from "./promo-format"

/**
 * State → colour. The five states are not a severity scale, so they are not
 * coloured like one: `active` is the only "good" state, `paused` and `scheduled`
 * are deliberate operator choices (neutral / informational), and `expired` and
 * `exhausted` are simply over — muted rather than red, because a campaign
 * finishing is not a fault.
 */
const STATE_STYLES: Record<PromoState, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  scheduled: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  expired: "border-border-glass bg-muted/50 text-muted-foreground",
  exhausted: "border-border-glass bg-muted/50 text-muted-foreground",
}

export function PromoStateBadge({ state }: Readonly<{ state: PromoState }>) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATE_STYLES[state],
      )}
    >
      {t(`superAdmin.promoCodes.states.${state}`)}
    </span>
  )
}

const REDEMPTION_STYLES: Record<RedemptionStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  expired: "border-border-glass bg-muted/50 text-muted-foreground",
  revoked: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function RedemptionStatusBadge({ status }: Readonly<{ status: RedemptionStatus }>) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        REDEMPTION_STYLES[status],
      )}
    >
      {t(`superAdmin.promoCodes.redemptionStates.${status}`)}
    </span>
  )
}

/**
 * The one-line answer to "what does this code give someone".
 *
 * Rendered as two lines — the reward, and what it is limited to — because the
 * limit is the part an operator forgets they set. A percent-off code with an
 * empty scope says "all services" rather than staying silent: silence there
 * reads as "unknown", and this is the field that decides how much money the
 * campaign costs.
 */
export function RewardCell({ code }: Readonly<{ code: PromoCode }>) {
  const { t } = useTranslation()
  const scopeSentence = useScopeSentence()

  if (code.kind === "credit") {
    return (
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {t("superAdmin.promoCodes.reward.credit", { amount: formatRupees(code.credit_amount) })}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {t("superAdmin.promoCodes.reward.creditHint")}
        </span>
      </div>
    )
  }

  const scopeLabel = scopeSentence(code.applies_to)

  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium text-foreground">
        {t("superAdmin.promoCodes.reward.percent", { pct: formatPct(code.discount_pct) })}
      </span>
      <span className="truncate text-[11px] text-muted-foreground">{scopeLabel}</span>
    </div>
  )
}

/**
 * Redemptions against the cap, with a bar for the capped case only.
 *
 * An uncapped code gets a count and the word "unlimited", not a bar at 0% —
 * a progress bar implies a finish line, and drawing one for a campaign that has
 * none is the sort of small lie that makes an operator misjudge how much of it
 * is left.
 */
export function UsageCell({ code }: Readonly<{ code: PromoCode }>) {
  const { t } = useTranslation()

  if (code.max_redemptions === 0) {
    return (
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {code.redeemed_count.toLocaleString("en-IN")}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {t("superAdmin.promoCodes.usage.unlimited")}
        </span>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((code.redeemed_count / code.max_redemptions) * 100))
  const full = (code.remaining_seats ?? 0) === 0
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm font-medium tabular-nums text-foreground">
        {code.redeemed_count.toLocaleString("en-IN")}
        <span className="text-muted-foreground"> / {code.max_redemptions.toLocaleString("en-IN")}</span>
      </span>
      <div
        className="h-1 w-20 overflow-hidden rounded-full bg-muted"
        role="presentation"
        aria-hidden="true"
      >
        <div
          className={cn("h-full rounded-full", full ? "bg-muted-foreground/60" : "bg-gradient-brand")}
          style={{ width: `${String(pct)}%` }}
        />
      </div>
    </div>
  )
}
