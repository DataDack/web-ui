import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react"

import { Button } from "@datadack/common-ui"
import { cn } from "@/lib/utils"

import { formatPrice, planHighlights, PlanTierArt } from "../../../components"
import type { Plan } from "../../../managed-apps.types"

export type PlanDirection = "current" | "upgrade" | "downgrade"

interface PlanChangeCardProps {
  plan: Plan
  direction: PlanDirection
  /** The tier every account starts on until it upgrades. */
  isDefault?: boolean
  /** Why this tier cannot be moved to — rendered instead of enabling the button. */
  blockedReason?: string
  disabled?: boolean
  onChoose: (plan: Plan) => void
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
  blockedReason,
  disabled,
  onChoose,
}: Readonly<PlanChangeCardProps>) {
  const current = direction === "current"
  const free = plan.price_minor === 0
  const blocked = Boolean(blockedReason)

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 rounded-xl border p-4 transition-colors",
        current
          ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
          : "border-border/60 hover:border-border hover:bg-muted/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
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

      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {plan.name}
          {/* Stated on the card the account starts on, so "why am I on
					    this?" is answered where it is asked. */}
          {isDefault && current && (
            <span className="text-[11px] font-normal text-muted-foreground">
              · every account starts here
            </span>
          )}
        </p>
        <p className="flex items-baseline gap-1">
          <span className="text-xl font-semibold tracking-tight">{formatPrice(plan)}</span>
          {!free && <span className="text-[11px] text-muted-foreground">/mo</span>}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/50 pt-3">
        {planHighlights(plan.limits).map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[13px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto space-y-1.5 pt-1">
        <Button
          type="button"
          variant={direction === "upgrade" ? "gold" : "outline"}
          size="sm"
          className="w-full gap-1.5"
          disabled={current || blocked || disabled}
          onClick={() => {
            onChoose(plan)
          }}
        >
          {direction === "upgrade" && <ArrowUpRight className="size-3.5" />}
          {direction === "downgrade" && <ArrowDownRight className="size-3.5" />}
          {DIRECTION_LABEL[direction]}
        </Button>
        {blockedReason && <p className="text-[11px] text-status-warning">{blockedReason}</p>}
      </div>
    </div>
  )
}
