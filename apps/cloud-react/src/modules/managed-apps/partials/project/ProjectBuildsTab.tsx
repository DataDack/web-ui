import { useMemo } from "react"

import { Skeleton } from "@DataDack/common-ui"
import { Hammer, Loader2, RotateCcw, X } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { EmptyState, Section, staggerDelay } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { formatDuration, isTimeSet, shortSha, timeSince, triggerLabel } from "./build-format"
import { BuildLogConsole } from "./BuildLogConsole"
import { LatestBuildLog } from "./LatestBuildLog"
import { ActivityTimeline, BuildStatusPill } from "../../components"
import { useCancelBuild, useCreateBuild, useProjectBuilds } from "../../managed-apps.hooks"
import { isBuildTransitional, type Build, type Project } from "../../managed-apps.types"

const HEADERS = ["Status", "Commit", "Trigger", "Started", "Duration", ""] as const

/**
 * Builds tab — deploy history, newest first.
 *
 * The open log lives in `?build=<id>` rather than component state, so a build
 * is linkable: the Activity panel on the overview page points straight at one,
 * and a refresh keeps it open.
 */
export function ProjectBuildsTab({ project }: Readonly<{ project: Project }>) {
  const { data: builds = [], isLoading } = useProjectBuilds(project.id)
  const cancelBuild = useCancelBuild()
  const createBuild = useCreateBuild()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedId = searchParams.get("build") ?? ""

  const setSelected = (id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set("build", id)
        else next.delete("build")
        return next
      },
      { replace: true },
    )
  }

  // Defensive sort — the API returns newest first, but the pills and log
  // viewer read much better when that ordering is guaranteed.
  const sortedBuilds = useMemo(
    () =>
      [...builds].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [builds],
  )

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

  if (sortedBuilds.length === 0) {
    return (
      <EmptyState
        icon={Hammer}
        title="No builds yet"
        description={
          project.project_type === "n8n"
            ? "n8n instances are provisioned without a build pipeline."
            : "Deploys show up here as soon as one is queued — push to the tracked branch or use Deploy now."
        }
      />
    )
  }

  const durationCell = (build: Build): string => {
    if (isBuildTransitional(build.status)) return "in progress"
    return formatDuration(build.started_at, build.finished_at)
  }

  // `.at()` rather than [0]: the empty history already returned above, but the
  // component must not depend on that ordering to stay type-safe.
  const latestBuild = sortedBuilds.at(0)

  return (
    <div className="space-y-5">
      {latestBuild && <LatestBuildLog build={latestBuild} />}

      <Section
        variant="panel"
        title="Build history"
        description="Newest first — click a row to open its log."
      >
        <div className="glass-1 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {HEADERS.map((header) => (
                  <TableHead
                    key={header || "actions"}
                    className="px-3 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBuilds.map((build, index) => (
                <TableRow
                  key={build.id}
                  className="group/row animate-content-enter cursor-pointer"
                  style={staggerDelay(index)}
                  onClick={() => {
                    setSelected(build.id)
                  }}
                >
                  <TableCell className="px-3">
                    <BuildStatusPill status={build.status} />
                  </TableCell>
                  <TableCell className="max-w-72 px-3">
                    <span className="flex min-w-0 items-baseline gap-2">
                      {build.commit_sha !== "" && (
                        <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                          {shortSha(build.commit_sha)}
                        </span>
                      )}
                      <span className="min-w-0 truncate text-[13px] text-foreground">
                        {build.commit_message || `${triggerLabel(build.triggered_by)} deploy`}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-[12px] text-muted-foreground">
                    {triggerLabel(build.triggered_by)}
                  </TableCell>
                  <TableCell className="px-3">
                    <span
                      className="font-mono text-[12px] whitespace-nowrap text-muted-foreground"
                      title={
                        isTimeSet(build.started_at)
                          ? new Date(build.started_at).toLocaleString()
                          : undefined
                      }
                    >
                      {isTimeSet(build.started_at) ? timeSince(build.started_at) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 font-mono text-[12px] whitespace-nowrap text-muted-foreground">
                    {durationCell(build)}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    {build.status === "queued" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[12px] text-destructive hover:text-destructive"
                        disabled={cancelBuild.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          cancelBuild.mutate(build.id)
                        }}
                      >
                        {cancelBuild.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <X className="size-3" />
                        )}
                        Cancel
                      </Button>
                    ) : (
                      // Rebuilding a past commit needs the commit — a build
                      // that never resolved one has nothing to redeploy.
                      build.commit_sha !== "" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-[12px] opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                          disabled={createBuild.isPending}
                          onClick={(event) => {
                            event.stopPropagation()
                            createBuild.mutate({
                              projectId: project.id,
                              commitSha: build.commit_sha,
                            })
                          }}
                        >
                          {createBuild.isPending ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          Redeploy
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        variant="panel"
        title="Deployment activity"
        description="Every lifecycle event across these builds, newest first."
      >
        <ActivityTimeline builds={sortedBuilds} />
      </Section>

      <BuildLogConsole
        buildId={selectedId}
        open={selectedId !== ""}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </div>
  )
}
