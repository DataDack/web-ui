import { Button, cn, Skeleton } from "@datadack/common-ui"
import { AlertCircle, ArrowUpRight, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { QuotaMeter } from "./QuotaMeter"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useAccountPlan, usePlans } from "../../managed-apps.hooks"
import { formatLimit, formatPrice, planQuotaRows } from "../plan/plan-format"
import { PlanTierArt } from "../plan/PlanTierArt"

interface PlanLimitsPanelProps {
  /** Renders the way to the upgrade page. Off on the upgrade page itself. */
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
 * Total, static and edge project counts carry usage meters because all three
 * are enforced by the create endpoint. The remaining advertised limits stay
 * as plain values until their underlying usage is measurable.
 */
export function PlanLimitsPanel({
  showChangeLink = true,
  className,
}: Readonly<PlanLimitsPanelProps>) {
  const { data: account, isLoading } = useAccountPlan()
  const { data: plans, isLoading: plansLoading } = usePlans()

  if (isLoading || plansLoading) {
    return <Skeleton className={cn("h-36 rounded-xl", className)} />
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
          "flex items-start gap-2.5 rounded-xl border border-border/60 glass-1-bg px-3 py-2.5",
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

  const paid = plan.price_inr_monthly > 0
  const meteredLabels = new Set(["Projects", "Static projects", "Edge projects"])
  const rows = planQuotaRows(plan.limits).filter((row) => !meteredLabels.has(row.label))

  return (
    <div className={cn("rounded-xl border border-border/60 glass-1-bg p-3.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
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
            <Link to={MANAGED_APPS_ROUTES.upgrade}>
              <Sparkles className="size-3.5" />
              Upgrade
              <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-3 space-y-3 rounded-lg border border-border/50 glass-1-bg-raised px-3 py-2.5">
        {usageKnown ? (
          <>
            <QuotaMeter
              label="All projects"
              used={account.projects_in_use}
              limit={plan.limits.max_projects}
              unit="projects"
            />
            <QuotaMeter
              label="Static projects"
              used={account.static_projects_in_use}
              limit={plan.limits.max_static_sites}
              unit="projects"
            />
            <QuotaMeter
              label="Edge projects"
              used={account.edge_projects_in_use}
              limit={plan.limits.max_edge_projects}
              unit="projects"
            />
          </>
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

      <dl className="mt-2.5 flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-0 items-baseline gap-1.5 rounded-md border border-border/50 glass-1-bg-raised px-2 py-1"
          >
            <dt className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[12px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Static projects are React or Angular-style builds served without SSR. Edge projects use a
        server-side runtime, such as Next.js through OpenNext.
      </p>
    </div>
  )
}
