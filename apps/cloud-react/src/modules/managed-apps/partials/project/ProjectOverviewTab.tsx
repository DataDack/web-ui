import { Badge, Button } from "@datadack/common-ui"
import { ExternalLink, GitBranch, GitPullRequest } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { KeyValueGrid, Section } from "@/components/console"

import { CurrentDeploymentHero } from "./CurrentDeploymentHero"
import { RuntimePanel } from "./RuntimePanel"
import { ProjectTypeBadge } from "../../components"
import { shouldBanner, StateBanner } from "../../components/StateBanner"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useBuildDefaults, useCreateBuild, useProjectBuilds } from "../../managed-apps.hooks"
import { deriveProjectState } from "../../managed-apps.state"
import { isSetupComplete, type Project } from "../../managed-apps.types"

/**
 * Overview tab — what the project is doing, where its code comes from, and how
 * it is built. The deployment state leads; configuration follows.
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
   * Whether a field is the platform preset or the user's own value, said out
   * loud. The old panel claimed "empty fields inherit the platform default"
   * while showing every field filled in — nothing on the page could tell a
   * reader which fields were theirs.
   */
  const originBadge = (value: string) => (
    <Badge
      variant="outline"
      className={
        value === ""
          ? "px-1.5 py-0 text-[9px] uppercase tracking-wide text-muted-foreground/70"
          : "border-brand-gold/30 px-1.5 py-0 text-[9px] uppercase tracking-wide text-brand-gold"
      }
    >
      {value === "" ? "default" : "custom"}
    </Badge>
  )

  // The old "Build workflow: on branch" chip, as a sentence a person can
  // read. The not-merged case keeps its warning chip in the grid — that one
  // is a call to action, not decoration.
  const sourceDescription = isSetupComplete(project.setup_state)
    ? `Deploys automatically on every push to ${project.branch || "main"}.`
    : "The branch this project builds and deploys from."

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

      <CurrentDeploymentHero
        project={project}
        state={state}
        latestBuild={latestBuild}
        deploying={createBuild.isPending}
        onDeploy={() => {
          createBuild.mutate(project.id)
        }}
      />

      <Section
        variant="panel"
        title="Source"
        description={isN8n ? undefined : sourceDescription}
        actions={
          isN8n ? undefined : (
            <Link
              to={MANAGED_APPS_ROUTES.setup(project.id)}
              className="text-[12px] text-status-info hover:underline"
            >
              {isSetupComplete(project.setup_state) ? "View workflow" : "Finish setup"}
            </Link>
          )
        }
      >
        {isN8n ? (
          <p className="text-sm text-muted-foreground">
            Managed n8n instance — provisioned by the platform, with no source repository or build
            pipeline.
          </p>
        ) : (
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
                      className="inline-flex items-center gap-1 font-mono text-[13px] text-status-info hover:underline"
                    >
                      {project.repo_owner}/{project.repo_name}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                label: "Branch",
                value: (
                  <span className="flex items-center gap-1.5 font-mono text-[13px]">
                    <GitBranch className="size-3.5 text-muted-foreground" />
                    {project.branch || "main"}
                  </span>
                ),
              },
              // Setup-complete is already the section's description sentence;
              // only the abnormal state earns a third column here.
              ...(isSetupComplete(project.setup_state)
                ? []
                : [
                    {
                      label: "Build workflow",
                      value: (
                        <Badge
                          variant="outline"
                          className="border-status-warning/25 text-[11px] text-status-warning"
                        >
                          not merged
                        </Badge>
                      ),
                    },
                  ]),
            ]}
          />
        )}
      </Section>

      {!isN8n && (
        <Section
          variant="panel"
          title="Build"
          description={t("managedApps.projectOverviewTab.fieldsMarkedDefaultUseThePlatformPreset")}
        >
          <KeyValueGrid
            columns={3}
            items={[
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
                label: "Root directory",
                value: (
                  <span className="flex items-center gap-1.5 font-mono text-[13px]">
                    {project.root_dir || "./"}
                    {originBadge(project.root_dir)}
                  </span>
                ),
              },
              {
                // Both halves, because they are not always the same answer: the
                // chosen major builds the project, and a static build is served
                // by Caddy whatever compiled it.
                label: "Environment",
                value: defaults ? (
                  <span className="font-mono text-[13px]">
                    Node {inherited(project.node_version, defaults.node_version)}{" "}
                    <span className="text-muted-foreground">· {defaults.runtime_image}</span>
                  </span>
                ) : (
                  "—"
                ),
              },
              {
                label: "Install command",
                value: (
                  <span className="flex items-center gap-1.5 font-mono text-[13px]">
                    {inherited(project.install_command, defaults?.install_command)}
                    {originBadge(project.install_command)}
                  </span>
                ),
              },
              {
                label: "Build command",
                value: (
                  <span className="flex items-center gap-1.5 font-mono text-[13px]">
                    {inherited(project.build_command, defaults?.build_command)}
                    {originBadge(project.build_command)}
                  </span>
                ),
              },
              {
                label: "Output directory",
                value: (
                  <span className="flex items-center gap-1.5 font-mono text-[13px]">
                    {inherited(project.output_dir, defaults?.output_dir)}
                    {originBadge(project.output_dir)}
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
        </Section>
      )}

      <RuntimePanel project={project} />
    </div>
  )
}
