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

export const MANAGED_APPS_ROUTES = {
	root: "/managed-apps",
	create: "/managed-apps/create",
	/** Section settings — the one place the account's tier can be changed. */
	settings: "/managed-apps/settings",
	project: (id: string) => `/managed-apps/projects/${id}`,
	/** Post-create: the pull request that has to be merged before anything builds. */
	setup: (id: string) => `/managed-apps/projects/${id}/setup`,
	githubCallback: "/managed-apps/github/callback",
	/** Overview filtered to one project type (sidebar OpenNext/React/n8n items). */
	byType: (type: ProjectType) => `/managed-apps?type=${type}`,
} as const

export const MANAGED_APPS_QUERY_KEYS = {
	overview: ["managed-apps", "overview"] as const,
	plans: ["managed-apps", "plans"] as const,
	/** The account's own tier + usage. Nested under `plans` so a plan change
	 *  invalidates the catalogue view and this one with a single prefix. */
	accountPlan: ["managed-apps", "plans", "account"] as const,
	buildDefaults: (type: ProjectType) => ["managed-apps", "build-defaults", type] as const,
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
	projects: (type?: ProjectType) =>
		["managed-apps", "projects", { type: type ?? "all" }] as const,
	project: (id: string) => ["managed-apps", "projects", id] as const,
	projectEnv: (id: string) => ["managed-apps", "projects", id, "env"] as const,
	projectSetup: (id: string) => ["managed-apps", "projects", id, "setup"] as const,
	projectBuilds: (id: string) => ["managed-apps", "projects", id, "builds"] as const,
	build: (id: string) => ["managed-apps", "builds", id] as const,
	buildLogs: (id: string) => ["managed-apps", "builds", id, "logs"] as const,
}
