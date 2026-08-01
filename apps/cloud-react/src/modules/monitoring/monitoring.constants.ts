import type { MetricsWindowQuery } from "./monitoring.types"

export const MONITORING_ROUTES = {
    root: "/monitoring",
    alarms: "/monitoring/alarms",
    alarmCreate: "/monitoring/alarms/create",
    alarmEdit: (id: string) => `/monitoring/alarms/${id}/edit`,
    alarm: (id: string) => `/monitoring/alarms/${id}`,
    channels: "/monitoring/channels",
    jiraCallback: "/monitoring/channels/jira/callback",
    logs: "/monitoring/logs",
} as const

/**
 * Deep link into the create wizard with the target preselected — how the
 * "Create alarm" button on a load balancer or instance detail page enters the
 * flow, so step 1 is already answered.
 */
export function alarmCreateForTarget(type: string, targetId: string, name = ""): string {
    const search = new URLSearchParams({ target_type: type, target_id: targetId })
    if (name) search.set("target_name", name)
    return `${MONITORING_ROUTES.alarmCreate}?${search.toString()}`
}

export const MONITORING_QUERY_KEYS = {
    alarms: ["monitoring", "alarms"] as const,
    alarm: (id: string) => ["monitoring", "alarms", id] as const,
    alarmHistory: (id: string) => ["monitoring", "alarms", id, "history"] as const,
    history: ["monitoring", "history"] as const,
    notifications: ["monitoring", "notifications"] as const,
    channels: ["monitoring", "channels"] as const,
    jiraConnections: ["monitoring", "jira", "connections"] as const,
    jiraProjects: (cloudId: string) => ["monitoring", "jira", "projects", cloudId] as const,
    jiraIssueTypes: (cloudId: string, projectKey: string) =>
        ["monitoring", "jira", "issue-types", cloudId, projectKey] as const,
    jiraLabels: (cloudId: string, projectKey: string) =>
        ["monitoring", "jira", "labels", cloudId, projectKey] as const,
    metrics: (query: MetricsWindowQuery) => ["monitoring", "metrics", query] as const,
    logGroups: ["monitoring", "log-groups"] as const,
    logEvents: (group: string) => ["monitoring", "log-events", group] as const,
}
