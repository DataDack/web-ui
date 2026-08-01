import { Loader2, X } from "lucide-react"

import { CopyButton } from "@/components/console"
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { LogBody } from "./LogBody"
import { LogToolbar } from "./LogToolbar"
import { useLogView } from "./useLogView"
import { BuildProgressBar, BuildStatusPill } from "../../../components"
import { useBuild, useBuildLogs, useCancelBuild } from "../../../managed-apps.hooks"
import { isBuildTransitional } from "../../../managed-apps.types"
import { formatDuration, isTimeSet, shortSha, timeSince, triggerLabel } from "../build-format"

interface BuildLogConsoleProps {
  buildId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One build's log, in a side sheet.
 *
 * Follow starts on for a running build and off for a settled one — nobody
 * opening a finished failure wants to be thrown to the last line, and anyone
 * watching a live build does. Scrolling away turns it off; the toolbar turns it
 * back on.
 */
export function BuildLogConsole({ buildId, open, onOpenChange }: Readonly<BuildLogConsoleProps>) {
  const { data: build } = useBuild(buildId)
  const active = isBuildTransitional(build?.status)
  const { data: logs, isLoading } = useBuildLogs(buildId, active)
  const cancelBuild = useCancelBuild()

  const logText = logs?.text ?? ""
  const view = useLogView({ buildId, active, text: logText, isLoading })

  const description = build
    ? build.commit_message || `${triggerLabel(build.triggered_by)} deploy`
    : buildId

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="gap-2 border-b px-5 py-4">
          <SheetTitle className="flex flex-wrap items-center gap-2.5 pr-8">
            Build log
            {build && <BuildStatusPill status={build.status} />}
          </SheetTitle>
          <SheetDescription className="font-mono text-[12px]">
            {build?.commit_sha ? `${shortSha(build.commit_sha)} · ` : ""}
            {description}
          </SheetDescription>

          {build && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <span>Trigger: {triggerLabel(build.triggered_by)}</span>
                <span>
                  Started: {isTimeSet(build.started_at) ? timeSince(build.started_at) : "not yet"}
                </span>
                <span>
                  Duration:{" "}
                  {active ? "in progress" : formatDuration(build.started_at, build.finished_at)}
                </span>
                <CopyButton value={build.id} label="Copy build ID" />
                {build.status === "queued" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
                    disabled={cancelBuild.isPending}
                    onClick={() => {
                      cancelBuild.mutate(build.id)
                    }}
                  >
                    {cancelBuild.isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <X className="size-3" />
                    )}
                    Cancel build
                  </Button>
                )}
              </div>
              {active && <BuildProgressBar build={build} />}
            </>
          )}
        </SheetHeader>

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

        {build && build.build_error !== "" && (
          <div className="border-t px-5 py-3 font-mono text-[12px] text-destructive">
            {build.build_error}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
