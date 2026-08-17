import { Button, EmptyState, Skeleton } from "@datadack/common-ui"
import { ExternalLink, FileCode2, Package, PackageX, RotateCcw, ScrollText, X } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { AnimatedTabs, ComingSoonPanel } from "@/components/console"
import { useScreen } from "@/services/api/screen"


import { BuildLogPanel } from "./BuildLogPanel"
import { BuildSourcePanel } from "./BuildSourcePanel"
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
import {
  commitURL,
  formatDuration,
  isTimeSet,
  shortDateTime,
  shortSha,
  timeSince,
  triggerLabel,
} from "../build-format"

const BUILD_TABS = [
  { value: "log", label: "Log", icon: ScrollText },
  { value: "source", label: "Source", icon: FileCode2 },
  { value: "output", label: "Output", icon: Package },
]

/**
 * One build as a page — its log, the source it was built from, and (soon) the
 * artifact it produced.
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
        description={`No build with id "${buildId}" exists on this project.`}
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

  return (
    <div className="animate-content-enter">
      {/* Breadcrumb back out — the page is deep enough that a bare back arrow
          would not say where it lands. */}
      <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link to={MANAGED_APPS_ROUTES.root} className="hover:text-foreground hover:underline">
          Managed Apps
        </Link>
        <span className="text-border">/</span>
        <Link to={MANAGED_APPS_ROUTES.project(id)} className="hover:text-foreground hover:underline">
          {project?.name ?? "Project"}
        </Link>
        <span className="text-border">/</span>
        <Link to={backTo} className="hover:text-foreground hover:underline">
          Builds
        </Link>
        <span className="text-border">/</span>
        <span className="font-mono text-foreground">
          {build.commit_sha !== "" ? shortSha(build.commit_sha) : shortSha(build.id)}
        </span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Build</h1>
            <BuildStatusPill status={build.status} />
            {serving && (
              <span className="font-mono text-[11px] text-status-success">● serving</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
            {build.commit_sha !== "" && (
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wide">Commit</span>
                <a
                  href={commitURL(
                    project?.repo_owner ?? "",
                    project?.repo_name ?? "",
                    build.commit_sha,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  title={build.commit_sha}
                  className="font-mono hover:text-foreground hover:underline"
                >
                  {shortSha(build.commit_sha)}
                </a>
                {build.commit_message && (
                  <span className="min-w-0 truncate italic">“{build.commit_message}”</span>
                )}
              </span>
            )}
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide">Trigger</span>
              {triggerLabel(build.triggered_by)}
            </span>
            {isTimeSet(build.started_at) && (
              <span
                className="flex items-baseline gap-1.5"
                title={new Date(build.started_at).toLocaleString()}
              >
                <span className="font-mono text-[10px] uppercase tracking-wide">Started</span>
                {shortDateTime(build.started_at)} · {timeSince(build.started_at)}
              </span>
            )}
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide">Build time</span>
              {active ? "in progress" : formatDuration(build.started_at, build.finished_at)}
            </span>
            {artifactSize !== "" && (
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wide">Artifact</span>
                {artifactSize}
              </span>
            )}
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

      <AnimatedTabs
        tabs={BUILD_TABS}
        value={activeTab}
        onChange={setTab}
        layoutId="build-detail-tabs"
        className="mb-5"
      />

      {activeTab === "log" && <BuildLogPanel build={build} />}
      {activeTab === "source" && (
        <BuildSourcePanel projectId={id} gitRef={build.commit_sha} />
      )}
      {activeTab === "output" && (
        <ComingSoonPanel
          icon={Package}
          description={
            artifactSize === ""
              ? "Browsing what a build produced — the artifact's contents, file by file — is on the way."
              : `Browsing what this build produced — its ${artifactSize} artifact, file by file — is on the way.`
          }
        />
      )}
    </div>
  )
}
