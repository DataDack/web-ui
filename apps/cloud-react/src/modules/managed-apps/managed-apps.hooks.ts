import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"

import { DOMAINS_QUERY_KEYS } from "@/modules/domains/domains.constants"
import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { extractError, openTopupTab } from "@/services/api/client"
import { publishConsoleEvent } from "@/services/broadcast"

import { managedAppsApi } from "./managed-apps.api"
import { MANAGED_APPS_QUERY_KEYS } from "./managed-apps.constants"
import { isProjectBusy, projectPollInterval } from "./managed-apps.state"
import {
  type CreateEnvironmentRequest,
  type CreateProjectRequest,
  type GitHubCallbackRequest,
  type Plan,
  type ProjectType,
  type ReconnectSourceRequest,
  type RequestLogQuery,
  type RestrictionsDocument,
  type UpdateEnvironmentRequest,
  type UpdateProjectEnvRequest,
  type UpdateProjectHostnameRequest,
  type UpdateRestrictionsRequest,
  type UpdateProjectRequest,
  isBuildTransitional,
} from "./managed-apps.types"

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** Section landing stats, kept fresh while builds run server-side. */
export function useManagedAppsOverview() {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.overview,
    queryFn: managedAppsApi.overview,
    refetchInterval: 30_000,
  })
}

// ---------------------------------------------------------------------------
// GitHub App installation
// ---------------------------------------------------------------------------

/** Connected GitHub App installations for the account. */
/**
 * The plan catalogue.
 *
 * Pricing changes about as often as a pricing page does, and the server already
 * serves it from a short-lived snapshot, so this is cached generously rather
 * than refetched on every mount of the composer.
 */
export function usePlans() {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.plans,
    queryFn: () => managedAppsApi.plans(),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * The pricing page's whole payload: the tiers and the rows to compare them on.
 *
 * Separate from usePlans because most callers only need the tiers — the create
 * flow and the usage chip have no table to draw — and the feature dictionary is
 * comfortably the larger half of the response.
 */
export function usePlanCatalog() {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.planCatalog,
    queryFn: () => managedAppsApi.planCatalog(),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * The wallet shortfall a 402 reports, or null when the error is not a 402.
 *
 * The plan change checks the balance BEFORE it cancels anything, so its 402
 * usually carries only a message — no shortfall figures — and the api client's
 * top-up interceptor (which needs an amount) cannot fire. Falling back to 0
 * lets the caller substitute the tier's own price, which is exactly the sum the
 * user has to cover.
 */
function paymentShortfall(e: unknown): number | null {
  if (!axios.isAxiosError(e) || e.response?.status !== 402) return null
  const body = e.response.data as { data?: { shortfall?: number; required?: number } } | undefined
  return Math.ceil(body?.data?.shortfall ?? body?.data?.required ?? 0)
}

/**
 * The tier the account is on, and how much of it is in use.
 *
 * Separate from the catalogue because it is account state, not platform data:
 * it changes when someone upgrades and when a project is created or deleted, so
 * it is not cached the way pricing is.
 */
export function useAccountPlan() {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.accountPlan,
    queryFn: () => managedAppsApi.accountPlan(),
  })
}

/**
 * What a tier will actually cost this account, for the confirm dialog.
 *
 * The catalogue price is what the tier is advertised at; this is what the
 * wallet is debited, which differs whenever the account carries a discount or
 * once GST is added. Enabled only when a tier is actually being confirmed —
 * there is no reason to price every card on the page.
 *
 * A failure here is not fatal: the dialog falls back to the catalogue price and
 * the generic billing sentence, which is what it showed before quotes existed.
 */
export function usePlanEstimate(code: string | undefined, enabled = true) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.planEstimate(code ?? ""),
    queryFn: () => managedAppsApi.planEstimate(code ?? ""),
    enabled: enabled && Boolean(code),
    // The account's discount does not change while a dialog is open, but the
    // answer is cheap to keep fresh across separate upgrade attempts.
    staleTime: 60 * 1000,
  })
}

/**
 * Upgrade or downgrade the account's tier.
 *
 * A paid tier is a monthly subscription, so this spends money and the server's
 * refusals are the interesting cases: 402 when the wallet cannot cover the
 * first month, 409 when the target tier allows fewer projects than the account
 * already has. Both carry a message that names the numbers, so it is surfaced
 * verbatim rather than replaced with a generic failure — and the 402 gets the
 * top-up shortcut, since that is the only way out of it.
 */
export function useChangeAccountPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    // The whole tier, not just its code: the failure path needs its price to
    // tell the user what the wallet is short of.
    mutationFn: (plan: Plan) => managedAppsApi.changeAccountPlan(plan.code),
    onSuccess: (account) => {
      queryClient.setQueryData(MANAGED_APPS_QUERY_KEYS.accountPlan, account)
      // The tier writes account_quota overrides server-side, so anything
      // rendering a Managed Apps quota is now stale.
      void queryClient.invalidateQueries({ queryKey: ["quotas"] })
      // It is billed as a subscription, so the wallet moved too.
      void queryClient.invalidateQueries({ queryKey: ["billing"] })
      // Any other tab of this console is now showing the old tier.
      publishConsoleEvent({ type: "managed-apps:plan-changed", code: account.plan.code })
      toast.success(`Now on the ${account.plan.name} plan`)
    },
    onError: (e, plan) => {
      const message = extractError(e, "Could not change the plan")
      const shortfall = paymentShortfall(e)
      if (shortfall !== null) {
        // Straight to the top-up, in a new tab — the upgrade dialog
        // behind it stays open and ready to retry the moment the
        // payment lands. Only the amount-less refusal is opened here:
        // when the 402 carried figures the api client already opened
        // that tab, and doing it again would open two.
        if (shortfall === 0) openTopupTab(plan.price_inr_monthly)
        toast.error(message, {
          description: "Billing is open in a new tab — top up, then try again.",
        })
        return
      }
      toast.error(message)
    },
  })
}

export function useGitHubConnections() {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.githubConnections,
    queryFn: managedAppsApi.githubConnections,
  })
}

/** Fetch the GitHub App install URL, then hand off the browser to it. */
export function useGitHubInstallUrl() {
  return useMutation({
    mutationFn: () => managedAppsApi.githubInstallUrl(),
    onError: (e) => toast.error(extractError(e, "Could not start GitHub connect")),
  })
}

/** Complete the post-install redirect (installation_id+state) → stores the connection. */
export function useGitHubCallback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GitHubCallbackRequest) => managedAppsApi.githubCallback(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.githubConnections,
      })
    },
  })
}

export function useDeleteGitHubConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      installationId,
      uninstall = false,
    }: {
      installationId: number
      uninstall?: boolean
    }) => managedAppsApi.deleteGithubConnection(installationId, uninstall),
    onSuccess: (_data, { uninstall }) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.githubConnections,
      })
      toast.success(
        uninstall
          ? "GitHub connection removed and the app was uninstalled from GitHub"
          : "GitHub connection removed",
      )
    },
    onError: (e) => toast.error(extractError(e, "Failed to remove GitHub connection")),
  })
}

/**
 * Repos visible to an installation, newest push first.
 *
 * `query` is matched server-side against the whole list. Filtering in the
 * browser would only ever cover the page already loaded, which for a large
 * organisation means a search box that cannot find most of the repositories.
 * `placeholderData` keeps the previous results on screen while a new query is
 * in flight, so typing does not flash the list empty between keystrokes.
 */
export function useGitHubRepos(installationId: number | undefined, query = "") {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.githubRepos(installationId ?? 0, query),
    queryFn: () => managedAppsApi.githubRepos(installationId ?? 0, query),
    enabled: installationId != null,
    placeholderData: (previous) => previous,
  })
}

/**
 * How a repository subtree should be built.
 *
 * Only runs once a repository is actually chosen. Detection reads the
 * repository tree, so it is deliberately not speculative — and it is cached per
 * (repo, ref, root) because changing the root directory re-asks the question
 * and the previous answer stays valid for the previous root.
 */
export function useDetectFramework(
  installationId: number | undefined,
  owner: string,
  repo: string,
  ref: string,
  root: string,
) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.detect(installationId ?? 0, owner, repo, ref, root),
    queryFn: () => managedAppsApi.detectFramework(installationId ?? 0, owner, repo, ref, root),
    enabled: installationId != null && owner !== "" && repo !== "",
    staleTime: 5 * 60_000,
    // A repository we cannot read is a normal outcome, not a fault worth
    // hammering: the composer falls back to asking the user.
    retry: false,
  })
}

export function useGitHubBranches(
  installationId: number | undefined,
  owner: string | undefined,
  repo: string | undefined,
) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.githubBranches(installationId ?? 0, owner ?? "", repo ?? ""),
    queryFn: () => managedAppsApi.githubBranches(installationId ?? 0, owner ?? "", repo ?? ""),
    enabled: installationId != null && !!owner && !!repo,
  })
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Project list (optionally filtered by type), kept fresh while deploys settle.
 *
 * The cadence follows the list's own contents: at the flat 30s this used to run,
 * a card reading "Stage: building" sat beside a progress bar ticking its own 1s
 * timer against a stage that could be half a minute out of date.
 */
export function useProjects(type?: ProjectType) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projects(type),
    queryFn: () => managedAppsApi.listProjects(type),
    refetchInterval: (query) => projectPollInterval(query.state.data?.some(isProjectBusy) ?? false),
  })
}

/**
 * A single project. Callers that know a build is in flight pass a shorter
 * `refetchInterval` (see projectPollInterval) — the project row is what gains
 * `served` and `active_build_id` when a deploy settles.
 */
export function useProject(id: string, refetchInterval = 30_000) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.project(id),
    queryFn: () => managedAppsApi.getProject(id),
    enabled: !!id,
    refetchInterval,
  })
}

/**
 * The framework catalogue.
 *
 * Long staleTime because this is platform data that changes when somebody edits
 * a file in a bucket, not per account and not per render. Refetching it on
 * every mount of the create form would be a request per keystroke of
 * navigation for an answer that is the same all day.
 */
export function useFrameworks() {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.frameworks,
    queryFn: () => managedAppsApi.frameworks(),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProjectRequest) => managedAppsApi.createProject(payload),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({
        queryKey: ["managed-apps", "projects"],
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.overview,
      })
      // "1 of 2 projects" just moved.
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.accountPlan,
      })
      toast.success(`Project "${project.name}" created`)
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(extractError(e, "Failed to create project"))
    },
  })
}

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

/** A project's configuration namespaces, in the order the server sorts them. */
export function useProjectEnvironments(projectId: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.environments(projectId),
    queryFn: () => managedAppsApi.projectEnvironments(projectId),
    enabled: projectId !== "",
  })
}

export function useCreateEnvironment(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEnvironmentRequest) =>
      managedAppsApi.createEnvironment(projectId, body),
    onSuccess: (environment) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environments(projectId),
      })
      toast.success(`${environment.name} created`)
    },
    // Surfaced verbatim: the refusals here are the actionable ones — the name
    // is taken, another environment already tracks all unassigned branches.
    onError: (e) => toast.error(extractError(e, "Could not create the environment")),
  })
}

export function useUpdateEnvironment(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, ...body }: UpdateEnvironmentRequest & { name: string }) =>
      managedAppsApi.updateEnvironment(projectId, name, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environments(projectId),
      })
      toast.success("Environment updated")
    },
    onError: (e) => toast.error(extractError(e, "Could not update the environment")),
  })
}

export function useDeleteEnvironment(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => managedAppsApi.deleteEnvironment(projectId, name),
    onSuccess: (_data, name) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environments(projectId),
      })
      toast.success(`${name} deleted`)
    },
    onError: (e) => toast.error(extractError(e, "Could not delete the environment")),
  })
}

/** One environment's variable NAMES. Values never leave the backend. */
export function useEnvironmentEnv(projectId: string, name: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.environmentEnv(projectId, name),
    queryFn: () => managedAppsApi.environmentEnv(projectId, name),
    enabled: projectId !== "" && name !== "",
  })
}

export function useSetEnvironmentEnv(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, env }: { name: string; env: Record<string, string> }) =>
      managedAppsApi.setEnvironmentEnv(projectId, name, env),
    onSuccess: (_names, { name }) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environmentEnv(projectId, name),
      })
      // The list shows a per-environment variable count, so it goes stale on
      // every save here.
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environments(projectId),
      })
      toast.success(`Variables saved for ${name}`)
    },
    onError: (e) => toast.error(extractError(e, "Could not save the variables")),
  })
}

export function useEnvironmentRestrictions(projectId: string, name: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.environmentRestrictions(projectId, name),
    queryFn: () => managedAppsApi.environmentRestrictions(projectId, name),
    enabled: projectId !== "" && name !== "",
  })
}

export function useSetEnvironmentRestrictions(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      name,
      restrictions,
    }: {
      name: string
      restrictions: RestrictionsDocument | null
    }) => managedAppsApi.setEnvironmentRestrictions(projectId, name, restrictions),
    onSuccess: (_result, { name }) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environmentRestrictions(projectId, name),
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.environments(projectId),
      })
      // Production's document is mirrored onto the project, which is what the
      // edge reads — so the project-level view goes stale with it.
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.project(projectId) })
      toast.success(`Restrictions saved for ${name}`)
    },
    onError: (e) => toast.error(extractError(e, "Could not save the restrictions")),
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProjectRequest) => managedAppsApi.updateProject(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["managed-apps", "projects"],
      })
      toast.success("Project updated")
    },
    onError: (e) => toast.error(extractError(e, "Failed to update project")),
  })
}

/**
 * Move the app onto another platform-provided address.
 *
 * The error is deliberately left on the mutation instead of being toasted: a
 * taken or reserved name is something the customer fixes in the input they are
 * still looking at, and a toast would leave the dialog looking like it worked.
 * Both this module's caches and the domains registry's are invalidated — the
 * hostname is rendered from the project row in one place and from the registry
 * row in the other, and after this they disagree until both refetch.
 */
export function useUpdateProjectHostname(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProjectHostnameRequest) =>
      managedAppsApi.updateProjectHostname(id, payload),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ["managed-apps", "projects"] })
      void queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEYS.all })
      toast.success(`Now serving at ${project.subdomain}`)
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => managedAppsApi.deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["managed-apps", "projects"],
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.overview,
      })
      // Frees a slot against the account's project quota.
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.accountPlan,
      })
      toast.success("Project deleted")
    },
    onError: (e) => toast.error(extractError(e, "Failed to delete project")),
  })
}

/** Env variable names and where each applies — values never leave the backend. */
export function useProjectEnv(id: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectEnv(id),
    queryFn: () => managedAppsApi.projectEnv(id),
    enabled: !!id,
  })
}

export function useUpdateProjectEnv(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProjectEnvRequest) => managedAppsApi.updateProjectEnv(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.projectEnv(id),
      })
      toast.success("Environment variables updated")
    },
    onError: (e) => toast.error(extractError(e, "Failed to update environment")),
  })
}

/**
 * The project's edge access control, plus the plan ceilings and rule catalog
 * that make it renderable.
 *
 * No polling. Nothing changes this but a save from this page, and a security
 * page that refetches under the reader is a page where a half-edited list can
 * be replaced mid-thought.
 */
export function useProjectRestrictions(id: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectRestrictions(id),
    queryFn: () => managedAppsApi.projectRestrictions(id),
    enabled: !!id,
  })
}

/**
 * Save the whole document.
 *
 * The server's answer is written straight into the cache rather than
 * invalidated into a refetch, because the two differ in a way that matters
 * here: the response IS the normalized document — prefixes masked, disabled
 * signatures dropped — and seeding the editor from it is what shows the user
 * that 203.0.113.5/24 was stored as 203.0.113.0/24 before they trust a rule
 * that would never have matched.
 */
export function useUpdateProjectRestrictions(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateRestrictionsRequest) =>
      managedAppsApi.updateProjectRestrictions(id, payload),
    onSuccess: (result) => {
      queryClient.setQueryData(MANAGED_APPS_QUERY_KEYS.projectRestrictions(id), result)
      toast.success("Restrictions updated")
    },
    onError: (e) => toast.error(extractError(e, "Failed to update restrictions")),
  })
}

/**
 * Per-type build defaults. Cached hard: they change only when the platform
 * ships a new build pipeline, and every field placeholder in the composer
 * depends on them being there before the user starts typing.
 *
 * `nodeVersion` widens the key because the response resolves the runtime image
 * for it. Previous data is kept across that change: picking a Node version
 * would otherwise blank the whole section back to skeletons to update one line.
 */
export function useBuildDefaults(type: ProjectType | undefined, nodeVersion = "", framework = "") {
  return useQuery({
    // The framework is part of the KEY, not just the request: it changes the
    // answer, so two frameworks sharing one cache entry would show whichever
    // was fetched first — which is the bug this parameter exists to fix.
    queryKey: MANAGED_APPS_QUERY_KEYS.buildDefaults(type ?? "react", nodeVersion, framework),
    queryFn: () => managedAppsApi.buildDefaults(type ?? "react", nodeVersion, framework),
    // n8n has no build pipeline, so there is nothing to ask for.
    enabled: type != null && type !== "n8n",
    staleTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  })
}

/**
 * The onboarding pull request. Polls while it is still outstanding — this is
 * the screen a user sits on immediately after creating a project, waiting to
 * merge, and it has to notice when they do.
 */
export function useProjectSetup(id: string, poll = true) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectSetup(id),
    queryFn: () => managedAppsApi.projectSetup(id),
    enabled: !!id,
    // Stop as soon as builds are unblocked — there is nothing left to watch.
    refetchInterval: (query) => (poll && query.state.data?.builds_enabled !== true ? 8_000 : false),
  })
}

/**
 * Open the setup pull request again. Two callers, one call: retrying after
 * GitHub refused the first attempt, and refreshing a repository whose workflow
 * file is an older version than the server renders. The endpoint is idempotent
 * and the branch is derived from the project id, so both converge on the same
 * pull request.
 */
export function useRetryProjectSetup(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => managedAppsApi.retryProjectSetup(id),
    onSuccess: (setup) => {
      queryClient.setQueryData(MANAGED_APPS_QUERY_KEYS.projectSetup(id), setup)
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.project(id) })
      // `workflow_outdated` can only be true for a project that is already
      // set up, which is exactly the refresh case — the repository stays
      // outdated until the pull request is merged.
      if (setup.workflow_outdated) {
        toast.success("Workflow update pull request opened")
        return
      }
      toast.success(
        setup.state === "failed"
          ? "Still could not open the pull request"
          : "Setup pull request opened",
      )
    },
    onError: (e) => toast.error(extractError(e, "Could not open the setup pull request")),
  })
}

// ---------------------------------------------------------------------------
// Source browsing — "View code" on a deployment
// ---------------------------------------------------------------------------

/**
 * The repository's file listing at a commit.
 *
 * Cached hard and never refetched on focus: a commit's tree is immutable, so
 * every re-render of the browser is answered from memory. `enabled` keeps the
 * request from firing until the viewer is actually opened — the listing is one
 * GitHub call against the installation's rate limit, not something to spend on
 * a page nobody opened.
 */
export function useProjectSourceTree(projectId: string, ref: string, enabled = true) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectSourceTree(projectId, ref),
    queryFn: () => managedAppsApi.projectSourceTree(projectId, ref),
    enabled: enabled && !!projectId,
    staleTime: Infinity,
    // A repository we cannot read (revoked install, deleted commit) is a
    // normal outcome the browser renders as a message — not worth retrying.
    retry: false,
  })
}

/**
 * One file at a commit. Same immutability, same caching: clicking back to a
 * file already read costs nothing.
 */
export function useProjectSourceFile(projectId: string, ref: string, path: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectSourceFile(projectId, ref, path),
    queryFn: () => managedAppsApi.projectSourceFile(projectId, path, ref),
    enabled: !!projectId && !!path,
    staleTime: Infinity,
    retry: false,
  })
}

/**
 * Release a built artifact onto a runtime container. Expected to fail with a
 * 409 until that fleet exists; the server's reason is shown verbatim rather
 * than a string duplicated here.
 */
export function useDeployProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => managedAppsApi.deployProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.project(id) })
    },
    onError: (e) => toast.error(extractError(e, "Could not deploy this project")),
  })
}

/**
 * Roll back to a build that already succeeded.
 *
 * The same endpoint as Deploy, with the build named and `mode: "cache"` said
 * out loud. That mode is what makes this a rollback and not a rebuild: the
 * server re-releases the artifact sitting in object storage for that build
 * rather than going back to the repository. It ships the exact bytes that were
 * tested, in seconds, and it works on a project whose source is disconnected
 * or whose repository is gone — none of which is true of building again.
 *
 * Invalidates the builds list too: the build being released moves to
 * `deploying`, and the row the user just clicked is the one that has to show it.
 */
export function useRollbackBuild(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (buildId: string) =>
      managedAppsApi.deployProject(projectId, { build_id: buildId, mode: "cache" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.project(projectId) })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.projectBuilds(projectId),
      })
      toast.success("Rollback started — this release serves the stored build, nothing is rebuilt")
    },
    onError: (e) => toast.error(extractError(e, "Could not roll back to this build")),
  })
}

/**
 * Disconnect a project from its repository.
 *
 * The toast reports what actually happened at GitHub rather than a flat
 * "Disconnected", because the two halves can differ: the project is always
 * disconnected here, while the cleanup there can be partial — a repository
 * that was deleted, an installation whose access is gone. Warnings are shown
 * as warnings, not errors; nothing about them means the disconnect failed.
 */
export function useDisconnectSource(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => managedAppsApi.disconnectProjectSource(projectId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.project(projectId) })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.projects(),
      })
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.overview })

      const warnings = result.warnings ?? []
      if (warnings.length > 0) {
        toast.warning("Disconnected from GitHub, with some cleanup left", {
          description: warnings.join(" · "),
        })
        return
      }
      const removed =
        result.webhooks_removed === 1
          ? "1 webhook removed"
          : `${String(result.webhooks_removed)} webhooks removed`
      toast.success("Disconnected from GitHub", {
        description: `${removed}. Pushes no longer build this project — what is deployed keeps serving.`,
      })
    },
    onError: (e) => toast.error(extractError(e, "Could not disconnect this project from GitHub")),
  })
}

/** Wire a disconnected project back to its repository and re-run setup. */
export function useReconnectSource(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReconnectSourceRequest = {}) =>
      managedAppsApi.reconnectProjectSource(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.project(projectId) })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.projectSetup(projectId),
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.projectBuilds(projectId),
      })
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.projects() })
      void queryClient.invalidateQueries({ queryKey: MANAGED_APPS_QUERY_KEYS.overview })
      toast.success("Reconnected to GitHub", {
        description: "Pushes to the tracked branch build this project again.",
      })
    },
    // The server's message is the useful one here — "install or re-authorise
    // the GitHub App for this repository" is a instruction, and replacing it
    // with a generic failure would drop the only thing the user can act on.
    onError: (e) => toast.error(extractError(e, "Could not reconnect this project to GitHub")),
  })
}

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------

/** Build history for a project, kept fresh while any build is in flight. */
export function useProjectBuilds(projectId: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectBuilds(projectId),
    queryFn: () => managedAppsApi.listBuilds(projectId),
    enabled: !!projectId,
    refetchInterval: (query) =>
      query.state.data?.some((b) => isBuildTransitional(b.status)) ? 5_000 : 30_000,
  })
}

/**
 * Manual deploy. Pass a bare project id to build the tracked branch head, or
 * `{ projectId, commitSha }` to redeploy that exact commit.
 */
export function useCreateBuild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: string | { projectId: string; commitSha?: string }) =>
      typeof input === "string"
        ? managedAppsApi.createBuild(input)
        : managedAppsApi.createBuild(input.projectId, input.commitSha),
    onSuccess: (build) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.projectBuilds(build.project_id),
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.project(build.project_id),
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.overview,
      })
      toast.success("Deploy queued")
    },
    onError: (e) => toast.error(extractError(e, "Failed to start deploy")),
  })
}

/** A single build, polling while it is still in flight. */
export function useBuild(id: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.build(id),
    queryFn: () => managedAppsApi.getBuild(id),
    enabled: !!id,
    refetchInterval: (query) => (isBuildTransitional(query.state.data?.status) ? 3_000 : false),
  })
}

/**
 * Build log text. Pass `active: true` while the build is transitional (see
 * `isBuildTransitional`) to poll for fresh output; once the build settles the
 * caller flips it off and the last fetch stands.
 */
export function useBuildLogs(id: string, active: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.buildLogs(id),
    queryFn: async () => {
      // Read the accumulated text back out of the cache and ask only for
      // what has been appended since. Re-sending the whole blob every 3s
      // grows quadratically with build length — the longer the build, the
      // more there is to resend, which is exactly backwards.
      //
      // Reading `prev` from the cache rather than a ref keeps this correct
      // under retries: a failed attempt never wrote, so the next one asks
      // from the same offset instead of skipping a chunk.
      const prev = queryClient.getQueryData<{
        text: string
        offset: number
        storageReady: boolean
      }>(MANAGED_APPS_QUERY_KEYS.buildLogs(id))
      const chunk = await managedAppsApi.buildLogs(id, prev?.offset ?? 0)
      return {
        text: (prev?.text ?? "") + chunk.log,
        offset: chunk.offset,
        // Absent on a server that predates the field; treat that as ready
        // rather than warning every user of an older backend that their logs
        // are being dropped when they are not.
        storageReady: chunk.storage_ready !== false,
      }
    },
    enabled: !!id,
    refetchInterval: active ? 3_000 : false,
  })
}

/**
 * The project's per-request runtime log.
 *
 * `keepPreviousData` is deliberate: changing a filter should redraw the table
 * with the new rows, not blank it and re-run the empty state — and this view's
 * empty state carries real meaning ("no log store connected"), so flashing it
 * between two successful queries would be actively misleading.
 */
export function useProjectLogs(projectId: string, query: RequestLogQuery) {
  const filterKey = JSON.stringify(query)
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectLogs(projectId, filterKey),
    queryFn: () => managedAppsApi.projectLogs(projectId, query),
    enabled: !!projectId,
    placeholderData: (previous) => previous,
    // No polling. A log view that refetches under the reader moves the row they
    // were about to click; "Refresh" is a button here, not a timer.
    staleTime: 30_000,
  })
}

export function useCancelBuild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => managedAppsApi.cancelBuild(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.build(id),
      })
      // The cancel response has no body, so the project id isn't known
      // here — refresh every per-project builds list instead.
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "managed-apps" && query.queryKey.at(-1) === "builds",
      })
      void queryClient.invalidateQueries({
        queryKey: MANAGED_APPS_QUERY_KEYS.overview,
      })
      toast.success("Build canceled")
    },
    onError: (e) => toast.error(extractError(e, "Failed to cancel build")),
  })
}

/**
 * The project container's resource series. Polls at 30s — the server caches
 * the Proxmox read for 15s, and RRD points are minute-grained, so anything
 * faster buys nothing.
 */
export function useProjectMetrics(id: string, range: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectMetrics(id, range),
    queryFn: () => managedAppsApi.projectMetrics(id, range),
    enabled: !!id,
    refetchInterval: 30_000,
  })
}

/**
 * The project's edge traffic. Polls at 60s to match the gateway's flush
 * cadence — the data cannot change faster than it arrives.
 */
export function useProjectAnalytics(id: string, range: string) {
  return useQuery({
    queryKey: MANAGED_APPS_QUERY_KEYS.projectAnalytics(id, range),
    queryFn: () => managedAppsApi.projectAnalytics(id, range),
    enabled: !!id,
    refetchInterval: 60_000,
  })
}
