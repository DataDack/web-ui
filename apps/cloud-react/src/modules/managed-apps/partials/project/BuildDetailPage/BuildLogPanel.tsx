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
export function BuildLogPanel({ build }: Readonly<{ build: Build }>) {
  const active = isBuildTransitional(build.status)
  const { data: logs, isLoading } = useBuildLogs(build.id, active)

  const logText = logs?.text ?? ""
  const view = useLogView({ buildId: build.id, active, text: logText, isLoading })
  const lifecycle = useBuildLifecycle(build)

  return (
    <div className="space-y-3">
      {active && <BuildProgressBar build={build} />}

      <div className="flex h-[68vh] flex-col overflow-hidden rounded-xl border border-border/60">
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
        <p className="font-mono text-[12px] text-destructive">{build.build_error}</p>
      )}
    </div>
  )
}
