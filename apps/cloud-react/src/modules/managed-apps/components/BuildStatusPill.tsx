import { Loader2 } from "lucide-react"

import { TONE_CLASSES, type StatusTone } from "@/components/console/status-config"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { type BuildStatus, isBuildTransitional } from "../managed-apps.types"

// Build lifecycle statuses are managed-apps-specific (uploading/built/…), so
// they get their own tone map instead of the global status-config vocabulary.
const BUILD_STATUS_META: Record<BuildStatus, { tone: StatusTone; label: string }> = {
	queued: { tone: "info", label: "Queued" },
	// Legacy: pre-Actions rows only. The runner clones; we never observe it.
	cloning: { tone: "info", label: "Cloning" },
	building: { tone: "info", label: "Building" },
	uploading: { tone: "info", label: "Uploading" },
	// A resting state, not a failure and not live: the artifact is stored and
	// verified, with no runtime fleet to hand it to yet.
	built: { tone: "warning", label: "Built" },
	deploying: { tone: "info", label: "Deploying" },
	ready: { tone: "success", label: "Ready" },
	failed: { tone: "danger", label: "Failed" },
	canceled: { tone: "neutral", label: "Canceled" },
	superseded: { tone: "neutral", label: "Superseded" },
}

/**
 * The same table, reachable by an arbitrary string.
 *
 * The Record above is kept so adding a BuildStatus fails to compile without a
 * meta entry; this Map is how it is *read*, because `status` is whatever the
 * API sent. A status added server-side since this bundle was built would index
 * a Record to undefined and take the surrounding page down through the error
 * boundary — Map.get is honestly typed as possibly-missing.
 */
const STATUS_LOOKUP = new Map<string, { tone: StatusTone; label: string }>(
	Object.entries(BUILD_STATUS_META)
)

interface BuildStatusPillProps {
	status: BuildStatus
	className?: string
}

/** Status pill for builds — in-flight statuses spin until the build settles. */
export function BuildStatusPill({ status, className }: Readonly<BuildStatusPillProps>) {
	const meta = STATUS_LOOKUP.get(status) ?? { tone: "neutral" as StatusTone, label: status }

	return (
		<Badge
			variant="outline"
			className={cn("gap-1.5 font-mono text-[11px]", TONE_CLASSES[meta.tone], className)}
		>
			{isBuildTransitional(status) && <Loader2 className="size-3 animate-spin" />}
			{meta.label}
		</Badge>
	)
}
