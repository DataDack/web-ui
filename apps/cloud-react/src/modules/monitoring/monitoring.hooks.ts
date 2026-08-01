import { useMemo } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { extractError } from "@/services/api/client"

import { MONITORING_QUERY_KEYS } from "./monitoring.constants"
import { monitoringService } from "./monitoring.service"
import type {
  AlertSeverity,
  CreateAlarmRequest,
  CreateChannelRequest,
  MetricsQueryParams,
  MetricsWindowQuery,
  TestChannelRequest,
  UpdateAlarmRequest,
  UpdateChannelRequest,
} from "./monitoring.types"

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export function useChannels() {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.channels,
    queryFn: monitoringService.fetchChannels,
  })
}

/**
 * Create (and implicitly test-deliver) a channel. The backend fires a real
 * test notification before saving and returns `{channel, test}` — callers
 * render the per-channel test result inline, so no delivery toast here.
 */
export function useCreateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateChannelRequest) => monitoringService.createChannel(payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.channels })
      toast.success(`Channel "${res.channel.name}" created`)
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(extractError(e, "Failed to create channel"))
    },
  })
}

export function useUpdateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateChannelRequest }) =>
      monitoringService.updateChannel(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.channels })
      toast.success("Channel updated")
    },
    onError: (e) => toast.error(extractError(e, "Failed to update channel")),
  })
}

export function useDeleteChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => monitoringService.removeChannel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.channels })
      // A deleted channel also disappears from alarm bindings.
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.alarms })
      toast.success("Channel deleted")
    },
    onError: (e) => toast.error(extractError(e, "Failed to delete channel")),
  })
}

/**
 * Test-deliver a notification to an unsaved channel config.
 *
 * Deliberately no success/failure toast on resolve: the backend answers 200
 * for both delivered and undelivered attempts (`delivered: false` + `error`),
 * and the Channels page renders that rich per-channel result inline. Only a
 * rejected request (400 validation, network) surfaces as an error toast.
 */
export function useTestChannel() {
  return useMutation({
    mutationFn: (payload: TestChannelRequest) => monitoringService.testChannel(payload),
    onError: (e) => toast.error(extractError(e, "Channel test request failed")),
  })
}

/**
 * Test-deliver to a saved channel. Same 200-with-`delivered:false` contract as
 * the ad-hoc test — callers inspect the result; only request failures toast
 * here. The channels list is refreshed so `last_delivery_*` stays current.
 */
export function useTestSavedChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, severity }: { id: string; severity?: AlertSeverity }) =>
      monitoringService.testSavedChannel(id, severity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.channels })
    },
    onError: (e) => toast.error(extractError(e, "Channel test request failed")),
  })
}

// ---------------------------------------------------------------------------
// Jira "Continue with Jira" OAuth
// ---------------------------------------------------------------------------

/** Connected Atlassian sites for the account. */
export function useJiraConnections() {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.jiraConnections,
    queryFn: monitoringService.fetchJiraConnections,
  })
}

/** Projects on a connected site — for the create-channel project dropdown. */
export function useJiraProjects(cloudId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.jiraProjects(cloudId ?? "default"),
    queryFn: () => monitoringService.fetchJiraProjects(cloudId),
    enabled,
  })
}

/** Issue types available when creating an issue in a connected Jira project. */
export function useJiraIssueTypes(
  cloudId: string | undefined,
  projectKey: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.jiraIssueTypes(cloudId ?? "default", projectKey ?? ""),
    queryFn: () => monitoringService.fetchJiraIssueTypes(cloudId, projectKey ?? ""),
    enabled: enabled && !!projectKey,
  })
}

/** Jira label suggestions for the selected site/project. */
export function useJiraLabels(
  cloudId: string | undefined,
  projectKey: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.jiraLabels(cloudId ?? "default", projectKey ?? ""),
    queryFn: () => monitoringService.fetchJiraLabels(cloudId, projectKey),
    enabled,
  })
}

/** Fetch the Atlassian consent URL, then hand off the browser to it. */
export function useStartJiraOAuth() {
  return useMutation({
    mutationFn: () => monitoringService.jiraAuthorizeUrl(),
    onError: (e) => toast.error(extractError(e, "Could not start Jira sign-in")),
  })
}

/** Complete the OAuth callback (code+state) → stores the connection(s). */
export function useJiraOAuthCallback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) =>
      monitoringService.jiraOAuthCallback(code, state),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: MONITORING_QUERY_KEYS.jiraConnections,
      })
    },
  })
}

export function useDisconnectJira() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cloudId: string) => monitoringService.disconnectJira(cloudId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: MONITORING_QUERY_KEYS.jiraConnections,
      })
      toast.success("Jira site disconnected")
    },
    onError: (e) => toast.error(extractError(e, "Failed to disconnect Jira")),
  })
}

// ---------------------------------------------------------------------------
// Alarms
// ---------------------------------------------------------------------------

/** Alarm list, kept fresh: states flip server-side as the evaluator runs. */
export function useAlarms() {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.alarms,
    queryFn: monitoringService.fetchAlarms,
    refetchInterval: 30_000,
  })
}

export function useAlarm(id: string) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.alarm(id),
    queryFn: () => monitoringService.fetchAlarmById(id),
    enabled: !!id,
    refetchInterval: 30_000,
  })
}

export function useAlarmHistory(id: string, limit = 50) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.alarmHistory(id),
    queryFn: () => monitoringService.fetchAlarmHistory(id, limit),
    enabled: !!id,
  })
}

/** Account-wide state transitions (alarm names are mapped client-side). */
export function useAccountHistory(limit = 20) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.history,
    queryFn: () => monitoringService.fetchAccountHistory(limit),
  })
}

export function useNotifications(limit = 50) {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.notifications,
    queryFn: () => monitoringService.fetchNotifications(limit),
  })
}

/**
 * Delivery attempts for one alarm — the only place a silently failed Jira or
 * webhook delivery becomes visible.
 *
 * The backend exposes just the account-wide log (`GET /alerts/notifications`),
 * so this filters client-side. On a chatty account an older alarm's rows can
 * fall past `limit`, which is why the default is generous: an empty list here
 * means "nothing in the last `limit` account deliveries", not "never delivered".
 */
export function useAlarmNotifications(alarmId: string, limit = 200) {
  const query = useNotifications(limit)
  const all = query.data
  const data = useMemo(
    () => (all ?? []).filter((notification) => notification.alarm_id === alarmId),
    [all, alarmId],
  )
  return { ...query, data }
}

export function useCreateAlarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAlarmRequest) => monitoringService.createAlarm(payload),
    onSuccess: (alarm) => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.alarms })
      toast.success(`Alarm "${alarm.name}" created`)
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(extractError(e, "Failed to create alarm"))
    },
  })
}

export function useUpdateAlarm(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateAlarmRequest) => monitoringService.updateAlarm(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.alarms })
      toast.success("Alarm updated")
    },
    onError: (e) => toast.error(extractError(e, "Failed to update alarm")),
  })
}

export function useDeleteAlarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => monitoringService.removeAlarm(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.alarms })
      toast.success("Alarm deleted")
    },
    onError: (e) => toast.error(extractError(e, "Failed to delete alarm")),
  })
}

export function useSetAlarmEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      monitoringService.setAlarmEnabled(id, enabled),
    onSuccess: (alarm) => {
      void queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.alarms })
      toast.success(alarm.enabled ? "Alarm enabled" : "Alarm disabled")
    },
    onError: (e) => toast.error(extractError(e, "Failed to update alarm")),
  })
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Aggregated metric buckets over a rolling window ending "now" — pass `null`
 * to hold the query (e.g. alarm still loading). The concrete `from`/`to`
 * bounds are computed inside the fetcher (floored to the minute) so render
 * code stays pure and the query key stays stable; the interval refetch rolls
 * the window forward.
 */
export function useMetricsQuery(query: MetricsWindowQuery | null) {
  return useQuery({
    // A disabled query still needs a stable key.
    queryKey: query
      ? MONITORING_QUERY_KEYS.metrics(query)
      : (["monitoring", "metrics", "idle"] as const),
    queryFn: () => {
      if (!query) return Promise.reject(new Error("metrics query missing"))
      const toMs = Math.floor(Date.now() / 60_000) * 60_000
      const params: MetricsQueryParams = {
        namespace: query.namespace,
        metric: query.metric,
        statistic: query.statistic,
        period: query.period,
        dimensions: query.dimensions,
        from: new Date(toMs - query.windowMs).toISOString(),
        to: new Date(toMs).toISOString(),
      }
      return monitoringService.queryMetrics(params)
    },
    enabled: query != null,
    refetchInterval: 60_000,
  })
}
