import { Button, EmptyState, Skeleton } from "@datadack/common-ui"
import { ArrowLeft, Code2, ExternalLink, PackageX, RotateCcw, ScrollText, X } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { useScreen } from "@/services/api/screen"

import { BuildLogPanel } from "./BuildLogPanel"
import { BuildSourcePanel } from "./BuildSourcePanel"
import { BuildWorkspaceSidebar } from "./BuildWorkspaceSidebar"
import { BuildStatusPill } from "../../../components"
import { formatArtifactBytes } from "../../../components/ActivityTimeline/activity-events"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import {
  useBuild,
  useCancelBuild,
  useCreateBuild,
  useProject,
  useProjectBuilds,
} from "../../../managed-apps.hooks"
import { isBuildTransitional } from "../../../managed-apps.types"
import { commitURL, formatDuration, shortSha, triggerLabel } from "../build-format"

/**
 * One build as a page — its log and the source it was built from.
 *
 * This replaces two side sheets that used to hang off the Builds tab. A build
 * is the thing a reader debugs: it deserves a URL that survives a refresh and
 * can be pasted into a ticket, a breadcrumb back out, and the full viewport —
 * a code browser in half a drawer answered "which file is this" by making the
 * reader horizontally scroll the answer.
 *
 * THE LOG IS THE PAGE; the source is a place you go. They were two tabs of
 * equal rank, which was a poor description of how the page is used: a build is
 * opened to read its log essentially every time, and the tab bar spent a
 * permanent strip of the workbench asking a question already answered. So the
 * log now fills the workbench with nothing above it, and the source browser is
 * reached from a button in the header, beside the other places this build can
 * be looked at from — the Actions run and the commit.
 *
 * ?tab=source still selects it, so every existing deep link — the Builds
 * table's own "Browse source", anything pasted into a ticket — keeps working.
 */
export function BuildDetailPage() {
  useScreen("managed-apps-build-detail")
  const navigate = useNavigate()
  const { id = "", buildId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: project } = useProject(id)
  const { data: build, isLoading, isError } = useBuild(buildId)
  // Already cached by the Builds tab this page is reached from; used only to
  // mark the serving build — the newest deployed row is what the URL serves.
  const { data: builds = [] } = useProjectBuilds(id)
  const createBuild = useCreateBuild()
  const cancelBuild = useCancelBuild()

  // Only two views, and anything unrecognised is the log — a bad ?tab= should
  // land somewhere useful rather than on an empty workbench.
  const activeTab = searchParams.get("tab") === "source" ? "source" : "log"
  // Pushed onto history rather than replacing it. The tab strip these two views
  // used to share made switching feel like nothing happened, so replacing was
  // right; now the source browser takes the whole workbench and reads as a place
  // you went, and Back has to come back from it instead of leaving the build.
  const setTab = (value: "log" | "source") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === "log") next.delete("tab")
      else next.set("tab", value)
      return next
    })
  }

  const backTo = `${MANAGED_APPS_ROUTES.project(id)}?tab=builds`

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (isError || !build) {
    return (
      <EmptyState
        icon={PackageX}
        title="Build not found"
        description={`No build with id “${buildId}” exists on this project.`}
        action={{
          label: "Back to builds",
          onClick: () => void navigate(backTo),
        }}
      />
    )
  }

  // One decision, read by the header toggle, the sidebar and the workbench, so
  // the three cannot disagree about which view is on screen. A ?tab=source on a
  // build with no commit resolves to the log: there is no tree at a ref that
  // does not exist.
  const showSource = activeTab === "source" && build.commit_sha !== ""
  const active = isBuildTransitional(build.status)
  const serving =
    build.status === "ready" &&
    builds.find((candidate) => candidate.status === "ready")?.id === build.id
  const artifactSize = formatArtifactBytes(build.artifact_bytes)

  const buildLabel = build.commit_sha !== "" ? shortSha(build.commit_sha) : shortSha(build.id)
  const commitHref = commitURL(
    project?.repo_owner ?? "",
    project?.repo_name ?? "",
    build.commit_sha,
  )

  // This route opts into the shell's full-bleed mode, so the workbench can
  // fill the shell's remaining height directly without viewport calculations
  // or negative margins that leave a strip of shell background at the bottom.
  return (
    <div className="managed-apps-console flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/60 glass-1-bg px-4 py-3 md:px-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Link to={backTo} aria-label="Back to builds" title="Back to builds">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>

            <div className="min-w-0">
              <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <Link to={MANAGED_APPS_ROUTES.apps} className="hover:text-foreground">
                  Apps
                </Link>
                <span aria-hidden>/</span>
                <Link
                  to={MANAGED_APPS_ROUTES.project(id)}
                  className="max-w-40 truncate hover:text-foreground"
                >
                  {project?.name ?? "Project"}
                </Link>
                <span aria-hidden>/</span>
                <Link to={backTo} className="hover:text-foreground">
                  Builds
                </Link>
              </nav>

              <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
                <h1 className="truncate text-balance font-mono text-[16px] font-semibold text-foreground">
                  Build{" "}
                  {commitHref ? (
                    <a
                      href={commitHref}
                      target="_blank"
                      rel="noreferrer"
                      title={`Open commit ${build.commit_sha} on GitHub`}
                      className="inline-flex items-center gap-1 hover:text-brand-gold hover:underline"
                    >
                      {buildLabel}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    buildLabel
                  )}
                </h1>
                <BuildStatusPill status={build.status} />
                {serving && (
                  <span className="hidden items-center gap-1.5 text-[11px] text-status-success sm:flex">
                    <span className="size-1.5 rounded-full bg-status-success" aria-hidden />
                    Serving
                  </span>
                )}
              </div>

              <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground lg:hidden">
                <span className="truncate">{project?.branch ?? "No branch"}</span>
                <span aria-hidden>·</span>
                <span className="truncate">
                  {build.commit_message || triggerLabel(build.triggered_by)}
                </span>
                <span aria-hidden>·</span>
                <span className="shrink-0 font-mono tabular-nums">
                  {active ? "in progress" : formatDuration(build.started_at, build.finished_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* The way in and out of the source browser, and the reason there is
                no tab bar. It is a TOGGLE rather than a one-way door: the source
                view fills the workbench, so without a labelled way back the only
                exit is the browser's Back button or the breadcrumb, both of which
                leave the build.

                Hidden on a build with no commit — queued, or failed before a
                runner resolved one. There is no tree to browse at a ref that does
                not exist, and the panel behind it can only render its own error. */}
            {build.commit_sha !== "" &&
              (showSource ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setTab("log")
                  }}
                >
                  <ScrollText className="size-3.5" />
                  Build logs
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  title={`Browse the repository at ${shortSha(build.commit_sha)}`}
                  onClick={() => {
                    setTab("source")
                  }}
                >
                  <Code2 className="size-3.5" />
                  Source
                </Button>
              ))}
            {build.gh_run_url !== "" && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a href={build.gh_run_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  Actions run
                </a>
              </Button>
            )}
            {build.status === "queued" ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={cancelBuild.isPending}
                onClick={() => {
                  cancelBuild.mutate(build.id)
                }}
                loading={cancelBuild.isPending}
              >
                <X className="size-3.5" />
                Cancel
              </Button>
            ) : (
              build.commit_sha !== "" &&
              !active && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={createBuild.isPending}
                  title={`Re-runs the build for ${shortSha(build.commit_sha)}.`}
                  onClick={() => {
                    createBuild.mutate({ projectId: id, commitSha: build.commit_sha })
                  }}
                  loading={createBuild.isPending}
                >
                  <RotateCcw className="size-3.5" />
                  Rebuild this release
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden border-b border-border/60">
        {!showSource && (
          <BuildWorkspaceSidebar
            build={build}
            project={project}
            artifactSize={artifactSize}
            serving={serving}
          />
        )}

        {/* No tab strip above it: the workbench is one view at a time, chosen
            in the header, so the panel gets the whole height. */}
        <section aria-label="Build workbench" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            {showSource ? (
              <BuildSourcePanel
                projectId={id}
                gitRef={build.commit_sha}
                build={build}
                project={project}
              />
            ) : (
              <BuildLogPanel build={build} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
