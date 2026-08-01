import { ExternalLink } from "lucide-react"

import { Section } from "@/components/console"

import { formatDuration, isTimeSet, shortSha, timeSince, triggerLabel } from "./build-format"
import { LogBody } from "./BuildLogConsole/LogBody"
import { LogToolbar } from "./BuildLogConsole/LogToolbar"
import { useLogView } from "./BuildLogConsole/useLogView"
import { BuildProgressBar, BuildStatusPill } from "../../components"
import { useBuild, useBuildLogs } from "../../managed-apps.hooks"
import { isBuildTransitional, type Build } from "../../managed-apps.types"

/**
 * The newest build's log, inline above the history table.
 *
 * Landing on the Builds tab while something is building and being shown only a
 * table of rows is the wrong answer: the output is what the user came for. The
 * sheet still exists for reading any older build; this is the one that is
 * always on screen, so it follows the tail while the build runs.
 *
 * `build` is the list row, used until `useBuild` returns — the row is already
 * loaded, so the header renders immediately instead of flashing empty, and the
 * per-build query then keeps status and timings fresh at its own cadence.
 */
export function LatestBuildLog({ build }: Readonly<{ build: Build }>) {
  const { data: fresh } = useBuild(build.id)
  const current = fresh ?? build
  const active = isBuildTransitional(current.status)
  const { data: logs, isLoading } = useBuildLogs(current.id, active)

  const logText = logs?.text ?? ""
  const view = useLogView({ buildId: current.id, active, text: logText, isLoading })

  return (
    <Section
      variant="panel"
      title="Latest build"
      description={current.commit_message || `${triggerLabel(current.triggered_by)} deploy`}
      actions={
        <>
          <BuildStatusPill status={current.status} />
          {current.gh_run_url !== "" && (
            <a
              href={current.gh_run_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[12px] text-status-info hover:underline"
            >
              View on GitHub
              <ExternalLink className="size-3" />
            </a>
          )}
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        {current.commit_sha !== "" && <span>{shortSha(current.commit_sha)}</span>}
        <span>
          Started: {isTimeSet(current.started_at) ? timeSince(current.started_at) : "not yet"}
        </span>
        <span>
          Duration:{" "}
          {active ? "in progress" : formatDuration(current.started_at, current.finished_at)}
        </span>
      </div>

      {active && <BuildProgressBar build={current} className="mb-3" />}

      {/* LogBody is `flex-1 overflow-auto`, so the scroll guard only works
			    against a bounded height — the sheet gets that from the viewport. */}
      <div className="flex h-80 flex-col overflow-hidden rounded-lg border border-border/60">
        <LogToolbar
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
        />
      </div>

      {current.build_error !== "" && (
        <p className="mt-3 font-mono text-[12px] text-destructive">{current.build_error}</p>
      )}
    </Section>
  )
}
