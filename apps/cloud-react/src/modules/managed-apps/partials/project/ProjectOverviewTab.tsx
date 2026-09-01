import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  KeyValueGrid,
} from "@datadack/common-ui"
import { ChevronRight, GitPullRequest } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { CurrentDeploymentHero } from "./CurrentDeploymentHero"
import { DeploymentStats } from "./DeploymentStats"
import { LiveDeployConsole } from "./LiveDeployConsole"
import { RuntimePanel } from "./RuntimePanel"
import { ProjectTypeBadge } from "../../components"
import { shouldBanner, StateBanner } from "../../components/StateBanner"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useBuildDefaults, useCreateBuild, useProjectBuilds } from "../../managed-apps.hooks"
import { deriveProjectState } from "../../managed-apps.state"
import { isSetupComplete, type Project } from "../../managed-apps.types"

/**
 * Overview tab — what the project is doing, and, if asked, how it is built.
 *
 * Two boxes, not four. Build configuration rides the bottom edge of the
 * deployment card and the runtime facts sit in its grid, because a page whose
 * first question is "is it up" should not answer it with a box, then spend three
 * more on things that change twice in a project's life. Both are still there —
 * see CurrentDeploymentHero's fact grid and the disclosure below it.
 *
 * Build configuration stays collapsed by default: open, it put the page's least
 * urgent information directly under its most urgent, which is how a console
 * stops being scannable.
 */
export function ProjectOverviewTab({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const isN8n = project.project_type === "n8n"
  const { data: builds = [] } = useProjectBuilds(project.id)
  const latestBuild = builds.at(0)
  const state = deriveProjectState(project, latestBuild)
  const createBuild = useCreateBuild()
  const { data: defaults } = useBuildDefaults(project.project_type, project.node_version)

  /** Empty build fields inherit — show what will actually run. */
  const inherited = (value: string, fallback: string | undefined) =>
    value !== "" ? value : (fallback ?? "—")

  /**
   * Whether a field is the platform preset or the user's own value, said
   * without a badge on every row.
   *
   * Seven rows each carrying a "DEFAULT"/"CUSTOM" pill turned a reference table
   * into a wall of chips, and the chips were the loudest thing in it. Dimming
   * the inherited values encodes exactly the same fact in the typography: what
   * is bright is what someone chose.
   */
  const originClass = (value: string) =>
    value === "" ? "text-muted-foreground" : "text-foreground"

  // How many fields this project actually overrides — the one number worth
  // reading without opening the section.
  const overrides = [
    project.root_dir,
    project.node_version,
    project.install_command,
    project.build_command,
    project.output_dir,
  ].filter((value) => value !== "").length
  const overrideNoun = overrides === 1 ? "override" : "overrides"
  const overridesLabel =
    overrides === 0 ? "all platform defaults" : `${String(overrides)} ${overrideNoun}`

  /**
   * Seven fields that change perhaps twice in a project's life, so they ride
   * along the bottom edge of the deployment card rather than claiming a card of
   * their own. Closed — which is how it starts — it is one line saying where the
   * values came from; open, it is the same grid it always was.
   */
  const buildConfiguration = (
    <Collapsible className="border-t border-border/60">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <CollapsibleTrigger className="group flex min-w-0 items-center gap-2 text-left">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <span className="text-[13px] font-medium text-foreground">Build configuration</span>
          <span className="truncate text-[11px] text-muted-foreground">{overridesLabel}</span>
        </CollapsibleTrigger>
        <Link
          to={MANAGED_APPS_ROUTES.setup(project.id)}
          className="shrink-0 text-[12px] text-status-info hover:underline"
        >
          {isSetupComplete(project.setup_state) ? "View workflow" : "Finish setup"}
        </Link>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border/60 p-4">
          <KeyValueGrid
            columns={3}
            items={[
              {
                label: "Repository",
                value:
                  project.repo_owner && project.repo_name ? (
                    <a
                      href={`https://github.com/${project.repo_owner}/${project.repo_name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[13px] text-status-info hover:underline"
                    >
                      {project.repo_owner}/{project.repo_name}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                label: "Runtime · plan",
                value: (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <ProjectTypeBadge type={project.project_type} />
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] text-muted-foreground"
                    >
                      {project.plan}
                    </Badge>
                  </span>
                ),
              },
              {
                // Both halves, because they are not always the same answer:
                // the chosen major builds the project, and a static build is
                // served by Caddy whatever compiled it.
                label: "Environment",
                value: defaults ? (
                  <span className="font-mono text-[13px]">
                    <span className={originClass(project.node_version)}>
                      Node {inherited(project.node_version, defaults.node_version)}
                    </span>
                    <span className="text-muted-foreground"> · {defaults.runtime_image}</span>
                  </span>
                ) : (
                  "—"
                ),
              },
              {
                label: "Root directory",
                value: (
                  <span className={`font-mono text-[13px] ${originClass(project.root_dir)}`}>
                    {project.root_dir || "./"}
                  </span>
                ),
              },
              {
                label: "Install command",
                value: (
                  <span className={`font-mono text-[13px] ${originClass(project.install_command)}`}>
                    {inherited(project.install_command, defaults?.install_command)}
                  </span>
                ),
              },
              {
                label: "Build command",
                value: (
                  <span className={`font-mono text-[13px] ${originClass(project.build_command)}`}>
                    {inherited(project.build_command, defaults?.build_command)}
                  </span>
                ),
              },
              {
                label: "Output directory",
                value: (
                  <span className={`font-mono text-[13px] ${originClass(project.output_dir)}`}>
                    {inherited(project.output_dir, defaults?.output_dir)}
                  </span>
                ),
              },
              {
                label: "Created",
                value: new Date(project.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
                mono: true,
              },
            ]}
          />
          <p className="mt-4 text-[11px] text-muted-foreground">
            Dimmed values are the platform preset; bright values are this project&rsquo;s own.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )

  return (
    <div className="space-y-5">
      {shouldBanner(state) && (
        <StateBanner
          state={state}
          action={
            state.kind === "awaiting_setup" ? (
              <Button asChild size="sm" className="gap-1.5">
                <Link to={MANAGED_APPS_ROUTES.setup(project.id)}>
                  <GitPullRequest className="size-3.5" />
                  {t("managedApps.projectOverviewTab.finishSetup")}
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {/* The deployment and the two numbers that describe it, side by side.
          Both tiles read the gateway's own counters, so what the card claims is
          live and what the tiles claim it served come from the same place. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <CurrentDeploymentHero
            project={project}
            state={state}
            latestBuild={latestBuild}
            deploying={createBuild.isPending}
            onDeploy={() => {
              createBuild.mutate(project.id)
            }}
            footer={isN8n ? undefined : buildConfiguration}
          />
        </div>
        {!isN8n && <DeploymentStats project={project} />}
      </div>

      {/* Renders itself away the moment the build settles — see the component. */}
      <LiveDeployConsole projectId={project.id} build={latestBuild} />

      <RuntimePanel project={project} />
    </div>
  )
}
