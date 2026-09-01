import { Section } from "@/components/console"

import { coverageFor } from "./feature-coverage"
import { MeteredStat } from "./MeteredStat"
import { formatLimit } from "../components"
import { useAccountPlan, useProjectAnalytics } from "../managed-apps.hooks"
import type { Project } from "../managed-apps.types"

const BYTES_PER_GB = 1024 ** 3

/**
 * What this project has consumed of what the account bought.
 *
 * The tiles are driven by FEATURE_COVERAGE rather than hardcoded here, so a
 * meter that lands changes one row in that table and appears here on its own —
 * and, just as importantly, a meter that has NOT landed cannot be quietly
 * rendered as though it had.
 */
export function PlanUsagePanel({ project }: Readonly<{ project: Project }>) {
  const { data: analytics, isLoading } = useProjectAnalytics(project.id, "30d")
  const { data: account } = useAccountPlan()

  const limits = account?.plan.limits
  const totals = analytics?.totals
  const bandwidthUsedGB = (totals?.bytes_out ?? 0) / BYTES_PER_GB

  const bandwidth = coverageFor("bandwidth_gb")
  const requests = coverageFor("edge_requests")
  const buildMinutes = coverageFor("build_minutes")
  const timeout = coverageFor("function_timeout_seconds")

  return (
    <Section
      variant="panel"
      title="Plan usage"
      description="This project's share of the account's monthly allowance, over the last 30 days."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MeteredStat
          label="Edge requests"
          source={requests?.source ?? "pending"}
          value={(totals?.requests ?? 0).toLocaleString()}
          entitlement={limits ? formatLimit(limits.edge_requests) : undefined}
          detail={requests?.note}
          loading={isLoading}
        />
        <MeteredStat
          label="Bandwidth"
          source={bandwidth?.source ?? "pending"}
          value={`${bandwidthUsedGB.toFixed(2)} GB`}
          entitlement={limits ? `${formatLimit(limits.bandwidth_gb)} GB` : undefined}
          detail={bandwidth?.note}
          loading={isLoading}
        />
        <MeteredStat
          label="Build minutes"
          source={buildMinutes?.source ?? "pending"}
          entitlement={limits ? `${formatLimit(limits.build_minutes)} min` : undefined}
          detail={buildMinutes?.note}
        />
        <MeteredStat
          label="Request timeout"
          source={timeout?.source ?? "entitlement"}
          entitlement={limits ? `${formatLimit(limits.request_timeout_seconds)}s` : undefined}
          detail={timeout?.note}
        />
      </div>
    </Section>
  )
}
