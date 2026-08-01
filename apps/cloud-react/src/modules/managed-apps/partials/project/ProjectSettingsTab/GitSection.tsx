import { useState } from "react"

import { ExternalLink, GitPullRequest, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

import { FieldRow, KeyValueGrid, Section } from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { BranchSelect } from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useUpdateProject } from "../../../managed-apps.hooks"
import { isSetupComplete, type Project } from "../../../managed-apps.types"

/**
 * The Git connection.
 *
 * The repository and installation are immutable by design — connecting a
 * different repo means a new project, matching how the large PaaS products
 * behave. Only the tracked branch can move, so only it is a control.
 */
export function GitSection({ project }: Readonly<{ project: Project }>) {
    const [branch, setBranch] = useState(project.branch)
    const update = useUpdateProject(project.id)
    const setupDone = isSetupComplete(project.setup_state)

    return (
        <Section
            variant="panel"
            title="Git"
            description="Where this project's code comes from."
            actions={
                <Link
                    to={MANAGED_APPS_ROUTES.setup(project.id)}
                    className="text-[12px] text-status-info hover:underline"
                >
                    {setupDone ? "View workflow" : "Finish setup"}
                </Link>
            }
        >
            <div className="space-y-5">
                <KeyValueGrid
                    columns={3}
                    items={[
                        {
                            label: "Repository",
                            value: (
                                <a
                                    href={`https://github.com/${project.repo_owner}/${project.repo_name}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-mono text-[13px] text-status-info hover:underline"
                                >
                                    {project.repo_owner}/{project.repo_name}
                                    <ExternalLink className="size-3" />
                                </a>
                            ),
                        },
                        {
                            label: "Installation",
                            value: `#${String(project.installation_id)}`,
                            mono: true,
                        },
                        {
                            label: "Build workflow",
                            value: setupDone ? (
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

                <FieldRow
                    label="Tracked branch"
                    description="Every push to this branch triggers a build."
                >
                    <div className="sm:w-80">
                        <BranchSelect
                            installationId={project.installation_id}
                            owner={project.repo_owner}
                            repo={project.repo_name}
                            value={branch || undefined}
                            onChange={setBranch}
                        />
                    </div>
                </FieldRow>

                {!setupDone && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-status-warning/25 bg-status-warning-bg px-3 py-2.5">
                        <GitPullRequest className="size-3.5 shrink-0 text-status-warning" />
                        <span className="flex-1 text-[12px] text-muted-foreground">
                            The build workflow is not on this branch yet, so pushes will not build.
                        </span>
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                            <Link to={MANAGED_APPS_ROUTES.setup(project.id)}>Finish setup</Link>
                        </Button>
                    </div>
                )}

                <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={branch === project.branch || branch === "" || update.isPending}
                    onClick={() => {
                        update.mutate({ branch })
                    }}
                >
                    {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    Save branch
                </Button>
            </div>
        </Section>
    )
}
