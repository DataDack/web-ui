import { cn } from "@datadack/common-ui"

import { BuildProgressBar } from "../../../components"
import { useBuildLogs } from "../../../managed-apps.hooks"
import { isBuildTransitional, type Build } from "../../../managed-apps.types"
import { LogBody } from "../BuildLogConsole/LogBody"
import { LogToolbar } from "../BuildLogConsole/LogToolbar"
import { useBuildLifecycle } from "../BuildLogConsole/useBuildLifecycle"
import { useLogView } from "../BuildLogConsole/useLogView"

/**
 * The build's log, filling the page. Same shell as everywhere else a log is
 * shown (useLogView keeps the behaviours identical); the height is the one
 * thing that differs — the page owns the viewport, so the log gets most of it.
 */
export function BuildLogPanel({
  build,
  docked = false,
}: Readonly<{ build: Build; docked?: boolean }>) {
  const active = isBuildTransitional(build.status)
  const { data: logs, isLoading } = useBuildLogs(build.id, active)

  const logText = logs?.text ?? ""
  const view = useLogView({ buildId: build.id, active, text: logText, isLoading })
  const lifecycle = useBuildLifecycle(build)

  return (
    <div className={cn("flex min-h-0 flex-col", docked ? "h-52" : "h-full")}>
      {active && !docked && (
        <div className="border-b border-border/60 px-4 py-3">
          <BuildProgressBar build={build} />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LogToolbar
          active={active}
          following={view.following}
          onToggleFollow={view.toggleFollow}
          wrap={view.wrap}
          onToggleWrap={view.toggleWrap}
          onCopy={view.copy}
          onDownload={view.download}
          lineCount={view.lineCount}
          disabled={logText === ""}
        />
        <LogBody
          text={logText}
          wrap={view.wrap}
          following={view.following}
          onLeaveTail={view.leaveTail}
          placeholder={view.placeholder}
          {...lifecycle}
        />
      </div>

      {build.build_error !== "" && (
        <p className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 font-mono text-[12px] text-destructive">
          {build.build_error}
        </p>
      )}
    </div>
  )
}
