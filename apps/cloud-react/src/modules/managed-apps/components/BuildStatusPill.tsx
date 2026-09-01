import { Badge, cn } from "@datadack/common-ui"
import { Loader2 } from "lucide-react"

import { TONE_CLASSES, type StatusTone } from "@/components/console/status-config"

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
  // "Ready" answered a question nobody asked (ready for what?). "Deployed" is
  // the same claim in the vocabulary the rest of the console already speaks:
  // the activity feed's terminal event says "Deployed and serving".
  ready: { tone: "success", label: "Deployed" },
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
  Object.entries(BUILD_STATUS_META),
)

interface BuildStatusPillProps {
  status: BuildStatus
  /** This is the exact build currently answering requests for the public URL. */
  serving?: boolean
  className?: string
}

/** Status pill for builds — in-flight statuses spin until the build settles. */
export function BuildStatusPill({
  status,
  serving = false,
  className,
}: Readonly<BuildStatusPillProps>) {
  const meta = STATUS_LOOKUP.get(status) ?? { tone: "neutral" as StatusTone, label: status }
  const tone = serving ? "success" : meta.tone

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2 py-1 font-mono text-[11px]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {serving ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      ) : (
        isBuildTransitional(status) && <Loader2 className="size-3 animate-spin" />
      )}
      {serving ? "Live deployment" : meta.label}
    </Badge>
  )
}
