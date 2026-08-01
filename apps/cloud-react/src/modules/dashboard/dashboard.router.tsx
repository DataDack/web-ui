import type { RouteObject } from "react-router-dom"

export const dashboardRoutes: RouteObject[] = [
    {
        index: true,
        lazy: async () => {
            const { DashboardPage } = await import("./page")
            return { Component: DashboardPage }
        },
    },
]
