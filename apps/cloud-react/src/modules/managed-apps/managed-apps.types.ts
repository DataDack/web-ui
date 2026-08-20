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

/**
 * One tier's quotas. -1 means unlimited, 0 means a genuine none.
 *
 * These are DERIVED server-side from the pricing sheet's slugs
 * (max_projects is total_projects_limit, and so on). They exist because a dozen
 * components are written against these names; everything else the sheet sells
 * arrives in `Plan.values` instead.
 */
export interface PlanLimits {
  max_projects: number
  max_custom_domains: number
  bandwidth_gb: number
  build_minutes: number
  max_static_sites: number
  max_edge_projects: number
  request_timeout_seconds: number
  edge_requests: number
}

/** Which runtimes a tier can run. Both are true on every tier today. */
export interface PlanRuntimes {
  react: boolean
  opennext: boolean
}

/**
 * One catalogue tier.
 *
 * `price_inr_monthly` is in WHOLE RUPEES per month, exactly as the pricing sheet
 * states it — there is no minor unit to divide by any more. A tier priced on
 * enquiry carries -1 with `is_custom_priced` true, so anything that formats a
 * price or offers a button must check that flag first.
 */
export interface Plan {
  code: ProjectPlan
  name: string
  sort_order: number
  price_inr_monthly: number
  price_usd_monthly: number
  currency: string
  /** No list price — sold by a conversation, not by a button. */
  is_custom_priced: boolean
  /** Whether the self-serve flow may actually sell this tier. */
  is_purchasable: boolean
  limits: PlanLimits
  /**
   * Every feature slug the pricing sheet defines for this tier, typed as the
   * sheet types it. Paired with PlanFeature it is enough to render the whole
   * comparison table without this client knowing a single slug by name.
   */
  values: Record<string, string | number | boolean | null | undefined>
}

/**
 * One row of the comparison table, from the pricing sheet's feature dictionary.
 *
 * The table used to be a hand-written list of rows in this module, which meant a
 * pricing change needed a frontend deploy and — worse — that the sheet and the
 * page could disagree about what was being sold. The sheet is the only author
 * now: rows are grouped by `category` (ordered by `category_sort`) and ordered
 * within a group by `sort_order`.
 */
export interface PlanFeature {
  slug: string
  label: string
  category: string
  category_sort: number
  sort_order: number
  data_type: string
  unit: string
  description: string
  /**
   * The sheet's prose per plan code ("Mumbai Edge (<40ms)").
   *
   * Carried rather than derived because most cells are not numbers: rendering
   * "mumbai_basic" or a bare 40 would lose what the row actually promises. A
   * missing entry means falling back to formatting the raw value — which is
   * why the value type admits undefined: a tier added to the catalogue before
   * the dictionary catches up has no phrase for these rows yet.
   */
  display: Record<string, string | undefined>
}

/** GET /plans/catalog — the tiers and the rows to compare them on, together. */
export interface PlanCatalog {
  plans: Plan[]
  features: PlanFeature[]
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
  static_projects_in_use: number
  edge_projects_in_use: number
}

/** PUT /plans/account — `code` is a catalogue tier code. */
export interface ChangeAccountPlanRequest {
  code: ProjectPlan
}

/**
 * GET /plans/account/estimate — what a tier actually costs THIS account.
 *
 * Distinct from the catalogue's `price_minor`, which is the advertised list
 * price and identical for everyone. An account carrying a permanent discount is
 * charged less than the sticker, and GST is added on top, so the two numbers
 * genuinely differ — showing the list price where the charge belongs is how a
 * customer ends up agreeing to ₹499 and seeing ₹471.06 leave their wallet.
 *
 * Every field is in MAJOR units (rupees), unlike `price_minor` — the server
 * computes these and the client formats them as-is.
 */
export interface PlanCostBreakdown {
  cycle: "monthly" | "hourly"
  currency: string
  /** The advertised price, before this account's discount. */
  list_price: number
  /** The account's permanent discount, 0–100. Zero means none. */
  discount_pct: number
  /**
   * Why the discount was granted ("First 100 customers"). Absent when there is
   * no discount — a price cut with no attribution is one the customer cannot
   * check, so the reason is shown wherever the reduction is.
   */
  discount_reason?: string
  /** Pre-tax amount after the discount — the base the tax is charged on. */
  base: number
  gst_rate: number
  gst: number
  /** base + gst — what is actually debited from the wallet. */
  total: number
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
  /**
   * The build and runtime environment: the Node major the build runs on and,
   * for opennext, the base image the runtime container is built from. Empty
   * inherits the platform default — read `BuildDefaults.node_version` for what
   * that currently is rather than assuming a number here.
   */
  node_version: string
  /**
   * Whether this project has a preview environment at all.
   *
   * Env vars carry targets; this is what decides whether the preview half of
   * that scoping means anything here. Off until someone turns it on — a
   * project has one deployment until it is asked for a second.
   */
  preview_enabled: boolean
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
  // `served` replaces the old container_ip field. Neither the public nor the
  // fabric address is sent any more: the app is reached through the edge
  // gateway by hostname, so the origin address is not something the console can
  // use — only something worth attacking. The boolean is what this code
  // actually read off that field.
  served: boolean
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
  /** Omit to inherit the platform default rather than pinning today's. */
  node_version?: string
  env?: Record<string, EnvVarInput>
  /** Opt the project into a preview environment. Omit for one deployment. */
  preview_enabled?: boolean
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
  /**
   * Sending "" restores the platform default. Like the commands, this value is
   * written into the workflow file the repository already carries, so a change
   * reaches a build only once that file is updated.
   */
  node_version?: string
  /** Turn the preview environment on or off. Preview-scoped variables are kept
   *  when it goes off — inert, not rewritten — so it can be turned back on. */
  preview_enabled?: boolean
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
 * GET /projects/defaults?project_type=&node_version= — what an empty build
 * field inherits. `build_editable`/`output_editable` say whether overriding is
 * meaningful: OpenNext chooses its own output directory, so offering an input
 * would be a control that changes nothing.
 */
export interface BuildDefaults {
  project_type: ProjectType
  install_command: string
  build_command: string
  output_dir: string
  build_editable: boolean
  output_editable: boolean
  /** The Node major a project inherits when it chooses none. */
  node_version: string
  /** Every major a project may choose — the only values a write accepts. */
  node_versions: string[]
  /**
   * The base image the runtime container is built FROM, resolved server-side
   * for the requested type and `node_version`. Never derived here: whether the
   * choice reaches the runtime at all is a platform rule (a static build is
   * served by Caddy whatever Node compiled it), and duplicating it in the
   * console is how the two start disagreeing.
   */
  runtime_image: string
}

/**
 * Where a variable applies.
 *
 * Managed Apps deploys production today — one branch, one deployment — so a
 * preview-scoped variable is stored and deliberately withheld from the build
 * and the runtime container. It is scoping that already works, waiting for the
 * deployment kind that consumes it, not a control that does nothing: the value
 * is genuinely kept out of the only deployment there is.
 */
export type EnvTarget = "production" | "preview"

/** GET /projects/:id/env — names and targets; values never leave the backend. */
export interface ProjectEnvVar {
  key: string
  targets: EnvTarget[]
}

/** One variable on a write. The server also accepts a bare string (= every
 *  target), but the console always states the scope it is showing. */
export interface EnvVarInput {
  value: string
  targets: EnvTarget[]
}

/** PUT /projects/:id/env — full replacement of the project's env map. */
export interface UpdateProjectEnvRequest {
  env: Record<string, EnvVarInput>
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
  /**
   * Last write to the row. Only meaningful while a status is in flight: for a
   * build in `deploying` it is the moment the release was claimed, which is
   * the only record of when a deployment started.
   */
  updated_at: string
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
// Source browsing — /managedapps/projects/:id/source
// ---------------------------------------------------------------------------

/** One path in a repository listing, named the way git names them. */
export interface SourceEntry {
  path: string
  type: "blob" | "tree"
  /** 0 for a directory. */
  size: number
}

/**
 * GET /projects/:id/source/tree?ref= — the repository's files at one commit.
 *
 * `ref` in the response is the commit actually read: asking for nothing
 * resolves to the tracked branch, so it is never assumed to equal the request.
 * `truncated` is GitHub's cap on very large repositories and must be rendered —
 * a partial tree shown as the whole repository makes a file that exists look
 * deleted.
 */
export interface SourceTree {
  ref: string
  repo_owner: string
  repo_name: string
  /** The subdirectory the project builds from — where the browser opens. */
  root_dir: string
  entries: SourceEntry[]
  truncated: boolean
}

/**
 * GET /projects/:id/source/file?path=&ref= — one file at one commit.
 *
 * `content` is empty whenever `binary` or `too_large` is set: those are the two
 * answers that are not text, and the viewer states them rather than rendering
 * bytes it cannot show. `html_url` is where the reader goes instead.
 */
export interface SourceFile {
  path: string
  ref: string
  size: number
  content: string
  binary: boolean
  too_large: boolean
  /** The server's preview cap, in bytes — never hardcode it here. */
  max_bytes: number
  html_url: string
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

// ---------------------------------------------------------------------------
// Observability & analytics — /managedapps/projects/:id/{metrics,analytics}
// ---------------------------------------------------------------------------

/** One sample of the project container's resource series. */
export interface ProjectMetricPoint {
  /** Unix seconds. */
  t: number
  /** Percentages, 0..100. */
  cpu: number
  mem: number
  disk: number
  /** Throughput, MB/s. */
  io: number
  net: number
}

/**
 * GET /projects/:id/metrics. "unavailable" means the container is not
 * provisioned (or the cluster could not be read) and `points` is empty — the
 * platform never fabricates a series, so the tab says so instead of charting.
 */
export interface ProjectMetrics {
  source: "proxmox" | "unavailable"
  node?: string
  points: ProjectMetricPoint[]
}

/** One traffic bucket; `t` is the bucket's start in unix seconds. */
export interface ProjectAnalyticsPoint {
  t: number
  requests: number
  bytes_out: number
  status_2xx: number
  status_3xx: number
  status_4xx: number
  status_5xx: number
}

export interface ProjectAnalyticsTotals {
  requests: number
  bytes_out: number
  status_2xx: number
  status_3xx: number
  status_4xx: number
  status_5xx: number
}

/** GET /projects/:id/analytics — dense (zero-filled) series over the range. */
export interface ProjectAnalytics {
  range: string
  /** How wide each point is: "hour" for 24h, "day" for 7d/30d. */
  interval: "hour" | "day"
  totals: ProjectAnalyticsTotals
  points: ProjectAnalyticsPoint[]
}
