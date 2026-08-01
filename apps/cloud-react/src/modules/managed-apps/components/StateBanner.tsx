import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import type { ProjectState } from "../managed-apps.state"

const TONE_SURFACE: Record<string, string> = {
	success: "border-status-success/30 bg-status-success-bg",
	info: "border-status-info/30 bg-status-info-bg",
	warning: "border-status-warning/30 bg-status-warning-bg",
	danger: "border-status-danger/30 bg-status-danger-bg",
	neutral: "border-border/60",
}

const TONE_TEXT: Record<string, string> = {
	success: "text-status-success",
	info: "text-status-info",
	warning: "text-status-warning",
	danger: "text-status-danger",
	neutral: "text-muted-foreground",
}

interface StateBannerProps {
	state: ProjectState
	/** The action the state asks for — a button or link the caller supplies. */
	action?: ReactNode
	className?: string
}

/**
 * A project's state as a full-width banner: what it is, why, and the one thing
 * to do about it.
 *
 * Only rendered for states that are actually blocking or broken. A healthy
 * project gets a chip; a banner on every project would train users to ignore
 * the one that matters.
 */
export function StateBanner({ state, action, className }: Readonly<StateBannerProps>) {
	const Icon = state.icon

	return (
		<div
			className={cn(
				"flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3",
				TONE_SURFACE[state.tone] ?? TONE_SURFACE.neutral,
				className
			)}
		>
			<Icon className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[state.tone])} />
			<div className="min-w-0 flex-1">
				<p className={cn("text-[13px] font-semibold", TONE_TEXT[state.tone])}>
					{state.label}
				</p>
				<p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
					{state.detail}
				</p>
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	)
}

/** States where a banner earns its space — the user is blocked or must act. */
export function shouldBanner(state: ProjectState): boolean {
	return (
		state.kind === "awaiting_setup" ||
		state.kind === "failed" ||
		state.kind === "source_disconnected" ||
		state.kind === "deleting"
	)
}
