import { cn } from "@datadack/common-ui"
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react"

import { formatAmount, formatPrice, planQuotaDeltas } from "../../../components"
import { usePlanEstimate } from "../../../managed-apps.hooks"
import type { Plan } from "../../../managed-apps.types"

interface PlanChangeSummaryProps {
  from: Plan
  to: Plan
  projectsInUse: number
}

/**
 * What the confirm dialog is actually confirming.
 *
 * A plan change spends money and moves quotas, so the dialog states both: the
 * quotas that differ with the direction they move in, and — for a paid tier —
 * the itemised cost, straight from the server's own quote.
 *
 * The cost is quoted rather than derived from the catalogue price because the
 * two are not the same number. An account carrying a permanent discount pays
 * less than the advertised price, and GST is added on top, so a dialog showing
 * ₹499/mo preceded a ₹471.06 debit with nothing accounting for the difference.
 * The quote runs through the same discount + GST math the charge does, so what
 * is shown here is what the wallet is debited.
 */
export function PlanChangeSummary({ from, to, projectsInUse }: Readonly<PlanChangeSummaryProps>) {
  const deltas = planQuotaDeltas(from.limits, to.limits)
  const paying = to.price_inr_monthly > 0
  const wasPaying = from.price_inr_monthly > 0

  // Only a paid move costs anything, so only a paid move is quoted.
  const { data: cost } = usePlanEstimate(to.code, paying)
  const discounted = Boolean(cost && cost.discount_pct > 0 && cost.list_price > cost.base)

  // What this move does to the wallet, in one sentence, before it is made. When
  // a quote is available the itemised block carries the amount, so the sentence
  // only has to cover the recurrence.
  let billingLine = "Both plans are free — nothing is charged."
  if (paying) {
    billingLine = cost
      ? `${to.name} is billed monthly. The first month is charged from your wallet now.`
      : `${to.name} is billed monthly and the first month is charged from your wallet now.`
  } else if (wasPaying) {
    billingLine =
      "Your current subscription is cancelled. There is no refund for the month already paid."
  }

  const costRow = (label: string, value: string, opts?: { strong?: boolean; muted?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className={opts?.strong ? "font-medium text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={cn(
          "font-mono",
          opts?.strong && "font-medium text-foreground",
          opts?.muted && "text-status-success",
        )}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-medium text-foreground">{from.name}</span>
        <span className="text-muted-foreground">
          {formatPrice(from)}
          {wasPaying && "/mo"}
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">{to.name}</span>
        <span className="text-muted-foreground">
          {formatPrice(to)}
          {paying && "/mo"}
        </span>
      </p>

      {deltas.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-border/60 glass-1-bg p-3">
          {deltas.map((delta) => (
            <li key={delta.label} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-muted-foreground">{delta.label}</span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="text-muted-foreground line-through">{delta.from}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-medium",
                    delta.direction === "up" ? "text-status-success" : "text-status-warning",
                  )}
                >
                  {delta.direction === "up" ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {delta.to}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {cost && (
        <div className="space-y-1.5 rounded-lg border border-border/60 glass-1-bg p-3">
          {discounted ? (
            <>
              {costRow(`${to.name} plan`, formatAmount(cost.list_price, cost.currency))}
              {costRow(
                `Discount (${String(cost.discount_pct)}% off)`,
                `−${formatAmount(cost.list_price - cost.base, cost.currency)}`,
                { muted: true },
              )}
              {/* A price cut with no attribution is one the customer cannot
                  check — so the reason sits with the number it explains. */}
              {cost.discount_reason && (
                <p className="pl-0 text-[11px] text-muted-foreground">{cost.discount_reason}</p>
              )}
              <div className="border-t border-border/60 pt-1.5">
                {costRow("Subtotal", formatAmount(cost.base, cost.currency))}
              </div>
            </>
          ) : (
            costRow(`${to.name} plan`, formatAmount(cost.base, cost.currency))
          )}
          {costRow(`GST (${String(cost.gst_rate)}%)`, formatAmount(cost.gst, cost.currency))}
          <div className="border-t border-border/60 pt-1.5">
            {costRow("Charged from wallet now", formatAmount(cost.total, cost.currency), {
              strong: true,
            })}
          </div>
        </div>
      )}

      <p className="text-[12px]">{billingLine}</p>

      <p className="text-[12px] text-muted-foreground">
        {projectsInUse === 1
          ? "Your 1 existing project keeps running"
          : `Your ${String(projectsInUse)} existing projects keep running`}{" "}
        — only the quotas they run under change.
      </p>
    </div>
  )
}
