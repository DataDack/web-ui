import { Maximize2 } from "lucide-react"
import { Link } from "react-router-dom"

import { BuildLogPanel } from "./BuildDetailPage/BuildLogPanel"
import { BuildStatusPill } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { isBuildTransitional, type Build } from "../../managed-apps.types"

/**
 * The running deploy's output, on the page that started it.
 *
 * Pressing Deploy and being shown a progress bar is the moment this console was
 * weakest: the one thing a person wants in the next thirty seconds is the log,
 * and reaching it meant leaving the project for the builds tab and then for the
 * build. So it comes here instead, for exactly as long as it is live — the
 * panel unmounts when the build settles, because a finished log pinned to the
 * top of the overview is history competing with status.
 *
 * It is the same BuildLogPanel the build page uses, in its docked size. Not a
 * second smaller log viewer: follow, wrap, copy and download behave identically
 * in both places because there is only one implementation of them.
 */
export function LiveDeployConsole({
  projectId,
  build,
}: Readonly<{ projectId: string; build?: Build }>) {
  if (!build || !isBuildTransitional(build.status)) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 glass-1-bg">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">Deploying</span>
          <BuildStatusPill status={build.status} />
          {build.commit_message && (
            <span className="min-w-0 truncate text-[11px] italic text-muted-foreground">
              “{build.commit_message}”
            </span>
          )}
        </div>
        {/* The docked log is a window onto a build, not a replacement for its
            page — the source tree, the waterfall and the artifact live there. */}
        <Link
          to={MANAGED_APPS_ROUTES.build(projectId, build.id)}
          className="flex shrink-0 items-center gap-1 text-[12px] text-status-info hover:underline"
        >
          <Maximize2 className="size-3" />
          Full log
        </Link>
      </div>
      <BuildLogPanel build={build} docked />
    </div>
  )
}
