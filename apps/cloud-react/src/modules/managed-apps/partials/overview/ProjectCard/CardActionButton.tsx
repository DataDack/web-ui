import { ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

import type { CardAction } from "./card-action"

interface CardActionButtonProps {
	action: NonNullable<CardAction>
	deploying: boolean
	onDeploy: () => void
	onReconnect: () => void
}

/**
 * The card's next step, as whichever element its destination requires.
 *
 * `outline` in every case: the header's filled Create project button is this
 * page's one primary action, and forty filled buttons in the grid below would
 * drown it. It is always visible rather than revealed on hover — a hover-only
 * action does not exist on a touch screen.
 */
export function CardActionButton({
	action,
	deploying,
	onDeploy,
	onReconnect,
}: Readonly<CardActionButtonProps>) {
	if (action.kind === "internal") {
		return (
			<Button asChild variant="outline" size="sm" className="w-full">
				<Link to={action.to}>{action.label}</Link>
			</Button>
		)
	}

	if (action.kind === "external") {
		return (
			<Button asChild variant="outline" size="sm" className="w-full gap-1.5">
				<a href={action.href} target="_blank" rel="noreferrer">
					{action.label}
					<ExternalLink className="size-3" />
				</a>
			</Button>
		)
	}

	return (
		<Button
			variant="outline"
			size="sm"
			className="w-full"
			disabled={action.kind === "deploy" && deploying}
			onClick={action.kind === "deploy" ? onDeploy : onReconnect}
		>
			{action.kind === "deploy" && deploying ? "Queueing…" : action.label}
		</Button>
	)
}
