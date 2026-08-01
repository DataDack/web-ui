// ---------------------------------------------------------------------------
// Backend DTOs — cloud-be-go: app "managedapps" (base /api/v1/managedapps).
// Field names are snake_case to match the Go JSON contract exactly.
// ---------------------------------------------------------------------------

export type ProjectType = "opennext" | "react" | "n8n"

/**
 * A tier code as the catalogue defines it (`starter`, `developer_pro`, …).
 *
 * Deliberately not a union. The tiers live in S3 and can change without a
 * frontend deploy, so a closed union here would be a lie the moment pricing is
 * edited — and every lookup keyed by it would break on a code it had never
 * heard of. Render from the fetched catalogue, never from a hardcoded map.
 *
 * The alias is kept even though it is structurally `string`: it marks which
 * strings are tier codes, which is the difference between a field you may
 * render raw and one you must look up in the catalogue first.
 */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- documents intent; see above
export type ProjectPlan = string

/** One tier's quotas. -1 means unlimited, 0 means a genuine none. */
export interface PlanLimits {
    max_projects: number
    max_custom_domains: number
    bandwidth_gb: number
    build_minutes: number
    max_deployment_mb: number
    max_upload_mb: number
    request_timeout_seconds: number
    edge_requests: number
}

/** Which runtimes a tier can run. Both are true on every tier today. */
export interface PlanRuntimes {
    react: boolean
    opennext: boolean
}

/**
 * One catalogue tier. `price_minor` is in the currency's minor unit (paise for
 * INR), so it is divided by 100 exactly once, at display time.
 */
export interface Plan {
    code: ProjectPlan
    name: string
    sort_order: number
    price_minor: number
    currency: string
    limits: PlanLimits
    runtimes: PlanRuntimes
}

/**
 * GET/PUT /plans/account — the tier the ACCOUNT is on, and what it is using.
 *
 * The tier is account-scoped, not project-scoped: the quotas it sells ("2
 * active projects") cap nothing if every project carries its own tier. Projects
 * read these limits; they never choose them, which is why the create flow shows
 * them read-only and only this section's settings page can change them.
 */
export interface AccountPlan {
    plan: Plan
    projects_in_use: number
}

/** PUT /plans/account — `code` is a catalogue tier code. */
export interface ChangeAccountPlanRequest {
    code: ProjectPlan
}

/**
 * The project lifecycle the console renders, stored server-side so the list
 * needs no per-project build query. Written at create, PR merge, build enqueue
 * and build settle — see apps/managedapps/projects/constants.
 *
 * `built_pending_deploy` is the terminal success state today: the artifact
 * exists and there is no runtime fleet to hand it to. `deploying` and `live`
 * are reserved for that fleet.
 */
export type DeployState =
    | "awaiting_setup"
    | "awaiting_build"
    | "building"
    | "built_pending_deploy"
    | "deploying"
    | "live"
    | "failed"
    | "source_disconnected"

/**
 * The one-time onboarding pull request that adds the build workflow to the
 * customer's repository. Builds run on their GitHub Actions runners, so until
 * this reaches `merged` (or `not_needed`) there is no workflow on the branch
 * and a push cannot produce a build.
 */
export type SetupState = "pending_pr" | "pr_open" | "merged" | "pr_closed" | "failed" | "not_needed"

/** Whether the repository is wired up enough for a push to produce a build. */
export function isSetupComplete(state: SetupState | undefined): boolean {
    return state === "merged" || state === "not_needed"
}

export type BuildTrigger = "push" | "manual" | "initial"

/**
 * Build statuses, mirroring apps/managedapps/builds/constants.
 *
 * A build runs on the customer's Actions runners, so the observable stages are
 * queued → building → uploading → built. `built` is a RESTING state: the
 * artifact is stored and verified, and it sits there until a runtime fleet
 * exists to deploy it — possibly for weeks. `cloning` is legacy and never
 * emitted (the runner clones, we never see it); `deploying`/`ready` are
 * reserved for that fleet.
 */
export type BuildStatus =
    | "queued"
    | "cloning"
    | "building"
    | "uploading"
    | "built"
    | "deploying"
    | "ready"
    | "failed"
    | "canceled"
    | "superseded"

/** Build statuses still in flight — drives log/status polling. */
export const TRANSITIONAL_BUILD_STATUSES: readonly BuildStatus[] = [
    "queued",
    "cloning",
    "building",
    "uploading",
    "deploying",
]

export function isBuildTransitional(status: BuildStatus | undefined): boolean {
    return status != null && TRANSITIONAL_BUILD_STATUSES.includes(status)
}

// ---------------------------------------------------------------------------
// Projects — /managedapps/projects
// ---------------------------------------------------------------------------

export interface Project {
    id: string
    name: string
    subdomain: string
    url: string
    project_type: ProjectType
    plan: ProjectPlan
    installation_id: number
    repo_owner: string
    repo_name: string
    repo_id: number
    branch: string
    root_dir: string
    install_command: string
    build_command: string
    output_dir: string
    /** Row lifecycle only — `active` for a project's whole useful life. Never
     *  read this to answer "is it deployed?"; that is `deploy_state`. */
    status: string
    /** The lifecycle the console renders. */
    deploy_state: DeployState
    /** Onboarding pull request state (n8n is always `not_needed`). */
    setup_state: SetupState
    setup_pr_number: number
    setup_pr_url: string
    setup_branch: string
    /** Verbatim GitHub failure when `setup_state` is "failed". */
    setup_error: string
    workflow_version: number
    /** Optional private networking, applied when a container is provisioned. */
    vpc_id: string | null
    subnet_id: string | null
    /** Serialized as null while no build has ever deployed. */
    active_build_id: string | null
    /** Proxmox container id — 0 until the provisioner lands. */
    proxmox_ct_id: number
    /** Placement node — null until the provisioner lands. */
    pve_node_id: string | null
    /** May be empty until the first successful deploy. */
    container_ip: string
    last_error: string
    created_at: string
    updated_at: string
}

/**
 * POST /projects. For `project_type: "n8n"` the GitHub/repo/build fields are
 * omitted — n8n instances are provisioned without a source repository.
 *
 * `name` is OPTIONAL for repo-backed projects: the server derives it from the
 * repository name and deduplicates per account, so the creation flow does not
 * need to ask. n8n has no repo to derive from and must send one.
 *
 * `vpc_id`/`subnet_id` are the optional private-networking binding, validated
 * at create and applied when a runtime container is provisioned. Send neither
 * for a public-only project; a subnet without a VPC is rejected.
 */
export interface CreateProjectRequest {
    name?: string
    project_type: ProjectType
    /** Omit to let the server apply the free tier. */
    plan?: ProjectPlan
    installation_id?: number
    repo_owner?: string
    repo_name?: string
    branch?: string
    root_dir?: string
    install_command?: string
    build_command?: string
    output_dir?: string
    env?: Record<string, string>
    vpc_id?: string
    subnet_id?: string
}

/**
 * PUT /projects/:id — omitted fields keep their stored value. Repo/installation
 * are immutable server-side and env has its own endpoint, so neither appears
 * here; project_type may only move between opennext and react.
 *
 * Renaming does NOT recompute the subdomain: that was allocated at creation and
 * the customer may already have shared the address.
 */
export interface UpdateProjectRequest {
    name?: string
    branch?: string
    project_type?: ProjectType
    plan?: ProjectPlan
    root_dir?: string
    install_command?: string
    build_command?: string
    output_dir?: string
    vpc_id?: string
    subnet_id?: string
}

/**
 * GET /projects/:id/setup — the onboarding pull request plus the exact file it
 * adds, so the console can render the diff the customer is being asked to merge.
 */
export interface ProjectSetup {
    state: SetupState
    pr_number: number
    pr_url: string
    branch: string
    base_branch: string
    workflow_path: string
    workflow_yaml: string
    /** The workflow version this API renders today. */
    workflow_version: number
    /** The workflow version the repository last merged. */
    repo_version: number
    /**
     * The repository is set up but running an older workflow than we render.
     * Not a failure: it builds, it just predates newer features. Re-opening the
     * setup pull request proposes the current file.
     */
    workflow_outdated: boolean
    /** Verbatim GitHub failure when `state` is "failed". */
    error: string
    /** Whether a push can currently produce a build. */
    builds_enabled: boolean
}

/**
 * GET /projects/defaults?project_type= — what an empty build field inherits.
 * `build_editable`/`output_editable` say whether overriding is meaningful:
 * OpenNext chooses its own output directory, so offering an input would be a
 * control that changes nothing.
 */
export interface BuildDefaults {
    project_type: ProjectType
    install_command: string
    build_command: string
    output_dir: string
    build_editable: boolean
    output_editable: boolean
}

/** GET /projects/:id/env — variable NAMES only, values never leave the backend. */
export type ProjectEnvNames = string[]

/** PUT /projects/:id/env — full replacement of the project's env map. */
export interface UpdateProjectEnvRequest {
    env: Record<string, string>
}

// ---------------------------------------------------------------------------
// Builds — /managedapps/projects/:id/builds + /managedapps/builds/:id
// ---------------------------------------------------------------------------

export interface Build {
    id: string
    project_id: string
    commit_sha: string
    commit_message: string
    triggered_by: BuildTrigger
    status: BuildStatus
    build_error: string
    /** Null until the build leaves the queue. */
    started_at: string | null
    /** Null until the build settles. */
    finished_at: string | null
    created_at: string
    /** Null until an Actions runner claims the queued build. */
    claimed_at: string | null
    /** Null until the runner uploads the artifact; `artifact_bytes` is 0 until then. */
    artifact_at: string | null
    artifact_bytes: number
    /** The GitHub Actions run behind this build — empty for pre-Actions rows. */
    gh_run_url: string
}

/**
 * GET /builds/:id/logs?offset= — the log from `offset` bytes onward.
 *
 * `offset` in the response is what the next poll should send. Re-fetching the
 * whole blob every few seconds grows quadratically with build length, so a
 * running build only ever transfers what was appended.
 */
export interface BuildLogs {
    log: string
    offset: number
}

// ---------------------------------------------------------------------------
// GitHub App installation — /managedapps/github
// ---------------------------------------------------------------------------

/** GET /github/install-url — the GitHub App installation page to hand off to. */
export interface GitHubInstallUrl {
    url: string
}

/**
 * POST /github/callback — GitHub redirects back to the console with
 * ?installation_id=&setup_action=&state=&code= after the App is installed.
 * `code` is the OAuth authorization code the backend exchanges to verify the
 * installation actually belongs to the signed-in GitHub user.
 */
export interface GitHubCallbackRequest {
    installation_id: number
    setup_action: string
    state: string
    code: string
}

/**
 * A GitHub App installation connected to the account. No secrets. `revoked`
 * flips (instead of the row deleting) when GitHub reports the installation
 * gone — revoked connections stay listed so dependent projects can prompt a
 * reconnect, but must not be offered for new projects.
 */
export interface GitHubConnection {
    installation_id: number
    github_login: string
    /** "User" | "Organization" (may be empty). */
    target_type: string
    revoked: boolean
    created_at: string
}

/** GET /github/repos?installation_id=&q= — a repo visible to an installation. */
export interface GitHubRepo {
    id: number
    owner: string
    owner_avatar: string
    name: string
    full_name: string
    private: boolean
    default_branch: string
    html_url: string
    description: string
    language: string
    /** RFC3339, or empty when GitHub reports no push. */
    pushed_at: string
    archived: boolean
    fork: boolean
}

/**
 * GET /github/repos/:owner/:repo/detect — how a repository subtree should be
 * built, with the evidence for every inferred value.
 *
 * `detected: false` means no package.json was found; the UI must ask rather
 * than present a default as a detection. `confidence: "low"` means a manifest
 * was read but nothing identifiable was in it.
 */
export interface RepoDetection {
    project_type: ProjectType
    install_command: string
    build_command: string
    output_dir: string
    confidence: "high" | "low"
    /** e.g. "dependencies.next is ^15.2.1 in package.json". */
    evidence: string[]
    /** Directories containing a package.json — candidate root directories. */
    root_candidates: string[]
    /** GitHub capped the tree listing, so candidates may be partial. */
    truncated: boolean
    detected: boolean
}

/** GET /github/repos/:owner/:repo/branches?installation_id=. */
export interface GitHubBranch {
    name: string
    commit_sha: string
}

// ---------------------------------------------------------------------------
// Overview — /managedapps/overview
// ---------------------------------------------------------------------------

export interface ManagedAppsOverview {
    projects_total: number
    projects_by_type: Record<ProjectType, number>
    builds_in_flight: number
    builds_failed: number
    /** Most recent builds across all projects (max 5). */
    recent_builds: Build[]
}
