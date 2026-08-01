import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    GitPullRequest,
    Loader2,
    RefreshCw,
    Sparkles,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { EmptyState } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useScreen } from "@/services/api/screen"

import { SetupFlowGraphic } from "./SetupFlowGraphic"
import { SetupWorkPanel } from "./SetupWorkPanel"
import { GitHubMark } from "../../../components/GitHubMark"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useProject, useProjectSetup, useRetryProjectSetup } from "../../../managed-apps.hooks"
import type { ProjectSetup } from "../../../managed-apps.types"

/** Headline, body and action for each setup state. */
function describe(setup: ProjectSetup): {
    tone: "info" | "success" | "danger"
    title: string
    body: string
} {
    switch (setup.state) {
        case "pending_pr":
            return {
                tone: "info",
                title: "Opening a pull request…",
                body: "We are adding the build workflow to your repository. This takes a moment.",
            }
        case "pr_open":
            return {
                tone: "info",
                title: "Merge the pull request to start building",
                body: `The workflow has to be on ${setup.base_branch} before a push can run it. Nothing builds until you merge.`,
            }
        case "merged":
            return {
                tone: "success",
                title: "Setup complete",
                body: "The workflow is on your branch. Push to it, or deploy now from the project page.",
            }
        case "not_needed":
            return {
                tone: "success",
                title: "Already configured",
                body: "Your repository already carries the build workflow, so no pull request was needed.",
            }
        case "pr_closed":
            return {
                tone: "danger",
                title: "The pull request was closed without merging",
                body: "Nothing can build until the workflow reaches your branch. Open it again to continue.",
            }
        case "failed":
            return {
                tone: "danger",
                title: "We could not open the pull request",
                body:
                    setup.error ||
                    "GitHub refused the request. The usual cause is the app lacking permission to write workflows to this repository.",
            }
    }
}

const TONE_ICON = {
    info: GitPullRequest,
    success: CheckCircle2,
    danger: AlertTriangle,
} as const

const TONE_CLASS = {
    info: "text-status-info",
    success: "text-status-success",
    danger: "text-status-danger",
} as const

/**
 * What happens immediately after a project is created.
 *
 * This screen exists because the honest answer is not "deploying". Builds run
 * on the customer's own GitHub Actions runners, so the platform first opens a
 * pull request adding the workflow — and until a human merges it, nothing this
 * project does can produce a build. A progress bar here would be a lie.
 *
 * It polls while the pull request is outstanding and stops the moment builds
 * are unblocked.
 */
export function ProjectSetupPage() {
    useScreen("managed-apps-project-setup")
    const navigate = useNavigate()
    const { id = "" } = useParams()

    const { data: project } = useProject(id)
    const { data: setup, isLoading, isError, refetch, isFetching } = useProjectSetup(id)
    const retry = useRetryProjectSetup(id)

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-2xl space-y-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        )
    }

    if (isError || !setup) {
        return (
            <EmptyState
                icon={AlertTriangle}
                title="Could not load setup"
                description="We could not read this project's onboarding state."
                action={{ label: "Try again", onClick: () => void refetch() }}
            />
        )
    }

    const state = describe(setup)
    const Icon = TONE_ICON[state.tone]
    const canRetry = setup.state === "failed" || setup.state === "pr_closed"

    // How far along the diagram the project is. A failed or closed pull request
    // is still "at the pull request step" — it has not moved past it.
    let flowStage: "pr" | "merged" | "building" = "pr"
    if (setup.builds_enabled) flowStage = "building"

    return (
        // `min-w-0` at every level that can hold the workflow preview: the YAML
        // is arbitrarily wide and must scroll inside its own box rather than
        // widening the page.
        <div className="w-full min-w-0">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2 gap-1.5 text-muted-foreground"
            >
                <Link to={MANAGED_APPS_ROUTES.root}>
                    <ArrowLeft className="size-3.5" />
                    Managed Apps
                </Link>
            </Button>

            <div className="mb-6 flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                    <GitHubMark className="size-5" />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate font-mono text-xl font-bold tracking-tight">
                        {project?.name ?? "Project created"}
                    </h1>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {project ? `${project.repo_owner}/${project.repo_name}` : "Setting up"}
                    </p>
                </div>
            </div>

            {/* Two columns on desktop: what to do on the left, what you are being
			    asked to merge on the right. Stacked below lg. The right column is
			    `min-w-0` so the YAML scrolls inside itself. */}
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
                <div className="glass-1 rounded-xl border border-border/60 px-5 py-6">
                    <SetupFlowGraphic stage={flowStage} className="mb-6" />

                    <div className="flex items-start gap-3 border-t border-border/40 pt-5">
                        <Icon className={`mt-0.5 size-5 shrink-0 ${TONE_CLASS[state.tone]}`} />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-semibold">{state.title}</h2>
                            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                                {state.body}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {setup.pr_url && (
                                    <Button
                                        asChild
                                        size="sm"
                                        variant={setup.builds_enabled ? "outline" : "default"}
                                        className="gap-1.5"
                                    >
                                        <a href={setup.pr_url} target="_blank" rel="noreferrer">
                                            <ExternalLink className="size-3.5" />
                                            {setup.builds_enabled
                                                ? `View pull request #${String(setup.pr_number)}`
                                                : `Review and merge #${String(setup.pr_number)}`}
                                        </a>
                                    </Button>
                                )}

                                {canRetry && (
                                    <Button
                                        size="sm"
                                        className="gap-1.5"
                                        disabled={retry.isPending}
                                        onClick={() => {
                                            retry.mutate()
                                        }}
                                    >
                                        {retry.isPending ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="size-3.5" />
                                        )}
                                        Open it again
                                    </Button>
                                )}

                                {setup.builds_enabled && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void navigate(MANAGED_APPS_ROUTES.project(id))
                                        }
                                    >
                                        Go to project
                                    </Button>
                                )}

                                {!setup.builds_enabled && (
                                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        {isFetching && <Loader2 className="size-3 animate-spin" />}
                                        Checking automatically
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Deliberately outside the state block and below it: this is
					    not what the project's state is, and it is not a problem.
					    The repository builds on the file it merged; a newer one
					    exists and taking it is the user's call. */}
                    {setup.workflow_outdated && (
                        <div className="mt-5 flex items-start gap-3 border-t border-border/40 pt-5">
                            <Sparkles className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-semibold">
                                    A newer build workflow is available
                                </h2>
                                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                                    Your repository merged an earlier version of the workflow file.
                                    It keeps building exactly as it does today — taking the update
                                    is optional. The Workflow tab shows the file we would propose;
                                    updating opens a pull request that replaces the older one with
                                    it.
                                </p>
                                {setup.repo_version > 0 && (
                                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                                        repository v{setup.repo_version} · current v
                                        {setup.workflow_version}
                                    </p>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 gap-1.5"
                                    disabled={retry.isPending}
                                    onClick={() => {
                                        retry.mutate()
                                    }}
                                >
                                    {retry.isPending ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="size-3.5" />
                                    )}
                                    Open an update pull request
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <SetupWorkPanel projectId={id} setup={setup} />
            </div>
        </div>
    )
}
