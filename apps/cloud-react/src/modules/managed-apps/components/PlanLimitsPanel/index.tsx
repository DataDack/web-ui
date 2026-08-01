import { AlertCircle, ArrowRight, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Skeleton } from "@datadack/serverless-ui"

import { QuotaMeter } from "./QuotaMeter"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useAccountPlan, usePlans } from "../../managed-apps.hooks"
import { formatLimit, formatPrice, planQuotaRows } from "../plan/plan-format"
import { PlanTierArt } from "../plan/PlanTierArt"

interface PlanLimitsPanelProps {
  /** Renders the way to Settings. Off on the settings page itself. */
  showChangeLink?: boolean
  className?: string
}

/**
 * The account's tier, stated — not chosen.
 *
 * The tier is ACCOUNT-scoped: it sells quotas like "2 active projects", which
 * cap nothing if each project picks its own. So every surface that used to
 * offer a tier picker (the create flow, a project's settings) shows this
 * instead — the limits the thing being created will run under, and where to go
 * if they are not the right ones.
 *
 * Only the project count carries a usage meter, because it is the only quota
 * the platform actually enforces today (the create endpoint answers 403 on it).
 * The rest are listed as the numbers they are rather than dressed up as gauges
 * measuring nothing.
 */
export function PlanLimitsPanel({
  showChangeLink = true,
  className,
}: Readonly<PlanLimitsPanelProps>) {
  const { data: account, isLoading } = useAccountPlan()
  const { data: plans, isLoading: plansLoading } = usePlans()

  if (isLoading || plansLoading) {
    return <Skeleton className={cn("h-44 rounded-xl", className)} />
  }

  // An unreadable account plan is not an unknown plan: every account is on the
  // free tier until it upgrades, and that is the catalogue's first row. Show
  // it, and say the usage figure is missing — the previous behaviour replaced
  // the whole panel with an error, hiding limits that were never in doubt.
  const plan = account?.plan ?? plans?.[0]
  const usageKnown = account != null

  if (!plan) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3",
          className,
        )}
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] text-muted-foreground">
          Your plan and its limits could not be loaded. Nothing changes for what you are creating —
          the account&apos;s stored plan still applies.
        </p>
      </div>
    )
  }

  const paid = plan.price_minor > 0
  // The project count has its own meter above; the rest are stated as limits.
  const rows = planQuotaRows(plan.limits).filter((row) => row.label !== "Projects")

  return (
    <div className={cn("glass-1 rounded-xl border border-border/60 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlanTierArt code={plan.code} active />
          <div className="min-w-0">
            <p className="flex items-baseline gap-2 text-sm font-semibold">
              {plan.name}
              <span className="text-[12px] font-normal text-muted-foreground">
                {formatPrice(plan)}
                {paid && "/mo"}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {usageKnown
                ? "Applies to every managed app in this account"
                : "Showing the plan every account starts on — your account's plan could not be read"}
            </p>
          </div>
        </div>

        {showChangeLink && (
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px]">
            <Link to={MANAGED_APPS_ROUTES.settings}>
              <Sparkles className="size-3.5" />
              Change plan
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-4">
        {usageKnown ? (
          <QuotaMeter
            label="Projects"
            used={account.projects_in_use}
            limit={plan.limits.max_projects}
            unit="projects"
          />
        ) : (
          // No usage figure means no meter: a bar drawn from a number we
          // do not have would be a measurement, not a placeholder.
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Projects
            </span>
            <span className="font-mono text-[12px] font-medium">
              {formatLimit(plan.limits.max_projects)}
            </span>
          </div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-border/50 pt-3.5 sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[13px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
