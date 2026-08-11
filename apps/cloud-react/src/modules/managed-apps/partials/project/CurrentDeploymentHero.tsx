import { Code2, ExternalLink, GitBranch, Loader2, PackageCheck, Rocket } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button, CopyButton } from "@datadack/common-ui"

import { hostLabel, isTimeSet, shortSha, timeSince } from "./build-format"
import { BuildProgressBar, ProjectStateChip } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useDeployProject } from "../../managed-apps.hooks"
import type { ProjectState } from "../../managed-apps.state"
import { isBuildTransitional, type Build, type Project } from "../../managed-apps.types"

interface CurrentDeploymentHeroProps {
  project: Project
  state: ProjectState
  latestBuild?: Build
  onDeploy: () => void
  deploying: boolean
}

/**
 * What this project is doing right now, at the top of the page.
 *
 * The address is the headline, but it is only a link when something is actually
 * serving it. `project.url` is pure string concatenation server-side and exists
 * from the instant the row does — presenting it as a working link before a
 * runtime container exists is the single most misleading thing the old UI did.
 */
export function CurrentDeploymentHero({
  project,
  state,
  latestBuild,
  onDeploy,
  deploying,
}: Readonly<CurrentDeploymentHeroProps>) {
  const { t } = useTranslation()
  const settledAt =
    latestBuild && isTimeSet(latestBuild.finished_at) ? latestBuild.finished_at : null

  // Releasing the stored artifact is a different verb from queueing a build, so
  // it owns its own mutation here rather than widening this component's props
  // with a second onDeploy/deploying pair that only this branch would use.
  const deployProject = useDeployProject(project.id)
  // Only `built_pending_deploy` has an artifact sitting there with nothing
  // serving it. In every other state there is either nothing to release or
  // something already released, and the server would answer "not built yet".
  const canRelease = state.kind === "built_pending_deploy"

  return (
    <div className="glass-1 rounded-xl border border-border/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <ProjectStateChip state={state} />

          {project.url && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {state.urlReachable ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-1.5 truncate font-mono text-sm text-status-info hover:underline"
                >
                  {hostLabel(project.url)}
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              ) : (
                <>
                  <CopyButton value={project.url} label={hostLabel(project.url)} />
                  <span className="text-[11px] text-muted-foreground/70">
                    reserved — not serving yet
                  </span>
                </>
              )}
            </div>
          )}

          <p className="text-[12px] leading-relaxed text-muted-foreground">{state.detail}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {state.urlReachable && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={project.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Visit
              </a>
            </Button>
          )}
          {canRelease && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={deployProject.isPending}
              // Enabled on purpose: the platform's reason for
              // refusing is the server's 409 body, which the
              // mutation toasts verbatim. A disabled button would
              // hide the one explanation that exists.
              title="Release the artifact this build already produced onto a runtime container — no rebuild."
              onClick={() => {
                deployProject.mutate()
              }}
              loading={deployProject.isPending}
            >
              <PackageCheck className="size-3.5" />
              Release build
            </Button>
          )}
          {project.project_type !== "n8n" && (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!state.canDeploy || deploying}
              title={
                state.canDeploy
                  ? `Build ${project.branch || "main"} again from its latest commit.`
                  : state.detail
              }
              onClick={onDeploy}
            >
              {deploying ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Rocket className="size-3.5" />
              )}
              {state.kind === "awaiting_build" ? "Deploy now" : "Redeploy"}
            </Button>
          )}
        </div>
      </div>

      {latestBuild && isBuildTransitional(latestBuild.status) && (
        <BuildProgressBar build={latestBuild} className="mt-4" />
      )}

      {project.project_type !== "n8n" && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GitBranch className="size-3" />
            <span className="font-mono">{project.branch || "main"}</span>
          </span>
          {latestBuild?.commit_sha && (
            <>
              <span className="min-w-0 truncate">
                <span className="font-mono">{shortSha(latestBuild.commit_sha)}</span>
                {latestBuild.commit_message && <> {latestBuild.commit_message}</>}
              </span>
              {/* The code browser lives on the Builds tab, opened by ?code=.
                  Linking to it keeps one owner of that sheet instead of a
                  second copy here that would fetch the same tree again. */}
              <Link
                to={`${MANAGED_APPS_ROUTES.project(project.id)}?tab=builds&code=${latestBuild.commit_sha}`}
                className="flex items-center gap-1 text-status-info hover:underline"
              >
                <Code2 className="size-3" />
                View code
              </Link>
            </>
          )}
          {settledAt && <span>settled {timeSince(settledAt)}</span>}
          <Link
            to={`${MANAGED_APPS_ROUTES.project(project.id)}?tab=builds`}
            className="ml-auto text-status-info hover:underline"
          >
            {t("managedApps.currentDeploymentHero.buildHistory")}
          </Link>
        </div>
      )}
    </div>
  )
}
