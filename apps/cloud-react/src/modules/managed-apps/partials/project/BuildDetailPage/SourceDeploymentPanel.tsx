import { Button, Skeleton } from "@datadack/common-ui"
import { ExternalLink, KeyRound, Settings2 } from "lucide-react"
import { Link } from "react-router-dom"


import { BuildStatusPill, projectTypeLabel } from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useProjectEnv } from "../../../managed-apps.hooks"
import type { Build, Project } from "../../../managed-apps.types"
import { hostLabel, isTimeSet, timeSince } from "../build-format"

interface SourceDeploymentPanelProps {
  build: Build
  project?: Project
}

function DeploymentFact({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground/85">{value}</span>
    </div>
  )
}

/** Read-only runtime context beside the immutable source snapshot. */
export function SourceDeploymentPanel({ build, project }: Readonly<SourceDeploymentPanelProps>) {
  const { data: envNames = [], isLoading } = useProjectEnv(project?.id ?? "")

  return (
    <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-l border-border/60 glass-1-bg xl:flex">
      <div className="border-b border-border/60 px-4 py-3.5">
        <p className="text-[12px] font-semibold text-foreground">Deployment</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="border border-border/60 glass-1-bg p-3">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 rounded-full bg-status-success" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-foreground">
                  {project?.served ? "Active" : "Build preview"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {project ? projectTypeLabel(project.project_type) : "Managed app"}
                </p>
              </div>
            </div>
            <BuildStatusPill status={build.status} />
          </div>

          <div className="pt-2">
            <DeploymentFact
              label="Last deployed"
              value={isTimeSet(build.finished_at) ? timeSince(build.finished_at) : "In progress"}
            />
            <DeploymentFact
              label="Runtime"
              value={project?.node_version ? `Node ${project.node_version}` : "Platform default"}
            />
            {project?.url && (
              <DeploymentFact
                label="URL"
                value={
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-36 items-center gap-1 truncate font-mono text-primary hover:opacity-80"
                  >
                    <span className="truncate">{hostLabel(project.url)}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                }
              />
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-foreground">Environment</p>
            {project && (
              <Button asChild size="icon" variant="ghost" className="size-7">
                <Link
                  to={`${MANAGED_APPS_ROUTES.project(project.id)}?tab=settings&section=environment-variables`}
                  aria-label="Manage environment variables"
                  title="Manage environment variables"
                >
                  <Settings2 className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              {["env-a", "env-b", "env-c"].map((key) => (
                <Skeleton key={key} className="h-14 w-full" />
              ))}
            </div>
          )}

          {!isLoading && envNames.length === 0 && (
            <div className="border border-dashed border-border/60 px-3 py-4 text-center">
              <KeyRound className="mx-auto size-4 text-muted-foreground/60" aria-hidden />
              <p className="mt-2 text-[11px] text-muted-foreground">No variables configured.</p>
            </div>
          )}

          {!isLoading && envNames.length > 0 && (
            <div className="space-y-2">
              {envNames.map((variable) => (
                <div key={variable.key} className="border border-border/60 glass-1-bg px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className="truncate font-mono text-[10px] text-muted-foreground"
                      title={variable.key}
                    >
                      {variable.key}
                    </p>
                    {/* Only when it is narrowed: every variable being labelled
										    "production, preview" is noise on a panel this small. */}
                    {variable.targets.length === 1 && (
                      <span className="shrink-0 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                        {variable.targets[0]}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-1 font-mono text-[11px] text-primary/80"
                    aria-label="Value hidden"
                  >
                    ••••••••••••
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
