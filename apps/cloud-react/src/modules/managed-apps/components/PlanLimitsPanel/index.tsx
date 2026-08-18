import { Button, cn, Skeleton } from "@datadack/common-ui"
import { AlertCircle, ExternalLink, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

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
  const { t } = useTranslation()
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

  const paid = plan.price_inr_monthly > 0
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
          // A new tab, deliberately. This panel sits inside the create flow and
          // a project's settings — both hold unsaved form state that navigating
          // away would discard, for a link that is only ever a detour.
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px]">
            <Link to={MANAGED_APPS_ROUTES.settings} target="_blank" rel="noreferrer">
              <Sparkles className="size-3.5" />
              {t("managedApps.index.changePlan")}
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        )}
      </div>

      {/* The projects meter, given the room the other seven quotas are not:
			    it is the only one the platform actually enforces (the create
			    endpoint answers 403 on it), so it is the only one that can be
			    over-spent while you are reading this. */}
      <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
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

      <dl className="mt-3 flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-0 items-baseline gap-1.5 rounded-md border border-border/50 bg-background/40 px-2 py-1"
          >
            <dt className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[12px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      {/* Said plainly, because the chips above look like readings and are not.
			    The component draws no bars for them for exactly this reason; the
			    page should not leave the reason to be inferred from their absence. */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        These are the plan&apos;s stated limits, not live usage — only the project count is metered
        today.
      </p>
    </div>
  )
}
