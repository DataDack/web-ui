import type { RouteObject } from "react-router-dom"

export const monitoringRoutes: RouteObject[] = [
    {
        path: "monitoring",
        lazy: async () => {
            const { MonitoringOverviewPage } = await import("./partials/MonitoringOverviewPage")
            return { Component: MonitoringOverviewPage }
        },
    },
    {
        path: "monitoring/alarms",
        lazy: async () => {
            const { AlarmsListPage } = await import("./partials/AlarmsListPage")
            return { Component: AlarmsListPage }
        },
    },
    {
        // Registered BEFORE :id so "create" is not swallowed by the id param.
        // One component serves create and edit — same page, same sections.
        //
        // hideSidebar matches every other create surface in the console (compute
        // instances, load balancers, target groups, VPCs, security groups): an
        // authoring page gets the full width, and the readiness rail on the right
        // is the only navigation it needs.
        path: "monitoring/alarms/create",
        handle: { hideSidebar: true },
        lazy: async () => {
            const { AlarmFormPage } = await import("./partials/AlarmFormPage")
            return { Component: AlarmFormPage }
        },
    },
    {
        // Edit is a distinct path (not a mode toggle on the detail page) so the
        // form can be linked to and reloaded directly. Same page as create, so it
        // hides the sidebar too — editing an alarm should not look like a
        // different screen from creating one.
        path: "monitoring/alarms/:id/edit",
        handle: { hideSidebar: true },
        lazy: async () => {
            const { AlarmFormPage } = await import("./partials/AlarmFormPage")
            return { Component: AlarmFormPage }
        },
    },
    {
        path: "monitoring/alarms/:id",
        lazy: async () => {
            const { AlarmDetailPage } = await import("./partials/AlarmDetailPage")
            return { Component: AlarmDetailPage }
        },
    },
    {
        // Registered BEFORE monitoring/channels is irrelevant (distinct exact
        // path), but the OAuth callback must be its own SPA route so Atlassian
        // can redirect the browser here after consent.
        path: "monitoring/channels/jira/callback",
        lazy: async () => {
            const { JiraOAuthCallbackPage } = await import(
                "./partials/JiraOAuthCallbackPage"
            )
            return { Component: JiraOAuthCallbackPage }
        },
    },
    {
        path: "monitoring/channels",
        lazy: async () => {
            const { ChannelsPage } = await import("./channels/ChannelsPage")
            return { Component: ChannelsPage }
        },
    },
    {
        path: "monitoring/logs",
        lazy: async () => {
            const { LogsPage } = await import("./partials/LogsPage")
            return { Component: LogsPage }
        },
    },
]
