import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

import { formatPrice, planQuotaDeltas } from "../../../components"
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
 * monthly price either side of the move, and every quota that differs with the
 * direction it moves in. The billing sentence is the part people are entitled
 * to know before pressing the button — a paid tier is an ordinary monthly
 * subscription charged from the wallet now, and moving to the free tier cancels
 * it rather than refunding it.
 */
export function PlanChangeSummary({ from, to, projectsInUse }: Readonly<PlanChangeSummaryProps>) {
	const deltas = planQuotaDeltas(from.limits, to.limits)
	const paying = to.price_minor > 0
	const wasPaying = from.price_minor > 0

	// What this move does to the wallet, in one sentence, before it is made.
	let billingLine = "Both plans are free — nothing is charged."
	if (paying) {
		billingLine = `${to.name} is billed monthly and the first month is charged from your wallet now.`
	} else if (wasPaying) {
		billingLine =
			"Your current subscription is cancelled. There is no refund for the month already paid."
	}

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
				<ul className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3">
					{deltas.map((delta) => (
						<li
							key={delta.label}
							className="flex items-baseline justify-between gap-3 text-[12px]"
						>
							<span className="text-muted-foreground">{delta.label}</span>
							<span className="flex items-center gap-1.5 font-mono">
								<span className="text-muted-foreground line-through">
									{delta.from}
								</span>
								<span
									className={cn(
										"flex items-center gap-1 font-medium",
										delta.direction === "up"
											? "text-status-success"
											: "text-status-warning"
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
