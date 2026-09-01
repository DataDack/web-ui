import type { ProjectType } from "./managed-apps.types"

/**
 * Where a user manages which repositories the DataDack GitHub App can see.
 * Every "I can't find my repo" path ends here, so it is one constant rather
 * than a URL literal repeated across the pickers.
 */
export const GITHUB_INSTALLATIONS_URL = "https://github.com/settings/installations"

/**
 * The composer draft, stashed here across the GitHub App install round-trip.
 * Connecting an account leaves the SPA entirely, so without this everything
 * typed so far is lost at the exact moment it matters most.
 */
export const CREATE_DRAFT_KEY = "managed-apps:create:draft"

/**
 * The section's top-level views, held in ?tab= on /managed-apps.
 *
 * Managed Apps is the account's whole website estate: repo-built apps AND the
 * cPanel accounts that used to live under their own "Web hosting" sidebar
 * group. They are one service with two runtimes, so they are one page with two
 * lists and a summary over both.
 *
 * The service sidebar switches between them — there is no on-page tab bar, so
 * every link into a view below sets the WHOLE query string. That is what keeps
 * one view's filters from surviving into another.
 */
export const MANAGED_APPS_TABS = ["apps", "hosting"] as const
export type ManagedAppsTab = (typeof MANAGED_APPS_TABS)[number]
export const DEFAULT_MANAGED_APPS_TAB: ManagedAppsTab = "apps"

export const MANAGED_APPS_ROUTES = {
  root: "/managed-apps",
  /** The repo-built projects list. */
  apps: "/managed-apps",
  /** The cPanel accounts list, grouped with Domains in the console. */
  hosting: "/domains/hosting",
  create: "/managed-apps/create",
  /** Dedicated account plan selection flow. */
  upgrade: "/managed-apps/upgrade",
  /** Section settings — the one place the account's tier can be changed. */
  settings: "/managed-apps/settings",
  /** Settings, opened on the GitHub accounts we can build from. Every
   *  "reconnect this repo" path ends here, so it is one constant. */
  connections: "/managed-apps/settings",
  project: (id: string) => `/managed-apps/projects/${id}`,
  projectDomains: (id: string) => `/managed-apps/projects/${id}?tab=domains`,
  /** One build as a page — log, source and output tabs live on it. */
  build: (projectId: string, buildId: string) =>
    `/managed-apps/projects/${projectId}/builds/${buildId}`,
  /** Post-create: the pull request that has to be merged before anything builds. */
  setup: (id: string) => `/managed-apps/projects/${id}/setup`,
  githubCallback: "/managed-apps/github/callback",
  /** The Apps view, filtered to one project type. */
  byType: (type: ProjectType) => `/managed-apps?tab=apps&type=${type}`,
} as const

/**
 * The deployments a variable can be scoped to, in the order the editor shows
 * them. Mirrors envvars.AllTargets() on the backend, which is what a write is
 * validated against.
 */
export const ENV_TARGETS = ["production", "preview"] as const

/** How each target is written on the small toggles in an env row. */
export const ENV_TARGET_LABELS: Record<(typeof ENV_TARGETS)[number], string> = {
  production: "Production",
  preview: "Preview",
}

export const MANAGED_APPS_QUERY_KEYS = {
  overview: ["managed-apps", "overview"] as const,
  plans: ["managed-apps", "plans"] as const,
  /** Tiers + comparison rows together. Nested under `plans` so a plan change
   *  invalidates it with the same prefix as everything else pricing-related. */
  planCatalog: ["managed-apps", "plans", "catalog"] as const,
  /** The account's own tier + usage. Nested under `plans` so a plan change
   *  invalidates the catalogue view and this one with a single prefix. */
  accountPlan: ["managed-apps", "plans", "account"] as const,
  /** What a specific tier costs THIS account — discount and GST applied. Keyed
   *  by code because the answer differs per tier, and nested under `plans` so a
   *  plan change invalidates every quote along with the catalogue. */
  planEstimate: (code: string) => ["managed-apps", "plans", "account", "estimate", code] as const,
  // The Node version is part of the key because the response resolves the
  // runtime image for it — same type on a different major is a different answer.
  buildDefaults: (type: ProjectType, nodeVersion: string) =>
    ["managed-apps", "build-defaults", type, nodeVersion] as const,
  githubConnections: ["managed-apps", "github", "connections"] as const,
  // The query is part of the key: searching is a server round-trip, so each
  // term is its own cached result rather than a filter over one cached list.
  githubRepos: (installationId: number, query = "") =>
    ["managed-apps", "github", "repos", installationId, query] as const,
  detect: (installationId: number, owner: string, repo: string, ref: string, root: string) =>
    ["managed-apps", "github", "detect", installationId, owner, repo, ref, root] as const,
  githubBranches: (installationId: number, owner: string, repo: string) =>
    ["managed-apps", "github", "branches", installationId, owner, repo] as const,
  // Lists carry an object segment so a type filter can never collide with a
  // project(id) key under the same "projects" prefix.
  projects: (type?: ProjectType) => ["managed-apps", "projects", { type: type ?? "all" }] as const,
  project: (id: string) => ["managed-apps", "projects", id] as const,
  projectEnv: (id: string) => ["managed-apps", "projects", id, "env"] as const,
  projectSetup: (id: string) => ["managed-apps", "projects", id, "setup"] as const,
  projectBuilds: (id: string) => ["managed-apps", "projects", id, "builds"] as const,
  // Source reads are keyed by the commit, not just the project: a commit's tree
  // and its files never change, which is what makes them cacheable forever on
  // the client and worth keeping apart per ref rather than refetching per view.
  projectSourceTree: (id: string, ref: string) =>
    ["managed-apps", "projects", id, "source", "tree", ref] as const,
  projectSourceFile: (id: string, ref: string, path: string) =>
    ["managed-apps", "projects", id, "source", "file", ref, path] as const,
  build: (id: string) => ["managed-apps", "builds", id] as const,
  buildLogs: (id: string) => ["managed-apps", "builds", id, "logs"] as const,
  // Keyed by range because each window is a different server answer, not a
  // client-side filter over one series.
  projectMetrics: (id: string, range: string) =>
    ["managed-apps", "projects", id, "metrics", range] as const,
  projectAnalytics: (id: string, range: string) =>
    ["managed-apps", "projects", id, "analytics", range] as const,
  /**
   * Keyed by the whole filter, not just the range: every filter is a separate
   * server query, and sharing one key would show the previous filter's rows
   * under the new filter's heading while the refetch was in flight.
   */
  frameworks: ["managed-apps", "frameworks"] as const,
  projectLogs: (id: string, filterKey: string) =>
    ["managed-apps", "projects", id, "logs", filterKey] as const,
}
