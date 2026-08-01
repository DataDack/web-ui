import { useState } from "react"

import { ChevronDown, ChevronRight, Loader2, Sparkles, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { RepoDetection } from "../../../managed-apps.types"

interface DetectionNoticeProps {
	detection: RepoDetection | undefined
	isLoading: boolean
	isError: boolean
	/** Re-applies the detected values over whatever the user has now. */
	onApply: () => void
	/** True once the user has edited a detected field themselves. */
	overridden: boolean
}

/**
 * What detection concluded, and why.
 *
 * The evidence is collapsed but always reachable. A prefilled build command
 * that a user cannot trace back to a file in their repository is worse than an
 * empty one — they have to verify it anyway, and now they also have to work out
 * where it came from.
 */
export function DetectionNotice({
	detection,
	isLoading,
	isError,
	onApply,
	overridden,
}: Readonly<DetectionNoticeProps>) {
	const [open, setOpen] = useState(false)

	if (isLoading) {
		return (
			<p className="flex items-center gap-2 text-[12px] text-muted-foreground">
				<Loader2 className="size-3.5 animate-spin" />
				Inspecting the repository…
			</p>
		)
	}

	// Detection failing is not an error the user must act on — the fields simply
	// stay as they are and they fill them in.
	if (isError || !detection) return null

	if (!detection.detected) {
		return (
			<div className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2.5">
				<TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
				<p className="text-[11px] text-muted-foreground">
					No <code className="font-mono">package.json</code> here, so the build settings
					below are platform defaults rather than anything read from your repository.
					{detection.root_candidates.length > 0 &&
						" If this is a monorepo, set the root directory to the app you want to deploy."}
				</p>
			</div>
		)
	}

	const uncertain = detection.confidence === "low"

	return (
		<div
			className={`rounded-lg border px-3 py-2.5 ${
				uncertain ? "border-status-warning/25" : "border-status-info/25"
			}`}
		>
			<div className="flex flex-wrap items-center gap-2">
				<Sparkles
					className={`size-3.5 shrink-0 ${uncertain ? "text-status-warning" : "text-status-info"}`}
				/>
				<p className="flex-1 text-[12px] font-medium">
					{uncertain
						? "Guessed these settings — check them"
						: "Detected these settings from your repository"}
				</p>
				{overridden && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-[11px]"
						onClick={onApply}
					>
						Reset to detected
					</Button>
				)}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
					onClick={() => {
						setOpen((current) => !current)
					}}
				>
					{open ? (
						<ChevronDown className="size-3" />
					) : (
						<ChevronRight className="size-3" />
					)}
					Why
				</Button>
			</div>

			{open && (
				<ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
					{detection.evidence.map((line) => (
						<li key={line} className="font-mono text-[11px] text-muted-foreground">
							{line}
						</li>
					))}
					{detection.truncated && (
						<li className="text-[11px] text-status-warning">
							The repository is large enough that GitHub capped the file listing —
							some directories may be missing from the root candidates.
						</li>
					)}
				</ul>
			)}
		</div>
	)
}
