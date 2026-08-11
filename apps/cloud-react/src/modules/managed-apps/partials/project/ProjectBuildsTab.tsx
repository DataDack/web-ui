import { useCallback, useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Code2, Hammer, RotateCcw, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { Section } from "@/components/console"

import { Button, DataTable, EmptyState, type DataTableColumnMeta } from "@datadack/common-ui"

import {
  commitURL,
  formatDuration,
  isTimeSet,
  shortSha,
  timeSince,
  triggerLabel,
} from "./build-format"
import { BuildLogConsole } from "./BuildLogConsole"
import { LatestBuildLog } from "./LatestBuildLog"
import { SourceBrowser } from "./SourceBrowser"
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
  const { t } = useTranslation()
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
  // The open source browser, as a commit sha. Same reasoning as ?build= above —
  // a commit's code is linkable, and the deployment hero on the Overview tab
  // points straight at one rather than owning a second copy of this sheet.
  const codeRef = searchParams.get("code") ?? ""

  // One writer for both panels: setting either clears the other, because the
  // log sheet and the code sheet occupy the same side of the screen and only
  // the last one asked for should be showing. Memoized because the column
  // definitions close over it — an unstable identity rebuilds them every render.
  const setPanel = useCallback(
    (key: "build" | "code", value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(key === "build" ? "code" : "build")
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSelected = (id: string | null) => {
    setPanel("build", id)
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
        // Deliberately NOT an interactive column: the message is the widest
        // target in the row and clicking it should still open the log. Only the
        // sha itself swallows the click, below.
        cell: ({ row }) => (
          <span className="flex min-w-0 max-w-72 items-baseline gap-2">
            {row.original.commit_sha !== "" && (
              // Short here because seven characters identify a commit and forty
              // would push the message out of the row; the full sha is on the
              // title, which is what anyone copying one actually wants, and the
              // link goes to the commit on GitHub — this console's own "View
              // code" shows the tree, not the diff.
              <a
                href={commitURL(project.repo_owner, project.repo_name, row.original.commit_sha)}
                target="_blank"
                rel="noreferrer"
                title={row.original.commit_sha}
                // Without this the row's own handler also fires, so following
                // the link would open the build log behind the new tab.
                onClick={(event) => {
                  event.stopPropagation()
                }}
                className="shrink-0 font-mono text-[12px] text-muted-foreground hover:text-foreground hover:underline"
              >
                {shortSha(row.original.commit_sha)}
              </a>
            )}
            <span className="min-w-0 truncate text-[13px] text-foreground">
              {row.original.commit_message || `${triggerLabel(row.original.triggered_by)} deploy`}
            </span>
          </span>
        ),
      },
      {
        id: "code",
        header: "",
        // Its own control, so a click here opens the code and not the log.
        meta: { interactive: true } satisfies DataTableColumnMeta,
        // A build whose commit never resolved (queued, or failed before the
        // runner reported one) has no revision to show code at.
        cell: ({ row }) =>
          row.original.commit_sha === "" ? null : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-[12px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setPanel("code", row.original.commit_sha)
              }}
            >
              <Code2 className="size-3.5" />
              View code
            </Button>
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
          // One mutation object backs every row, so its bare `isPending` is
          // true for the whole column. Match it against the row it was fired
          // for, or all the buttons spin whenever any one of them is clicked.
          const cancelling = cancelBuild.isPending && cancelBuild.variables === build.id
          const rebuilding =
            createBuild.isPending &&
            typeof createBuild.variables === "object" &&
            createBuild.variables.commitSha === build.commit_sha
          if (build.status === "queued") {
            return (
              <div className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[12px] text-destructive hover:text-destructive"
                  disabled={cancelling}
                  onClick={() => {
                    cancelBuild.mutate(build.id)
                  }}
                  loading={cancelling}
                >
                  <X className="size-3" />
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
                disabled={rebuilding}
                onClick={() => {
                  createBuild.mutate({ projectId: project.id, commitSha: build.commit_sha })
                }}
                loading={rebuilding}
              >
                <RotateCcw className="size-3" />
                Redeploy
              </Button>
            </div>
          )
        },
      },
    ],
    [
      cancelBuild,
      createBuild,
      durationCell,
      project.id,
      project.repo_name,
      project.repo_owner,
      setPanel,
    ],
  )

  // The build behind the open code panel, for the sheet's subtitle. Matched on
  // the sha rather than carried in the query string: the message can be long,
  // and a URL is not the place to store it.
  const codeBuild = sortedBuilds.find((b) => b.commit_sha === codeRef)

  // Guarded on isLoading: `builds` is empty on the first render too, and without
  // this the tab claims there are no builds while the request is still in flight.
  //
  // Below every hook, not above them: this branch appears only once the fetch
  // settles, so returning from above the column memo changed the hook count
  // between two renders of the same component — React's "rendered fewer hooks
  // than expected" crash, on the empty state of every project's first visit.
  if (!isLoading && sortedBuilds.length === 0) {
    return (
      <EmptyState
        icon={Hammer}
        title={t("managedApps.projectBuildsTab.noBuildsYet")}
        description={
          project.project_type === "n8n"
            ? "n8n instances are provisioned without a build pipeline."
            : "Deploys show up here as soon as one is queued — push to the tracked branch or use Deploy now."
        }
      />
    )
  }

  // `.at()` rather than [0]: the empty history already returned above, but the
  // component must not depend on that ordering to stay type-safe.
  const latestBuild = sortedBuilds.at(0)

  return (
    <div className="space-y-5">
      {latestBuild && <LatestBuildLog build={latestBuild} />}

      <Section
        variant="panel"
        title={t("managedApps.projectBuildsTab.buildHistory")}
        description={t("managedApps.projectBuildsTab.newestFirstClickARowToOpenItsLog")}
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
          empty={
            <EmptyState icon={Hammer} title={t("managedApps.projectBuildsTab.noBuildsYet2")} />
          }
          error={buildsError ? "Failed to load" : undefined}
          onRetry={() => void refetchBuilds()}
          retryLabel={"Try again"}
          loading={isLoading}
        />
      </Section>

      <Section
        variant="panel"
        title={t("managedApps.projectBuildsTab.deploymentActivity")}
        description={t("managedApps.projectBuildsTab.everyLifecycleEventAcrossTheseBuildsNewestFi")}
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

      <SourceBrowser
        projectId={project.id}
        gitRef={codeRef}
        label={
          codeBuild
            ? codeBuild.commit_message || `${triggerLabel(codeBuild.triggered_by)} deploy`
            : undefined
        }
        open={codeRef !== ""}
        onOpenChange={(open) => {
          if (!open) setPanel("code", null)
        }}
      />
    </div>
  )
}
