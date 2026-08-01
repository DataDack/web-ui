import { monitoringApi } from "./monitoring.api"
import type {
    CreateAlarmRequest,
    CreateChannelRequest,
    MetricsQueryParams,
    TestChannelRequest,
    UpdateAlarmRequest,
    UpdateChannelRequest,
} from "./monitoring.types"

export const monitoringService = {
    // Channels
    fetchChannels: () => monitoringApi.listChannels(),
    createChannel: (payload: CreateChannelRequest) => monitoringApi.createChannel(payload),
    updateChannel: (id: string, payload: UpdateChannelRequest) =>
        monitoringApi.updateChannel(id, payload),
    removeChannel: (id: string) => monitoringApi.deleteChannel(id),
    testChannel: (payload: TestChannelRequest) => monitoringApi.testChannel(payload),
    testSavedChannel: (id: string, severity?: string) =>
        monitoringApi.testSavedChannel(id, severity ? { severity } : {}),

    // Jira OAuth
    jiraAuthorizeUrl: () => monitoringApi.jiraAuthorizeUrl(),
    jiraOAuthCallback: (code: string, state: string) =>
        monitoringApi.jiraOAuthCallback({ code, state }),
    fetchJiraConnections: () => monitoringApi.jiraConnections(),
    disconnectJira: (cloudId: string) => monitoringApi.disconnectJira(cloudId),
    fetchJiraProjects: (cloudId?: string) => monitoringApi.jiraProjects(cloudId),
    fetchJiraIssueTypes: (cloudId: string | undefined, projectKey: string) =>
        monitoringApi.jiraIssueTypes(cloudId, projectKey),
    fetchJiraLabels: (cloudId?: string, projectKey?: string) =>
        monitoringApi.jiraLabels(cloudId, projectKey),

    // Alarms
    fetchAlarms: () => monitoringApi.listAlarms(),
    fetchAlarmById: (id: string) => monitoringApi.getAlarm(id),
    createAlarm: (payload: CreateAlarmRequest) => monitoringApi.createAlarm(payload),
    updateAlarm: (id: string, payload: UpdateAlarmRequest) =>
        monitoringApi.updateAlarm(id, payload),
    removeAlarm: (id: string) => monitoringApi.deleteAlarm(id),
    setAlarmEnabled: (id: string, enabled: boolean) => monitoringApi.setAlarmEnabled(id, enabled),
    fetchAlarmHistory: (id: string, limit?: number) => monitoringApi.alarmHistory(id, limit),
    fetchAccountHistory: (limit?: number) => monitoringApi.accountHistory(limit),
    fetchNotifications: (limit?: number) => monitoringApi.notifications(limit),

    // Metrics
    queryMetrics: (params: MetricsQueryParams) => monitoringApi.queryMetrics(params),
}
