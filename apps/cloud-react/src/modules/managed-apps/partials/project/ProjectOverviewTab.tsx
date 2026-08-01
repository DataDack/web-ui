import { ExternalLink, GitBranch, GitPullRequest } from "lucide-react"
import { Link } from "react-router-dom"

import { KeyValueGrid, Section } from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
    const isN8n = project.project_type === "n8n"
    const { data: builds = [] } = useProjectBuilds(project.id)
    const latestBuild = builds.at(0)
    const state = deriveProjectState(project, latestBuild)
    const createBuild = useCreateBuild()
    const { data: defaults } = useBuildDefaults(project.project_type)

    /** Empty build fields inherit — show what will actually run. */
    const inherited = (value: string, fallback: string | undefined) =>
        value !== "" ? value : (fallback ?? "—")

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
                                    Finish setup
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
                description={isN8n ? undefined : "The branch this project builds and deploys from."}
                actions={
                    isN8n ? undefined : (
                        <Link
                            to={MANAGED_APPS_ROUTES.setup(project.id)}
                            className="text-[12px] text-status-info hover:underline"
                        >
                            {isSetupComplete(project.setup_state)
                                ? "View workflow"
                                : "Finish setup"}
                        </Link>
                    )
                }
            >
                {isN8n ? (
                    <p className="text-sm text-muted-foreground">
                        Managed n8n instance — provisioned by the platform, with no source
                        repository or build pipeline.
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
                            {
                                label: "Build workflow",
                                value: isSetupComplete(project.setup_state) ? (
                                    <Badge
                                        variant="outline"
                                        className="border-status-success/25 text-[11px] text-status-success"
                                    >
                                        on branch
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="border-status-warning/25 text-[11px] text-status-warning"
                                    >
                                        not merged
                                    </Badge>
                                ),
                            },
                        ]}
                    />
                )}
            </Section>

            {!isN8n && (
                <Section
                    variant="panel"
                    title="Build"
                    description="Empty fields inherit the platform default for this runtime."
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
                                value: project.root_dir || "./",
                                mono: true,
                            },
                            {
                                label: "Install command",
                                value: inherited(
                                    project.install_command,
                                    defaults?.install_command
                                ),
                                mono: true,
                            },
                            {
                                label: "Build command",
                                value: inherited(project.build_command, defaults?.build_command),
                                mono: true,
                            },
                            {
                                label: "Output directory",
                                value: inherited(project.output_dir, defaults?.output_dir),
                                mono: true,
                            },
                            {
                                label: "Created",
                                value: new Date(project.created_at).toLocaleString(),
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
