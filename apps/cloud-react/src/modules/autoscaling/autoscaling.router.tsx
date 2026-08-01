import type { RouteObject } from "react-router-dom"

// Auto Scaling is gated behind a "coming soon" placeholder for now. The full
// list/detail pages still exist (AutoscalingListPage / AsgDetailPage) and can
// be re-wired here once the feature ships.
export const autoscalingRoutes: RouteObject[] = [
    {
        path: "compute/autoscaling",
        lazy: async () => {
            const { AutoscalingComingSoon } = await import("./partials/AutoscalingComingSoon")
            return { Component: AutoscalingComingSoon }
        },
    },
    {
        path: "compute/autoscaling/:id",
        lazy: async () => {
            const { AutoscalingComingSoon } = await import("./partials/AutoscalingComingSoon")
            return { Component: AutoscalingComingSoon }
        },
    },
]
