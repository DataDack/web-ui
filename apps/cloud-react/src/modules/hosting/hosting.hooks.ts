import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { hostingApi } from "./hosting.api"
import { HOSTING_QUERY_KEYS, PROVISIONING_POLL_MS, QUEUE_POLL_MS } from "./hosting.constants"
import type {
  AdminCreateRequest,
  HostingPlan,
  ImportRequest,
  JobStatus,
  PlanGroup,
  SaveGroupRequest,
  SaveServerRequest,
} from "./hosting.types"

/**
 * Idempotency keys for mutations that create or change a service.
 *
 * Generated ONCE per user gesture and sent with the request, so a retry — a
 * double-click, a dropped response the browser re-sends — collapses onto the
 * same job on the backend instead of provisioning and charging twice.
 */
function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

/**
 * Narrows an id inside a query that is gated on it by `enabled`.
 *
 * React Query cannot express "this queryFn only runs when the id is present",
 * so every such fetch would otherwise carry a non-null assertion. This throws
 * instead — if the gate is ever removed the query fails loudly rather than
 * quietly requesting `/hosting/accounts/undefined`.
 */
function requireId(id: string | undefined, what: string): string {
  if (!id) throw new Error(`hosting: a ${what} id is required to fetch it`)
  return id
}

/* ── Tenant ────────────────────────────────────────────────────────────── */

export function useHostingPlans() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.publicPlans,
    queryFn: hostingApi.publicPlans,
    // The catalogue is S3-backed and changes only when an admin edits it, so a
    // long stale time keeps the pricing page instant across navigations.
    staleTime: 5 * 60 * 1000,
  })
}

export function useHostingAccounts() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.accounts,
    queryFn: hostingApi.listAccounts,
    // Poll ONLY while something is in flight. A dashboard left open on a
    // settled list should not keep asking; the moment a provision finishes the
    // interval goes back to zero on the next result.
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.provisioning || a.status === "PENDING")
        ? PROVISIONING_POLL_MS
        : false,
  })
}

export function useHostingAccount(id: string | undefined) {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.account(id ?? ""),
    queryFn: () => hostingApi.getAccount(requireId(id, "hosting account")),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.provisioning || query.state.data?.status === "PENDING"
        ? PROVISIONING_POLL_MS
        : false,
  })
}

export function useOrderHosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { domain?: string; plan_sku: string; cycle: string; username?: string }) =>
      hostingApi.order({ ...input, idempotency_key: newIdempotencyKey("order") }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.accounts })
      toast.success("Hosting ordered — provisioning has started")
    },
    onError: (e) => toast.error(extractError(e, "Could not place the order")),
  })
}

/** Opens cPanel in a new tab. The URL is single-use, so it is never stored. */
export function useHostingLogin() {
  return useMutation({
    mutationFn: hostingApi.login,
    onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (e) => toast.error(extractError(e, "Could not open the control panel")),
  })
}

export function useChangeHostingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, planSku }: { id: string; planSku: string }) =>
      hostingApi.changePlan(id, {
        plan_sku: planSku,
        idempotency_key: newIdempotencyKey("plan"),
      }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.account(id) })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.accounts })
      toast.success("Plan change queued")
    },
    onError: (e) => toast.error(extractError(e, "Could not change the plan")),
  })
}

export function useResetHostingPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) =>
      hostingApi.resetPassword(id, { password, idempotency_key: newIdempotencyKey("pw") }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.account(id) })
      toast.success("Password change queued")
    },
    onError: (e) => toast.error(extractError(e, "Could not change the password")),
  })
}

export function useCancelHosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hostingApi.cancel(id, { reason, idempotency_key: newIdempotencyKey("cancel") }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.accounts })
      toast.success("Cancellation queued")
    },
    onError: (e) => toast.error(extractError(e, "Could not cancel the account")),
  })
}

/* ── Admin: modules & servers ──────────────────────────────────────────── */

export function useHostingModules() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminModules,
    queryFn: hostingApi.listModules,
    // Compiled into the backend binary; it cannot change without a deploy.
    staleTime: Infinity,
  })
}

export function useHostingServers() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminServers,
    queryFn: hostingApi.listServers,
  })
}

export function useHostingServer(id: string | undefined) {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminServer(id ?? ""),
    queryFn: () => hostingApi.getServer(requireId(id, "server")),
    enabled: Boolean(id),
  })
}

export function useSaveHostingServer(id?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveServerRequest) =>
      id ? hostingApi.updateServer(id, body) : hostingApi.createServer(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServers })
      if (id) void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServer(id) })
      toast.success(id ? "Server updated" : "Server added")
    },
    onError: (e) => toast.error(extractError(e, "Could not save the server")),
  })
}

export function useDeleteHostingServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hostingApi.deleteServer,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServers })
      toast.success("Server removed")
    },
    onError: (e) => toast.error(extractError(e, "Could not remove the server")),
  })
}

/**
 * Test Connection.
 *
 * A refusing server is a RESULT, not an error — the form renders ok/message
 * inline. Only a transport-level failure reaches onError.
 */
export function useTestHostingServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hostingApi.testServer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServers }),
    onError: (e) => toast.error(extractError(e, "Could not reach the server")),
  })
}

/** Packages pulled live off a box, to fill the plan form's package picker. */
export function useServerPackages(id: string | undefined) {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminServerPackages(id ?? ""),
    queryFn: () => hostingApi.serverPackages(requireId(id, "server")),
    enabled: Boolean(id),
    // A live call to a control panel: never served from a stale cache, but not
    // re-fetched on every focus either.
    staleTime: 60 * 1000,
    retry: false,
  })
}

export function useHostingServerGroups() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminServerGroups,
    queryFn: hostingApi.listServerGroups,
  })
}

export function useSaveServerGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveGroupRequest }) =>
      id ? hostingApi.updateServerGroup(id, body) : hostingApi.createServerGroup(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServerGroups })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServers })
      toast.success("Server group saved")
    },
    onError: (e) => toast.error(extractError(e, "Could not save the group")),
  })
}

export function useDeleteServerGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hostingApi.deleteServerGroup,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminServerGroups })
      toast.success("Server group removed")
    },
    onError: (e) => toast.error(extractError(e, "Could not remove the group")),
  })
}

/* ── Admin: plans ──────────────────────────────────────────────────────── */

export function useAdminHostingPlans() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminPlans,
    queryFn: hostingApi.adminPlans,
  })
}

export function useAdminHostingPlan(sku: string | undefined) {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminPlan(sku ?? ""),
    queryFn: () => hostingApi.adminPlan(requireId(sku, "plan")),
    enabled: Boolean(sku),
  })
}

export function useSaveHostingPlan(prevSku?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: HostingPlan) =>
      prevSku ? hostingApi.updatePlan(prevSku, body) : hostingApi.createPlan(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminPlans })
      // The public catalogue is the same S3 objects, so it has to drop too or
      // the pricing page keeps showing yesterday's prices.
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.publicPlans })
      toast.success("Plan saved")
    },
    onError: (e) => toast.error(extractError(e, "Could not save the plan")),
  })
}

export function useDeleteHostingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hostingApi.deletePlan,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminPlans })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.publicPlans })
      toast.success("Plan removed")
    },
    onError: (e) => toast.error(extractError(e, "Could not remove the plan")),
  })
}

export function useSavePlanGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, prevKey }: { body: PlanGroup; prevKey?: string }) =>
      hostingApi.savePlanGroup(body, prevKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminPlans })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.publicPlans })
      toast.success("Section saved")
    },
    onError: (e) => toast.error(extractError(e, "Could not save the section")),
  })
}

/* ── Admin: accounts ───────────────────────────────────────────────────── */

export function useAdminHostingAccounts(filters?: {
  status?: string
  server_id?: string
  plan_sku?: string
  q?: string
}) {
  return useQuery({
    queryKey: [...HOSTING_QUERY_KEYS.adminAccounts, filters ?? {}] as const,
    queryFn: () => hostingApi.adminAccounts(filters),
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.provisioning || a.status === "PENDING")
        ? PROVISIONING_POLL_MS
        : false,
  })
}

export function useAdminHostingAccount(id: string | undefined) {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminAccount(id ?? ""),
    queryFn: () => hostingApi.adminAccount(requireId(id, "hosting account")),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.provisioning ? PROVISIONING_POLL_MS : false),
  })
}

/**
 * Every operator lifecycle action funnels through here so they all invalidate
 * the same three caches. Written once rather than six times, because a missed
 * invalidation shows the operator a stale status right after they acted on it.
 */
function useAccountAction<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
  idOf: (args: TArgs) => string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, args) => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminAccounts })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminAccount(idOf(args)) })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminJobs })
      toast.success(successMessage)
    },
    onError: (e) => toast.error(extractError(e, failureMessage)),
  })
}

export function useAdminSuspendAccount() {
  return useAccountAction(
    ({ id, reason }: { id: string; reason: string }) => hostingApi.adminSuspend(id, reason),
    "Suspension queued",
    "Could not suspend the account",
    (a) => a.id,
  )
}

export function useAdminUnsuspendAccount() {
  return useAccountAction(
    ({ id }: { id: string }) => hostingApi.adminUnsuspend(id),
    "Unsuspension queued",
    "Could not unsuspend the account",
    (a) => a.id,
  )
}

export function useAdminTerminateAccount() {
  return useAccountAction(
    ({ id, reason }: { id: string; reason: string }) => hostingApi.adminTerminate(id, reason),
    "Termination queued",
    "Could not terminate the account",
    (a) => a.id,
  )
}

export function useAdminChangeAccountPlan() {
  return useAccountAction(
    ({ id, planSku }: { id: string; planSku: string }) => hostingApi.adminChangePlan(id, planSku),
    "Plan change queued",
    "Could not change the plan",
    (a) => a.id,
  )
}

export function useAdminSyncAccount() {
  return useAccountAction(
    ({ id }: { id: string }) => hostingApi.adminSync(id),
    "Usage refresh queued",
    "Could not queue the refresh",
    (a) => a.id,
  )
}

export function useAdminMoveAccount() {
  return useAccountAction(
    ({ id, serverId }: { id: string; serverId: string }) => hostingApi.adminMove(id, serverId),
    "Move queued",
    "Could not move the account",
    (a) => a.id,
  )
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) =>
      hostingApi.adminResetPassword(id, password),
    onError: (e) => toast.error(extractError(e, "Could not change the password")),
  })
}

export function useAdminHostingLogin() {
  return useMutation({
    mutationFn: hostingApi.adminLogin,
    onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (e) => toast.error(extractError(e, "Could not open the control panel")),
  })
}

export function useAdminCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<AdminCreateRequest, "idempotency_key">) =>
      hostingApi.adminCreateAccount({
        ...input,
        idempotency_key: newIdempotencyKey("admin-order"),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminAccounts })
      toast.success("Provisioning started")
    },
    onError: (e) => toast.error(extractError(e, "Could not provision the account")),
  })
}

export function useImportScan(serverId: string | undefined) {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminImportScan(serverId ?? ""),
    queryFn: () => hostingApi.scanImport(requireId(serverId, "server")),
    enabled: Boolean(serverId),
    retry: false,
  })
}

export function useRunImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ImportRequest) => hostingApi.runImport(body),
    onSuccess: (res) => {
      if (res.dry_run) return
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminAccounts })
      toast.success(`Imported ${res.items.length} account(s)`)
    },
    onError: (e) => toast.error(extractError(e, "Could not import accounts")),
  })
}

/* ── Admin: queue ──────────────────────────────────────────────────────── */

export function useHostingJobs(status?: JobStatus) {
  return useQuery({
    queryKey: [...HOSTING_QUERY_KEYS.adminJobs, status ?? "all"] as const,
    queryFn: () => hostingApi.listJobs(status),
    // Operators sit on this page while a batch drains, so it refreshes on its
    // own rather than making them hit reload.
    refetchInterval: QUEUE_POLL_MS,
  })
}

export function useHostingJobCounts() {
  return useQuery({
    queryKey: HOSTING_QUERY_KEYS.adminJobCounts,
    queryFn: hostingApi.jobCounts,
    refetchInterval: QUEUE_POLL_MS,
  })
}

export function useRetryHostingJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hostingApi.retryJob,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminJobs })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminJobCounts })
      toast.success("Job requeued")
    },
    onError: (e) => toast.error(extractError(e, "Could not requeue the job")),
  })
}

export function useCancelHostingJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hostingApi.cancelJob,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminJobs })
      void qc.invalidateQueries({ queryKey: HOSTING_QUERY_KEYS.adminJobCounts })
      toast.success("Job cancelled")
    },
    onError: (e) => toast.error(extractError(e, "Could not cancel the job")),
  })
}

/* ── Admin: audit ──────────────────────────────────────────────────────── */

export function useHostingAudit(filters?: { account_id?: string; server_id?: string }) {
  return useQuery({
    queryKey: [...HOSTING_QUERY_KEYS.adminAudit, filters ?? {}] as const,
    queryFn: () => hostingApi.auditTrail(filters),
  })
}
