import { ExternalLink, FileCode2, PackageX, RotateCcw, ScrollText, X } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { AnimatedTabs } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { Button, EmptyState, Skeleton } from "@datadack/common-ui"

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

const BUILD_TABS = [
  { value: "log", label: "Build logs", icon: ScrollText },
  { value: "source", label: "Source", icon: FileCode2 },
]

/**
 * One build as a page — its log and the source it was built from.
 *
 * This replaces two side sheets that used to hang off the Builds tab. A build
 * is the thing a reader debugs: it deserves a URL that survives a refresh and
 * can be pasted into a ticket, a breadcrumb back out, and the full viewport —
 * a code browser in half a drawer answered "which file is this" by making the
 * reader horizontally scroll the answer.
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

  const requestedTab = searchParams.get("tab") ?? "log"
  const activeTab = BUILD_TABS.some((tab) => tab.value === requestedTab) ? requestedTab : "log"
  const setTab = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === "log") next.delete("tab")
        else next.set("tab", value)
        return next
      },
      { replace: true },
    )
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
          <div className="min-w-0">
            <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link to={MANAGED_APPS_ROUTES.root} className="hover:text-foreground">
                Managed Apps
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

          <div className="flex shrink-0 items-center gap-2">
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
        {activeTab === "log" && (
          <BuildWorkspaceSidebar
            build={build}
            project={project}
            artifactSize={artifactSize}
            serving={serving}
          />
        )}

        <section aria-label="Build workbench" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AnimatedTabs
            tabs={BUILD_TABS}
            value={activeTab}
            onChange={setTab}
            layoutId="build-detail-tabs"
            className="shrink-0 glass-1-bg"
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTab === "log" && <BuildLogPanel build={build} />}
            {activeTab === "source" && (
              <BuildSourcePanel
                projectId={id}
                gitRef={build.commit_sha}
                build={build}
                project={project}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
