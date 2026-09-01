import { useEffect, useMemo } from "react"

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DataTable,
  EmptyState,
  type DataTableColumnMeta,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { ChevronDown, Code2, Hammer, RotateCcw, ScrollText, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { Section } from "@/components/console"

import {
  commitURL,
  formatDuration,
  isTimeSet,
  shortDateTime,
  shortSha,
  timeSince,
  triggerFallbackLabel,
} from "./build-format"
import { ActivityTimeline, BuildStatusPill } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useCancelBuild, useCreateBuild, useProjectBuilds } from "../../managed-apps.hooks"
import { isBuildTransitional, type Build, type Project } from "../../managed-apps.types"

/**
 * Builds tab — deploy history, newest first, every row a door.
 *
 * A row opens the build's own page (log, source, output). The log and code
 * sheets that used to hang off this table are gone; ?build= and ?code= links
 * that predate the change are forwarded to the page so nothing bookmarked
 * breaks.
 */
export function ProjectBuildsTab({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    data: builds = [],
    isLoading,
    isError: buildsError,
    refetch: refetchBuilds,
  } = useProjectBuilds(project.id)
  const cancelBuild = useCancelBuild()
  const createBuild = useCreateBuild()
  const [searchParams] = useSearchParams()

  // Defensive sort — the API returns newest first, but the serving marker and
  // activity groups read much better when that ordering is guaranteed.
  const sortedBuilds = useMemo(
    () =>
      [...builds].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [builds],
  )

  // Legacy deep links: ?build=<id> used to open the log sheet, ?code=<sha> the
  // source sheet. Both now live on the build page — forward, replacing history
  // so Back does not bounce through the redirect.
  const legacyBuild = searchParams.get("build") ?? ""
  const legacyCode = searchParams.get("code") ?? ""
  useEffect(() => {
    if (legacyBuild !== "") {
      void navigate(MANAGED_APPS_ROUTES.build(project.id, legacyBuild), { replace: true })
      return
    }
    if (legacyCode !== "") {
      const match = sortedBuilds.find((build) => build.commit_sha === legacyCode)
      if (match) {
        void navigate(`${MANAGED_APPS_ROUTES.build(project.id, match.id)}?tab=source`, {
          replace: true,
        })
      }
    }
  }, [legacyBuild, legacyCode, navigate, project.id, sortedBuilds])

  // The build the public URL serves: deploys overwrite the runtime, so it is
  // the newest deployed row — not necessarily the newest row, which may have
  // failed after it.
  const servingId = sortedBuilds.find((build) => build.status === "ready")?.id

  const columns = useMemo<ColumnDef<Build>[]>(
    () => [
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="flex flex-col items-start gap-1">
            <BuildStatusPill status={row.original.status} />
            {row.original.id === servingId && (
              <span className="font-mono text-[10px] text-status-success">● serving</span>
            )}
          </span>
        ),
      },
      {
        id: "commit",
        header: "Commit",
        // Deliberately NOT an interactive column: the message is the widest
        // target in the row and clicking it should still open the build. Only
        // the sha itself swallows the click, below.
        cell: ({ row }) => (
          <span className="flex min-w-0 max-w-80 flex-col gap-0.5">
            <span className="flex min-w-0 items-baseline gap-2">
              {row.original.commit_sha !== "" && (
                // Short because seven characters identify a commit; the full
                // sha is on the title, and the link goes to the commit on
                // GitHub — the build page's Source tab shows the tree.
                <a
                  href={commitURL(project.repo_owner, project.repo_name, row.original.commit_sha)}
                  target="_blank"
                  rel="noreferrer"
                  title={row.original.commit_sha}
                  // Without this the row's own handler also fires, so following
                  // the link would open the build page behind the new tab.
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                  className="shrink-0 font-mono text-[12px] text-muted-foreground hover:text-foreground hover:underline"
                >
                  {shortSha(row.original.commit_sha)}
                </a>
              )}
              <span
                className="min-w-0 truncate text-[13px] text-foreground"
                title={row.original.commit_message || undefined}
              >
                {row.original.commit_message || triggerFallbackLabel(row.original.triggered_by)}
              </span>
            </span>
            {/* The first line of why it failed, on the row itself — a failure
                a reader must click to even see is a failure they scroll past. */}
            {row.original.status === "failed" && row.original.build_error !== "" && (
              <span className="min-w-0 truncate font-mono text-[11px] text-destructive">
                ↳ {row.original.build_error}
              </span>
            )}
          </span>
        ),
      },
      {
        id: "when",
        header: "Deployed",
        // When and how long, in one column. They were two, which spent a third
        // of the table's width on numbers nobody compares across rows — and the
        // pair is read as one thought anyway ("2d ago, took 13s").
        //
        // Relative on the surface, absolute on the title: a column of nothing
        // but "2d ago" cannot be correlated with anything, so the wall-clock
        // stamp stays one hover away rather than one column wider.
        cell: ({ row }) => {
          const duration = isBuildTransitional(row.original.status)
            ? "in progress"
            : formatDuration(row.original.started_at, row.original.finished_at)
          if (!isTimeSet(row.original.started_at)) {
            return <span className="font-mono text-[12px] text-muted-foreground">—</span>
          }
          return (
            <span
              className="font-mono text-[12px] whitespace-nowrap text-muted-foreground"
              title={`Started ${shortDateTime(row.original.started_at)} · ${new Date(row.original.started_at).toLocaleString()}`}
            >
              {timeSince(row.original.started_at)}
              <span className="text-muted-foreground/60"> · {duration}</span>
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "",
        // Holds its own buttons, so a click here must not open the build.
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
            <div className="flex items-center justify-end gap-1">
              {/* The two destinations a row actually has, stated rather than
                  implied. Removing the chevron made the row's door invisible;
                  naming the doors is better than restoring an arrow that said
                  only "something happens here" — and Code was reachable from
                  nowhere on this page once the chevron went. */}
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[12px] text-muted-foreground hover:text-foreground"
              >
                <Link to={MANAGED_APPS_ROUTES.build(project.id, build.id)}>
                  <ScrollText className="size-3" />
                  Logs
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[12px] text-muted-foreground hover:text-foreground"
                title={`Browse the repository at ${shortSha(build.commit_sha)}`}
              >
                <Link to={`${MANAGED_APPS_ROUTES.build(project.id, build.id)}?tab=source`}>
                  <Code2 className="size-3" />
                  Code
                </Link>
              </Button>
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
    [cancelBuild, createBuild, project.id, project.repo_name, project.repo_owner, servingId],
  )

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

  return (
    <div className="space-y-5">
      <Section
        variant="panel"
        title={t("managedApps.projectBuildsTab.buildHistory")}
        description={t("managedApps.projectBuildsTab.everyBuildNewestFirstOpenOneForItsLog")}
      >
        <DataTable<Build>
          data={sortedBuilds}
          columns={columns}
          getRowId={(build) => build.id}
          onRowClick={(build) => {
            void navigate(MANAGED_APPS_ROUTES.build(project.id, build.id))
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

      {/* Collapsed by default. The timeline restates the table above it, event
          by event — valuable when a deploy is being reconstructed after the
          fact, noise on every other visit, and it was the taller of the two. */}
      <Collapsible className="rounded-xl border border-border/60 glass-1-bg">
        <CollapsibleTrigger className="group flex w-full items-center gap-2 px-5 py-3 text-left">
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
          <span className="text-[13px] font-medium text-foreground">
            {t("managedApps.projectBuildsTab.deploymentActivity")}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {t("managedApps.projectBuildsTab.lifecycleEventsGroupedPerBuild")}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 p-5">
            <ActivityTimeline builds={sortedBuilds} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
