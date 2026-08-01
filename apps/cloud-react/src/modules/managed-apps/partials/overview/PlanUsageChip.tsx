import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

import { formatLimit, isUnlimited } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useAccountPlan } from "../../managed-apps.hooks"

/**
 * The account's tier and how much of it is spent, under the page title.
 *
 * This replaces a bare project count, which stated a number without the one
 * thing that makes it mean anything — the ceiling. "2 of 2 projects" is the
 * difference between a list and a wall the next Create button will hit, so it
 * links to the page that can move the ceiling.
 */
export function PlanUsageChip() {
	const { data: account } = useAccountPlan()
	if (!account) return null

	const { plan, projects_in_use: used } = account
	const limit = plan.limits.max_projects
	const spent = !isUnlimited(limit) && used >= limit

	return (
		<Link
			to={MANAGED_APPS_ROUTES.settings}
			className={cn(
				"group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] transition-colors",
				spent
					? "border-status-warning/40 bg-status-warning-bg text-status-warning"
					: "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
			)}
		>
			<span className="font-medium">{plan.name}</span>
			<span aria-hidden className="opacity-40">
				·
			</span>
			<span>
				{isUnlimited(limit)
					? `${String(used)} projects`
					: `${String(used)} of ${formatLimit(limit)} projects`}
			</span>
			<ArrowUpRight className="size-3 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
		</Link>
	)
}
