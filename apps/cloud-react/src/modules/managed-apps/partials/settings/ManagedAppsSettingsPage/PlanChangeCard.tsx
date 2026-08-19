import { Button, cn } from "@datadack/common-ui"
import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react"

import { formatPrice, planHighlights, PlanTierArt } from "../../../components"
import type { Plan } from "../../../managed-apps.types"

export type PlanDirection = "current" | "upgrade" | "downgrade"

interface PlanChangeCardProps {
  plan: Plan
  direction: PlanDirection
  /** The tier every account starts on until it upgrades. */
  isDefault?: boolean
  /** The tier below this one, for the "everything in X, plus…" line. */
  buildsOn?: string
  /** Why this tier cannot be moved to — rendered instead of enabling the button. */
  blockedReason?: string
  disabled?: boolean
  onChoose: (plan: Plan) => void
  /** Pressed instead of onChoose for a tier that has no list price. */
  onContact?: () => void
}

const DIRECTION_LABEL: Record<PlanDirection, string> = {
  current: "Current plan",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
}

/**
 * One tier, with the move it represents named.
 *
 * Deliberately not the composer's PlanCard: that is a radio in a group where
 * nothing has happened yet. Here the account is already on one of these, so
 * every card answers a different question — "you are here", "this costs more
 * and gives more", "this costs less and takes some away" — and a button that
 * says which is more honest than a checked circle that does not.
 */
export function PlanChangeCard({
  plan,
  direction,
  isDefault,
  buildsOn,
  blockedReason,
  disabled,
  onChoose,
  onContact,
}: Readonly<PlanChangeCardProps>) {
  const current = direction === "current"
  // A tier with no list price is sold by a conversation. The server refuses to
  // sell it (409), so the card must not offer a button that would earn one.
  const custom = plan.is_custom_priced || !plan.is_purchasable
  const free = !custom && plan.price_inr_monthly === 0
  const blocked = Boolean(blockedReason)

  let subtitle: string
  if (custom) {
    subtitle = "Sized around what you actually run"
  } else if (isDefault) {
    subtitle = "Every account starts here"
  } else {
    subtitle = `Everything in ${buildsOn ?? "the plan below"}, plus:`
  }

  // A tier sold by conversation gets the outline treatment whichever direction
  // it is from the current one: "Talk to us" is never the gold call to action.
  const variant = !custom && direction === "upgrade" ? "gold" : "outline"

  return (
    <div
      className={cn(
        // min-w-0 so the quota labels below may truncate rather than force the
        // card wider than its share of a four-across row.
        "relative flex min-w-0 flex-col gap-3 rounded-xl border p-3 transition-colors",
        current
          ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
          : "border-border/60 glass-1-bg hover:border-border hover:glass-2-bg",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <PlanTierArt code={plan.code} active={current} />
        {current ? (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase">
            <Check className="size-3" strokeWidth={3} />
            Current
          </span>
        ) : (
          isDefault && (
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Default
            </span>
          )
        )}
      </div>

      <div className="min-w-0 space-y-1">
        {/* Name and price share a baseline: at four across the card has one
            stack level fewer to give, and the two are read together anyway. */}
        <p className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{plan.name}</span>
          <span className="flex shrink-0 items-baseline gap-1">
            <span className="text-lg font-semibold tracking-tight">{formatPrice(plan)}</span>
            {!free && <span className="text-[11px] text-muted-foreground">/mo</span>}
          </span>
        </p>
        {/* Stated on the card the account starts on, so "why am I on this?" is
            answered where it is asked; otherwise, what this tier builds on. */}
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 border-t border-border/50 pt-2.5">
        {planHighlights(plan.limits).map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[12px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto space-y-1 pt-0.5">
        <Button
          type="button"
          variant={variant}
          size="sm"
          className="w-full gap-1.5"
          disabled={(!custom && (current || blocked)) || disabled}
          onClick={() => {
            if (custom) {
              onContact?.()
              return
            }
            onChoose(plan)
          }}
        >
          {!custom && direction === "upgrade" && <ArrowUpRight className="size-3.5" />}
          {!custom && direction === "downgrade" && <ArrowDownRight className="size-3.5" />}
          {custom ? "Talk to us" : DIRECTION_LABEL[direction]}
        </Button>
        {blockedReason && <p className="text-[11px] text-status-warning">{blockedReason}</p>}
      </div>
    </div>
  )
}
