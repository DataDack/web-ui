import { formatBytes, Skeleton } from "@datadack/common-ui"
import { ArrowDownUp, BarChart3 } from "lucide-react"
import { Link } from "react-router-dom"

import { isUnlimited } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useAccountPlan, useProjectAnalytics } from "../../managed-apps.hooks"
import type { Project } from "../../managed-apps.types"

/** GB, as the pricing sheet counts them. */
const BYTES_PER_GB = 1024 ** 3

/**
 * The two numbers worth putting beside a deployment: how much it is being
 * asked for, and how much it is sending back.
 *
 * Both come from the gateway's own counters — the same source the Observability
 * tab charts — so nothing here is sampled, modelled or estimated. That matters
 * more than usual on this particular panel, because it sits next to a quota:
 * a bandwidth bar filled from a guess would be a bill computed from a guess.
 *
 * The quota bar is drawn ONLY when the account's plan states a finite limit.
 * An unlimited tier gets the figure without a bar, because a fraction of
 * infinity is not a picture of anything; a tier whose limit failed to load gets
 * the figure alone rather than a bar against an assumed default.
 */
export function DeploymentStats({ project }: Readonly<{ project: Project }>) {
  // Thirty days is the window the tile's own label promises, and it is the one
  // the bandwidth quota is sold in — a "45% of limit" bar computed over seven
  // days against a monthly allowance would be wrong by a factor of four.
  const { data: analytics, isLoading } = useProjectAnalytics(project.id, "30d")
  const { data: account } = useAccountPlan()

  const totals = analytics?.totals
  const bandwidthLimitGB = account?.plan.limits.bandwidth_gb
  const usedGB = (totals?.bytes_out ?? 0) / BYTES_PER_GB
  const finiteLimit =
    typeof bandwidthLimitGB === "number" &&
    Number.isFinite(bandwidthLimitGB) &&
    !isUnlimited(bandwidthLimitGB) &&
    bandwidthLimitGB > 0
  const share = finiteLimit ? Math.min(1, usedGB / bandwidthLimitGB) : 0

  return (
    <div className="flex flex-col gap-4 lg:w-64 xl:w-72">
      <StatTile
        label="Requests · 30d"
        icon={BarChart3}
        loading={isLoading}
        value={(totals?.requests ?? 0).toLocaleString()}
        footer={
          <Link
            to={`${MANAGED_APPS_ROUTES.project(project.id)}?tab=observability`}
            className="text-[11px] text-status-info hover:underline"
          >
            View traffic
          </Link>
        }
      />

      <StatTile
        label="Bandwidth · 30d"
        icon={ArrowDownUp}
        loading={isLoading}
        value={formatBytes(totals?.bytes_out ?? 0)}
        footer={
          finiteLimit ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full glass-1-bg-raised ring-1 ring-border/50 ring-inset">
                <div
                  className="h-full rounded-full bg-brand-gold transition-[width]"
                  style={{ width: `${String(share * 100)}%` }}
                />
              </div>
              <span className="mt-1.5 block text-right font-mono text-[10px] text-muted-foreground">
                {(share * 100).toFixed(0)}% of {bandwidthLimitGB} GB
              </span>
            </>
          ) : (
            // Said out loud rather than left blank: a tile with no bar and no
            // explanation reads as a bar that failed to render.
            <span className="text-[11px] text-muted-foreground">
              {account ? "No monthly cap on this plan" : "Plan limit unavailable"}
            </span>
          )
        }
      />
    </div>
  )
}

function StatTile({
  label,
  icon: Icon,
  value,
  footer,
  loading,
}: Readonly<{
  label: string
  icon: typeof BarChart3
  value: string
  footer: React.ReactNode
  loading: boolean
}>) {
  return (
    <div className="rounded-xl border border-border/60 glass-1-bg p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</span>
        <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{value}</p>
      )}
      <div className="mt-2">{footer}</div>
    </div>
  )
}
