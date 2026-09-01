import type { ReactNode } from "react"

import {
  Button,
  CopyButton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import {
  ChevronDown,
  Code2,
  ExternalLink,
  GitBranch,
  Loader2,
  PackageCheck,
  Rocket,
} from "lucide-react"
import { Link } from "react-router-dom"

import { commitURL, hostLabel, isTimeSet, shortSha, timeSince } from "./build-format"
import { BuildProgressBar, ProjectStateChip, SitePreview } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useCreateBuild, useDeployProject } from "../../managed-apps.hooks"
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
 * One labelled fact. The label is quiet and the value is not, which is the
 * whole typographic trick behind a deployment card that can be read at a
 * glance: the eye skips the greys and lands on the answers.
 */
function Fact({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-normal text-muted-foreground">{label}</p>
      <div className="min-w-0 text-[13px] text-foreground">{children}</div>
    </div>
  )
}

/**
 * What this project is doing right now, at the top of the page.
 *
 * Deliberately sparse. An earlier version of this card carried a status chip, a
 * URL, an explanatory sentence, four buttons and a six-item metadata strip, and
 * the effect of packing that much into one box is that none of it is read — the
 * reader's three questions (is it up, what is serving, where did it come from)
 * were competing with their own answers. So it is four labelled facts and the
 * site itself, and everything that is not one of those either moved behind a
 * disclosure or was already somewhere better.
 *
 * The address is only a link when something is actually serving it.
 * `project.url` is pure string concatenation server-side and exists from the
 * instant the row does — presenting it as a working link before a runtime
 * container exists is the single most misleading thing this page can do.
 */
export function CurrentDeploymentHero({
  project,
  state,
  latestBuild,
  onDeploy,
  deploying,
}: Readonly<CurrentDeploymentHeroProps>) {
  const settledAt =
    latestBuild && isTimeSet(latestBuild.finished_at) ? latestBuild.finished_at : null

  // Releasing the stored artifact is a different verb from queueing a build, so
  // it owns its own mutation here rather than widening this component's props
  // with a second onDeploy/deploying pair that only this branch would use.
  const deployProject = useDeployProject(project.id)
  // Same trade for the split menu's second entry: rebuilding the release's
  // exact commit is this component's own alternative to onDeploy, not
  // something every caller should have to wire.
  const rebuildRelease = useCreateBuild()
  // Only `built_pending_deploy` has an artifact sitting there with nothing
  // serving it. In every other state there is either nothing to release or
  // something already released, and the server would answer "not built yet".
  const canRelease = state.kind === "built_pending_deploy"
  const isN8n = project.project_type === "n8n"

  return (
    <div className="rounded-xl border border-border/60 glass-1-bg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
        <h2 className="text-[13px] font-medium text-foreground">Current deployment</h2>

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
              // Enabled on purpose: the platform's reason for refusing is the
              // server's 409 body, which the mutation toasts verbatim. A
              // disabled button would hide the one explanation that exists.
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
          {!isN8n && (
            <div className="flex items-center">
              <Button
                size="sm"
                className={
                  // Squared toward the caret when the menu is present, so the
                  // pair reads as one split control rather than two buttons.
                  latestBuild?.commit_sha ? "gap-1.5 rounded-r-none" : "gap-1.5"
                }
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
              {/* The caret exists to make "Redeploy" unambiguous: the primary
                  button builds the branch head, the menu spells that out and
                  offers the release's exact commit as the alternative. No menu
                  before the first build — there is no release to rebuild. */}
              {latestBuild?.commit_sha ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="rounded-l-none border-l border-l-background/30 px-1.5"
                      disabled={!state.canDeploy || deploying}
                      aria-label="Redeploy options"
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={onDeploy}>
                      <span className="flex flex-col gap-0.5">
                        <span>Redeploy latest commit</span>
                        <span className="text-[11px] text-muted-foreground">
                          Builds {project.branch || "main"} at its current head
                        </span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        rebuildRelease.mutate({
                          projectId: project.id,
                          commitSha: latestBuild.commit_sha,
                        })
                      }}
                    >
                      <span className="flex flex-col gap-0.5">
                        <span>Rebuild this release</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Re-runs the build for {shortSha(latestBuild.commit_sha)}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:gap-6">
        {/* The site itself, ahead of everything written about it. A deploy
            console's first question is "what is live right now", and an address
            plus a status word is a poor answer to it when the thing being
            described is a web page that can simply be shown. */}
        <SitePreview
          url={project.url}
          reachable={state.urlReachable}
          reloadKey={latestBuild?.id ?? ""}
          className="aspect-[16/10] w-full shrink-0 lg:w-72 xl:w-80"
        />

        <div className="grid min-w-0 flex-1 gap-5 sm:grid-cols-2">
          {project.url && (
            <Fact label="Deployment">
              {state.urlReachable ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-1.5 truncate font-mono text-status-info hover:underline"
                >
                  {hostLabel(project.url)}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <CopyButton value={project.url} label={hostLabel(project.url)} />
                  <span className="text-[11px] text-muted-foreground/70">
                    reserved — not serving yet
                  </span>
                </span>
              )}
            </Fact>
          )}

          <Fact label="Status">
            <span className="flex flex-col items-start gap-1.5">
              <ProjectStateChip state={state} />
              {/* The explanatory sentence earns its space only when something
                  is wrong. On a healthy project it restated the chip. */}
              {!state.urlReachable && (
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  {state.detail}
                </span>
              )}
            </span>
          </Fact>

          {!isN8n && (
            <Fact label="Source">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1.5 font-mono">
                  <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                  {project.branch || "main"}
                </span>
                {latestBuild?.commit_sha && (
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    {/* The sha links to the commit on GitHub — "View code"
                        shows the tree, not the diff. */}
                    <a
                      href={commitURL(
                        project.repo_owner,
                        project.repo_name,
                        latestBuild.commit_sha,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      title={latestBuild.commit_sha}
                      className="shrink-0 font-mono text-[12px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {shortSha(latestBuild.commit_sha)}
                    </a>
                    {latestBuild.commit_message && (
                      <span
                        className="min-w-0 truncate text-[12px] text-muted-foreground"
                        title={latestBuild.commit_message}
                      >
                        {latestBuild.commit_message}
                      </span>
                    )}
                  </span>
                )}
                {latestBuild?.commit_sha && (
                  <Link
                    to={`${MANAGED_APPS_ROUTES.build(project.id, latestBuild.id)}?tab=source`}
                    className="flex items-center gap-1 text-[12px] text-status-info hover:underline"
                  >
                    <Code2 className="size-3" />
                    View code
                  </Link>
                )}
              </span>
            </Fact>
          )}

          {settledAt && (
            <Fact label="Deployed">
              <span title={new Date(settledAt).toLocaleString()}>{timeSince(settledAt)}</span>
            </Fact>
          )}
        </div>
      </div>

      {latestBuild && isBuildTransitional(latestBuild.status) && (
        <div className="border-t border-border/60 px-5 py-3">
          <BuildProgressBar build={latestBuild} />
        </div>
      )}
    </div>
  )
}
