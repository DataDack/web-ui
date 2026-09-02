import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
  AccountPlan,
  Build,
  BuildDefaults,
  BuildLogs,
  ChangeAccountPlanRequest,
  CreateProjectRequest,
  DeployRequest,
  DisconnectSourceResult,
  GitHubBranch,
  GitHubCallbackRequest,
  GitHubConnection,
  GitHubInstallUrl,
  GitHubRepo,
  ManagedAppsOverview,
  Plan,
  PlanCatalog,
  PlanCostBreakdown,
  Project,
  ProjectAnalytics,
  ProjectEnvVar,
  ProjectMetrics,
  FrameworkCatalog,
  ProjectSetup,
  ReconnectSourceRequest,
  RequestLogQuery,
  RequestLogsResult,
  RestrictionsResult,
  RepoDetection,
  ProjectType,
  SourceFile,
  SourceTree,
  UpdateProjectEnvRequest,
  UpdateProjectHostnameRequest,
  UpdateProjectRequest,
  UpdateRestrictionsRequest,
} from "./managed-apps.types"

// cloud-be-go: app "managedapps".
//   Overview:  GET /overview
//   Plans:     GET /plans · GET/PUT /plans/account
//   GitHub:    GET /github/install-url · POST /github/callback
//              GET/DELETE /github/connections[/:installationId]
//              GET /github/repos?installation_id= · GET /github/repos/:owner/:repo/branches
//   Source:    POST /projects/:id/source/disconnect · POST /projects/:id/source/reconnect
//   Projects:  GET/POST /projects · GET/PUT/DELETE /projects/:id
//              GET/PUT /projects/:id/env
//              GET/PUT /projects/:id/restrictions
//              GET /projects/:id/source/tree · GET /projects/:id/source/file
//   Builds:    POST /projects/:id/builds · GET /projects/:id/builds
//              GET /builds/:id · GET /builds/:id/logs · POST /builds/:id/cancel
const BASE = "/managedapps"

export const managedAppsApi = {
  // ── Overview ──────────────────────────────────────────────────────────
  overview: (): Promise<ManagedAppsOverview> => apiGet<ManagedAppsOverview>(`${BASE}/overview`),

  // ── Plan catalogue ────────────────────────────────────────────────────
  /**
   * The sellable tiers and their quotas. Platform data, identical for every
   * account and served from the S3 pricing catalogue, so it needs only a
   * session — not a projects permission.
   */
  plans: (): Promise<Plan[]> => apiGet<Plan[]>(`${BASE}/plans`),

  /**
   * The tiers AND the comparison rows, in one read.
   *
   * Fetched together rather than as two calls because they are useless apart —
   * a feature list with no tier values renders an empty table — and because two
   * reads of a catalogue somebody may be editing can disagree, leaving a table
   * whose rows and columns came from different snapshots.
   */
  planCatalog: (): Promise<PlanCatalog> => apiGet<PlanCatalog>(`${BASE}/plans/catalog`),

  /** The tier the ACTIVE ACCOUNT is on, plus how much of it is in use. */
  accountPlan: (): Promise<AccountPlan> => apiGet<AccountPlan>(`${BASE}/plans/account`),

  /**
   * What moving to `code` will actually cost this account: list price, the
   * account's discount and why it was granted, GST, and the total debited.
   *
   * Account-specific where `plans()` is not — the catalogue sells one price to
   * everyone and this applies the account's own discount, so it is the figure
   * the confirm dialog must show rather than the advertised one.
   */
  planEstimate: (code: string): Promise<PlanCostBreakdown> =>
    apiGet<PlanCostBreakdown>(`${BASE}/plans/account/estimate?code=${encodeURIComponent(code)}`),

  /**
   * Move the account onto another tier.
   *
   * A paid tier is an ordinary monthly subscription, so this charges the
   * wallet (402 when it cannot cover the first month) and the server refuses a
   * downgrade the account is already over (409) rather than leaving it
   * permanently in breach of a quota.
   */
  changeAccountPlan: (code: string): Promise<AccountPlan> =>
    apiPut<AccountPlan>(`${BASE}/plans/account`, { code } satisfies ChangeAccountPlanRequest),

  // ── GitHub App installation ───────────────────────────────────────────
  /** The GitHub App installation URL to hand the browser off to. */
  githubInstallUrl: (): Promise<GitHubInstallUrl> =>
    apiGet<GitHubInstallUrl>(`${BASE}/github/install-url`),

  /** Complete the post-install redirect; stores and returns the connection. */
  githubCallback: (payload: GitHubCallbackRequest): Promise<GitHubConnection> =>
    apiPost<GitHubConnection>(`${BASE}/github/callback`, payload),

  githubConnections: (): Promise<GitHubConnection[]> =>
    apiGet<GitHubConnection[]>(`${BASE}/github/connections`),

  /**
   * Remove the account↔installation link. With uninstall=true the DataDack
   * App is also uninstalled from the user's GitHub account (server-side App
   * API call) — otherwise the installation stays on GitHub untouched.
   */
  deleteGithubConnection: (installationId: number, uninstall = false): Promise<void> =>
    apiDelete(
      `${BASE}/github/connections/${String(installationId)}${uninstall ? "?uninstall=true" : ""}`,
    ),

  /**
   * Repos visible to an installation, newest push first. `q` is matched
   * server-side against the full list — the installation endpoint has no
   * search of its own, so filtering here would only ever cover the first page.
   */
  githubRepos: (installationId: number, query = ""): Promise<GitHubRepo[]> => {
    const search = query.trim() === "" ? "" : `&q=${encodeURIComponent(query.trim())}`
    return apiGet<GitHubRepo[]>(
      `${BASE}/github/repos${LIST_QUERY}&installation_id=${String(installationId)}${search}`,
    )
  },

  /** How a repository subtree should be built, with evidence. */
  detectFramework: (
    installationId: number,
    owner: string,
    repo: string,
    ref: string,
    root: string,
  ): Promise<RepoDetection> => {
    const repoPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    const params = new URLSearchParams({ installation_id: String(installationId) })
    if (ref) params.set("ref", ref)
    if (root) params.set("root", root)
    return apiGet<RepoDetection>(`${BASE}/github/repos/${repoPath}/detect?${params.toString()}`)
  },

  githubBranches: (
    installationId: number,
    owner: string,
    repo: string,
  ): Promise<GitHubBranch[]> => {
    const repoPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    return apiGet<GitHubBranch[]>(
      `${BASE}/github/repos/${repoPath}/branches?installation_id=${String(installationId)}`,
    )
  },

  // ── Projects ──────────────────────────────────────────────────────────
  /**
   * What an empty build field inherits, per project type. Served rather than
   * hardcoded so the placeholder the user sees is the command that actually
   * runs — the two used to drift because the defaults lived inside the build
   * runner, reachable by no endpoint.
   */
  // nodeVersion is the version being considered, not a stored one: it only
  // changes the runtime image in the response. Omitted means "not chosen yet",
  // which resolves the image against the platform default.
  buildDefaults: (projectType: ProjectType, nodeVersion = ""): Promise<BuildDefaults> =>
    apiGet<BuildDefaults>(
      `${BASE}/projects/defaults?project_type=${projectType}` +
        (nodeVersion ? `&node_version=${nodeVersion}` : ""),
    ),

  listProjects: (type?: ProjectType): Promise<Project[]> => {
    const typeQuery = type ? `&project_type=${type}` : ""
    return apiGet<Project[]>(`${BASE}/projects${LIST_QUERY}${typeQuery}`)
  },

  getProject: (id: string): Promise<Project> => apiGet<Project>(`${BASE}/projects/${id}`),

  createProject: (payload: CreateProjectRequest): Promise<Project> =>
    apiPost<Project>(`${BASE}/projects`, payload),

  updateProject: (id: string, payload: UpdateProjectRequest): Promise<Project> =>
    apiPut<Project>(`${BASE}/projects/${id}`, payload),

  /**
   * Move the app onto another platform-provided address. Answers 409 when the
   * name is taken or reserved — the dialog renders that message inline.
   */
  updateProjectHostname: (id: string, payload: UpdateProjectHostnameRequest): Promise<Project> =>
    apiPut<Project>(`${BASE}/projects/${id}/hostname`, payload),

  deleteProject: (id: string): Promise<void> => apiDelete(`${BASE}/projects/${id}`),

  /**
   * The onboarding pull request and the workflow file it adds. Refreshes the
   * PR's state from GitHub on read, so the setup screen converges even when
   * the App is not subscribed to pull_request webhooks.
   */
  projectSetup: (id: string): Promise<ProjectSetup> =>
    apiGet<ProjectSetup>(`${BASE}/projects/${id}/setup`),

  /** Re-attempt opening the setup PR (after fixing App permissions). */
  retryProjectSetup: (id: string): Promise<ProjectSetup> =>
    apiPost<ProjectSetup>(`${BASE}/projects/${id}/setup/retry`),

  /**
   * Release a built artifact onto the runtime. Answers 409 with the reason
   * when it cannot — the console renders a button that is disabled with a real
   * explanation rather than hidden.
   *
   * With no body this releases the newest build that succeeded. Pass
   * `{ build_id }` to release a specific one: that is a rollback, and it reads
   * the artifact already in object storage instead of building anything. The
   * default mode is `cache` server-side, but it is sent explicitly for a
   * rollback so the request says on its face that it must not rebuild.
   */
  deployProject: (id: string, body?: DeployRequest): Promise<void> =>
    apiPost(`${BASE}/projects/${id}/deploy`, body),

  /**
   * End this project's connection to its repository.
   *
   * Removes every repository webhook that delivers to this platform and, when
   * no other project on the account is built from the same repository, the
   * DATADACK_PROJECT_ID Actions variable. Pushes stop producing builds
   * immediately; what is deployed keeps serving.
   */
  disconnectProjectSource: (id: string): Promise<DisconnectSourceResult> =>
    apiPost<DisconnectSourceResult>(`${BASE}/projects/${id}/source/disconnect`),

  /**
   * Wire a disconnected project back to a repository and re-run setup.
   *
   * Sending nothing reconnects to the repository it already had. The fields
   * exist for the case that made the connection end in the first place — a
   * repository that moved to an organisation, or an installation replaced.
   */
  reconnectProjectSource: (id: string, payload: ReconnectSourceRequest = {}): Promise<Project> =>
    apiPost<Project>(`${BASE}/projects/${id}/source/reconnect`, payload),

  /** Env variable NAMES only — values never leave the backend. */
  /**
   * The repository's file listing at a commit. `ref` is a build's commit sha —
   * omitted, the server reads the tracked branch instead.
   */
  projectSourceTree: (id: string, ref = ""): Promise<SourceTree> => {
    const query = ref === "" ? "" : `?ref=${encodeURIComponent(ref)}`
    return apiGet<SourceTree>(`${BASE}/projects/${id}/source/tree${query}`)
  },

  /**
   * One file out of that listing. The path is a query parameter because
   * repository paths contain slashes — as a route segment it would have to be
   * re-escaped on every hop.
   */
  projectSourceFile: (id: string, path: string, ref = ""): Promise<SourceFile> => {
    const params = new URLSearchParams({ path })
    if (ref) params.set("ref", ref)
    return apiGet<SourceFile>(`${BASE}/projects/${id}/source/file?${params.toString()}`)
  },

  /**
   * The project's per-request log. Never throws for "not configured" — the
   * server answers 200 with configured=false, because a deployment without a
   * log store is a configuration, not a failed request.
   */
  projectLogs: (id: string, query: RequestLogQuery): Promise<RequestLogsResult> => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value))
    }
    const raw = params.toString()
    const suffix = raw === "" ? "" : `?${raw}`
    return apiGet<RequestLogsResult>(`${BASE}/projects/${id}/logs${suffix}`)
  },

  /**
   * The framework catalogue the create form renders.
   *
   * Platform data, identical for every account, so it needs only the projects
   * read permission — the same one the listing carries.
   */
  frameworks: (): Promise<FrameworkCatalog> =>
    apiGet<FrameworkCatalog>(`${BASE}/projects/frameworks`),

  projectMetrics: (id: string, range: string): Promise<ProjectMetrics> =>
    apiGet<ProjectMetrics>(`${BASE}/projects/${id}/metrics?range=${encodeURIComponent(range)}`),

  projectAnalytics: (id: string, range: string): Promise<ProjectAnalytics> =>
    apiGet<ProjectAnalytics>(`${BASE}/projects/${id}/analytics?range=${encodeURIComponent(range)}`),

  projectEnv: (id: string): Promise<ProjectEnvVar[]> =>
    apiGet<ProjectEnvVar[]>(`${BASE}/projects/${id}/env`),

  updateProjectEnv: (id: string, payload: UpdateProjectEnvRequest): Promise<void> =>
    apiPut(`${BASE}/projects/${id}/env`, payload),

  // ── Restrictions ──────────────────────────────────────────────────────
  /**
   * The project's edge access control, with the plan's ceilings and the
   * platform's rule catalog alongside it.
   *
   * One call rather than three: a rules editor cannot render a stored rule id
   * without the catalog's title and false-positive note, and an "Add rule"
   * button cannot know to disable itself without the quota. Three reads are
   * three chances to paint an editor from snapshots that disagree.
   */
  projectRestrictions: (id: string): Promise<RestrictionsResult> =>
    apiGet<RestrictionsResult>(`${BASE}/projects/${id}/restrictions`),

  /** Replaces the whole document and answers with it as stored — prefixes
   *  masked, disabled signatures dropped — so the editor re-seeds from what is
   *  actually in force rather than from what was typed. */
  updateProjectRestrictions: (
    id: string,
    payload: UpdateRestrictionsRequest,
  ): Promise<RestrictionsResult> =>
    apiPut<RestrictionsResult>(`${BASE}/projects/${id}/restrictions`, payload),

  // ── Builds ────────────────────────────────────────────────────────────
  /**
   * Manual deploy. Without a sha this builds the tracked branch head; with
   * one it redeploys that exact commit.
   */
  createBuild: (projectId: string, commitSha?: string): Promise<Build> =>
    apiPost<Build>(
      `${BASE}/projects/${projectId}/builds`,
      commitSha ? { commit_sha: commitSha } : undefined,
    ),

  listBuilds: (projectId: string): Promise<Build[]> =>
    apiGet<Build[]>(`${BASE}/projects/${projectId}/builds${LIST_QUERY}`),

  getBuild: (id: string): Promise<Build> => apiGet<Build>(`${BASE}/builds/${id}`),

  /** The log from `offset` bytes onward, plus the offset to send next. */
  buildLogs: (id: string, offset = 0): Promise<BuildLogs> =>
    apiGet<BuildLogs>(`${BASE}/builds/${id}/logs?offset=${String(offset)}`),

  /** Only a queued build can be canceled — the response data is null. */
  cancelBuild: async (id: string): Promise<void> => {
    await apiPost<null>(`${BASE}/builds/${id}/cancel`)
  },
}
