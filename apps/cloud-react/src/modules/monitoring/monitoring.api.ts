import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api/client"

import type {
    Alarm,
    AlarmChannelBinding,
    AlarmHistoryEntry,
    AlarmNotification,
    AlarmTransition,
    ChannelResponse,
    CreateAlarmRequest,
    CreateChannelRequest,
    CreateChannelResponse,
    JiraAuthorizeUrl,
    JiraConnection,
    JiraIssueType,
    JiraLabel,
    JiraProject,
    MetricsQueryBucket,
    MetricsQueryParams,
    MetricsQueryResult,
    TestChannelRequest,
    TestChannelResult,
    UpdateAlarmRequest,
    UpdateChannelRequest,
} from "./monitoring.types"

// cloud-be-go: app "monitoring", modules "alerts" + "metrics".
//   Channels:  GET/POST /alerts/channels · PUT/DELETE /alerts/channels/:id
//              POST /alerts/channels/test (ad-hoc) · POST /alerts/channels/:id/test
//   Alarms:    GET/POST /alerts/alarms · GET/PUT/DELETE /alerts/alarms/:id
//              PUT /alerts/alarms/:id/{enable|disable} · GET /alerts/alarms/:id/history
//   Account:   GET /alerts/history · GET /alerts/notifications
//   Metrics:   GET /metrics/query
const ALERTS_BASE = "/monitoring/alerts"
const METRICS_BASE = "/monitoring/metrics"

// ---------------------------------------------------------------------------
// Wire normalization — where `null` arrays die.
//
// Go marshals a NIL SLICE as JSON `null`, not `[]`. Several endpoints here build
// their result with `var out []T` and return it unpopulated for the empty case:
// an alarm with no channel bindings, an account with no alarms, a metric range
// with no buckets, an alarm with no recorded transitions.
//
// A destructuring default does NOT save callers from that — `const { data = [] }`
// only fires for `undefined`, so a `null` sails straight through to `.map()` and
// takes the page down. (It did: AlarmDetailPage crashed on `alarm.channels.map`
// for an alarm with no channels.)
//
// So every array the API can null out is coerced here, once, at the boundary.
// The exported types stay honest — arrays are arrays — and no page needs to
// defend itself. The `Wire*` types below describe what the socket really sends.
// ---------------------------------------------------------------------------

/** A binding's state set is jsonb server-side, so it too can arrive as null. */
type WireBinding = Omit<AlarmChannelBinding, "on_transitions"> & {
    on_transitions: AlarmTransition[] | null
}

type WireAlarm = Omit<Alarm, "channels" | "dimensions"> & {
    channels: WireBinding[] | null
    dimensions: Record<string, string> | null
}

type WireHistoryEntry = Omit<AlarmHistoryEntry, "evaluated_datapoints"> & {
    evaluated_datapoints: number[] | null
}

type WireMetricsResult = Omit<MetricsQueryResult, "buckets"> & {
    buckets: MetricsQueryBucket[] | null
}

function arr<T>(value: T[] | null): T[] {
    return value ?? []
}

function normalizeAlarm(alarm: WireAlarm): Alarm {
    return {
        ...alarm,
        channels: arr(alarm.channels).map((binding) => ({
            ...binding,
            // A binding with no readable routing falls back to alarm + recovery,
            // matching the server's own fallback — a binding that quietly notifies
            // nobody is the failure nobody spots.
            on_transitions: arr(binding.on_transitions).length
                ? arr(binding.on_transitions)
                : (["ALARM", "OK"] as AlarmTransition[]),
        })),
        dimensions: alarm.dimensions ?? {},
    }
}

function normalizeHistoryEntry(entry: WireHistoryEntry): AlarmHistoryEntry {
    return { ...entry, evaluated_datapoints: arr(entry.evaluated_datapoints) }
}

/** dim.<key>=<value> per dimension, RFC3339 from/to. */
function metricsQueryString(params: MetricsQueryParams): string {
    const search = new URLSearchParams({
        namespace: params.namespace,
        metric: params.metric,
        statistic: params.statistic,
        period: String(params.period),
        from: params.from,
        to: params.to,
    })
    for (const [key, value] of Object.entries(params.dimensions ?? {})) {
        search.set(`dim.${key}`, value)
    }
    return search.toString()
}

export const monitoringApi = {
    // ── Channels ──────────────────────────────────────────────────────────
    listChannels: (): Promise<ChannelResponse[]> =>
        apiGet<ChannelResponse[] | null>(`${ALERTS_BASE}/channels`).then(arr),

    /** The backend validates, encrypts and test-delivers before saving. */
    createChannel: (payload: CreateChannelRequest): Promise<CreateChannelResponse> =>
        apiPost<CreateChannelResponse>(`${ALERTS_BASE}/channels`, payload),

    updateChannel: (id: string, payload: UpdateChannelRequest): Promise<ChannelResponse> =>
        apiPut<ChannelResponse>(`${ALERTS_BASE}/channels/${id}`, payload),

    deleteChannel: (id: string): Promise<void> => apiDelete(`${ALERTS_BASE}/channels/${id}`),

    /**
     * Fire a test notification at an unsaved channel config. The backend
     * returns 200 with `delivered: false` (+ `error`) for delivery failures —
     * only invalid requests are 400 — so callers must inspect the result.
     */
    testChannel: (payload: TestChannelRequest): Promise<TestChannelResult> =>
        apiPost<TestChannelResult>(`${ALERTS_BASE}/channels/test`, payload),

    /** Test-deliver to a saved channel (same 200-with-`delivered:false` rule). */
    testSavedChannel: (
        id: string,
        payload: { severity?: string } = {}
    ): Promise<TestChannelResult> =>
        apiPost<TestChannelResult>(`${ALERTS_BASE}/channels/${id}/test`, payload),

    // ── Jira "Continue with Jira" OAuth ───────────────────────────────────
    /** Returns the Atlassian consent URL to open (with a one-time CSRF state). */
    jiraAuthorizeUrl: (): Promise<JiraAuthorizeUrl> =>
        apiGet<JiraAuthorizeUrl>(`${ALERTS_BASE}/channels/jira/oauth/authorize-url`),

    /** Exchange the callback code+state; returns the connected site(s). */
    jiraOAuthCallback: (payload: { code: string; state: string }): Promise<JiraConnection[]> =>
        apiPost<JiraConnection[] | null>(
            `${ALERTS_BASE}/channels/jira/oauth/callback`,
            payload
        ).then(arr),

    /** List the account's connected Atlassian sites. */
    jiraConnections: (): Promise<JiraConnection[]> =>
        apiGet<JiraConnection[] | null>(`${ALERTS_BASE}/channels/jira/connections`).then(arr),

    disconnectJira: (cloudId: string): Promise<void> =>
        apiDelete(`${ALERTS_BASE}/channels/jira/connections/${cloudId}`),

    /** Projects visible on a connected site (create-channel dropdown). */
    jiraProjects: (cloudId?: string): Promise<JiraProject[]> =>
        apiGet<JiraProject[] | null>(
            `${ALERTS_BASE}/channels/jira/projects${
                cloudId ? `?cloud_id=${encodeURIComponent(cloudId)}` : ""
            }`
        ).then(arr),

    /** Issue types available for issue creation in a connected Jira project. */
    jiraIssueTypes: (cloudId: string | undefined, projectKey: string): Promise<JiraIssueType[]> => {
        const search = new URLSearchParams({ project_key: projectKey })
        if (cloudId) search.set("cloud_id", cloudId)
        return apiGet<JiraIssueType[] | null>(
            `${ALERTS_BASE}/channels/jira/issue-types?${search.toString()}`
        ).then(arr)
    },

    /** Label suggestions visible on a connected Jira site. */
    jiraLabels: (cloudId?: string, projectKey?: string): Promise<JiraLabel[]> => {
        const search = new URLSearchParams()
        if (cloudId) search.set("cloud_id", cloudId)
        if (projectKey) search.set("project_key", projectKey)
        const query = search.toString()
        const url = `${ALERTS_BASE}/channels/jira/labels` + (query ? `?${query}` : "")
        return apiGet<JiraLabel[] | null>(url).then(arr)
    },

    // ── Alarms ────────────────────────────────────────────────────────────
    listAlarms: (): Promise<Alarm[]> =>
        apiGet<WireAlarm[] | null>(`${ALERTS_BASE}/alarms`).then((rows) =>
            arr(rows).map(normalizeAlarm)
        ),

    getAlarm: (id: string): Promise<Alarm> =>
        apiGet<WireAlarm>(`${ALERTS_BASE}/alarms/${id}`).then(normalizeAlarm),

    createAlarm: (payload: CreateAlarmRequest): Promise<Alarm> =>
        apiPost<WireAlarm>(`${ALERTS_BASE}/alarms`, payload).then(normalizeAlarm),

    updateAlarm: (id: string, payload: UpdateAlarmRequest): Promise<Alarm> =>
        apiPut<WireAlarm>(`${ALERTS_BASE}/alarms/${id}`, payload).then(normalizeAlarm),

    deleteAlarm: (id: string): Promise<void> => apiDelete(`${ALERTS_BASE}/alarms/${id}`),

    setAlarmEnabled: (id: string, enabled: boolean): Promise<Alarm> =>
        apiPut<WireAlarm>(`${ALERTS_BASE}/alarms/${id}/${enabled ? "enable" : "disable"}`).then(
            normalizeAlarm
        ),

    alarmHistory: (id: string, limit = 50): Promise<AlarmHistoryEntry[]> =>
        apiGet<WireHistoryEntry[] | null>(
            `${ALERTS_BASE}/alarms/${id}/history?limit=${String(limit)}`
        ).then((rows) => arr(rows).map(normalizeHistoryEntry)),

    /** Account-wide transitions (may include rows for since-deleted alarms). */
    accountHistory: (limit = 20): Promise<AlarmHistoryEntry[]> =>
        apiGet<WireHistoryEntry[] | null>(`${ALERTS_BASE}/history?limit=${String(limit)}`).then(
            (rows) => arr(rows).map(normalizeHistoryEntry)
        ),

    notifications: (limit = 50): Promise<AlarmNotification[]> =>
        apiGet<AlarmNotification[] | null>(
            `${ALERTS_BASE}/notifications?limit=${String(limit)}`
        ).then(arr),

    // ── Metrics ───────────────────────────────────────────────────────────
    queryMetrics: (params: MetricsQueryParams): Promise<MetricsQueryResult> =>
        apiGet<WireMetricsResult>(`${METRICS_BASE}/query?${metricsQueryString(params)}`).then(
            (result) => ({ ...result, buckets: arr(result.buckets) })
        ),
}
