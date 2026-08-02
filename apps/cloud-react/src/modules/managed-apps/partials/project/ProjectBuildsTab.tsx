import { useMemo } from "react"

import { Button, DataTable, EmptyState, type DataTableColumnMeta } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Hammer, Loader2, RotateCcw, X } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { Section } from "@/components/console"

import { formatDuration, isTimeSet, shortSha, timeSince, triggerLabel } from "./build-format"
import { BuildLogConsole } from "./BuildLogConsole"
import { LatestBuildLog } from "./LatestBuildLog"
import { ActivityTimeline, BuildStatusPill } from "../../components"
import { useCancelBuild, useCreateBuild, useProjectBuilds } from "../../managed-apps.hooks"
import { isBuildTransitional, type Build, type Project } from "../../managed-apps.types"

/**
 * Builds tab — deploy history, newest first.
 *
 * The open log lives in `?build=<id>` rather than component state, so a build
 * is linkable: the Activity panel on the overview page points straight at one,
 * and a refresh keeps it open.
 */
export function ProjectBuildsTab({ project }: Readonly<{ project: Project }>) {
  const {
    data: builds = [],
    isLoading,
    isError: buildsError,
    refetch: refetchBuilds,
  } = useProjectBuilds(project.id)
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

  // Guarded on isLoading: `builds` is empty on the first render too, and without
  // this the tab claims there are no builds while the request is still in flight.
  if (!isLoading && sortedBuilds.length === 0) {
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

  const columns = useMemo<ColumnDef<Build>[]>(
    () => [
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <BuildStatusPill status={row.original.status} />,
      },
      {
        id: "commit",
        header: "Commit",
        cell: ({ row }) => (
          <span className="flex min-w-0 max-w-72 items-baseline gap-2">
            {row.original.commit_sha !== "" && (
              <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                {shortSha(row.original.commit_sha)}
              </span>
            )}
            <span className="min-w-0 truncate text-[13px] text-foreground">
              {row.original.commit_message || `${triggerLabel(row.original.triggered_by)} deploy`}
            </span>
          </span>
        ),
      },
      {
        id: "trigger",
        header: "Trigger",
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {triggerLabel(row.original.triggered_by)}
          </span>
        ),
      },
      {
        id: "started",
        header: "Started",
        cell: ({ row }) => (
          <span
            className="font-mono text-[12px] whitespace-nowrap text-muted-foreground"
            title={
              isTimeSet(row.original.started_at)
                ? new Date(row.original.started_at).toLocaleString()
                : undefined
            }
          >
            {isTimeSet(row.original.started_at) ? timeSince(row.original.started_at) : "—"}
          </span>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <span className="font-mono text-[12px] whitespace-nowrap text-muted-foreground">
            {durationCell(row.original)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        // Holds its own buttons, so a click here must not open the log.
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const build = row.original
          if (build.status === "queued") {
            return (
              <div className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[12px] text-destructive hover:text-destructive"
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
                  Cancel
                </Button>
              </div>
            )
          }
          // Rebuilding a past commit needs the commit — a build that never
          // resolved one has nothing to redeploy.
          if (build.commit_sha === "") return null
          return (
            <div className="text-right">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[12px] opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                disabled={createBuild.isPending}
                onClick={() => {
                  createBuild.mutate({ projectId: project.id, commitSha: build.commit_sha })
                }}
              >
                {createBuild.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RotateCcw className="size-3" />
                )}
                Redeploy
              </Button>
            </div>
          )
        },
      },
    ],
    [cancelBuild, createBuild, durationCell, project.id],
  )

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
        <DataTable<Build>
          data={sortedBuilds}
          columns={columns}
          getRowId={(build) => build.id}
          onRowClick={(build) => {
            setSelected(build.id)
          }}
          // The Redeploy control only appears on the hovered row, which needs a
          // named hover group on the row itself.
          rowClassName="group/row"
          empty={<EmptyState icon={Hammer} title="No builds yet" />}
          error={buildsError ? "Failed to load" : undefined}
          onRetry={() => void refetchBuilds()}
          retryLabel={"Try again"}
          loading={isLoading}
        />
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
