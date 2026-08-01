import type { RouteObject } from "react-router-dom"

// Target groups are a top-level compute resource, not a sub-page of a load
// balancer: one group can back several load balancers, so burying it under any
// one of them would make the shared case impossible to find.
export const targetGroupsRoutes: RouteObject[] = [
    {
        path: "compute/target-groups",
        lazy: async () => {
            const { TargetGroupsListPage } = await import("./partials/TargetGroupsListPage")
            return { Component: TargetGroupsListPage }
        },
    },
    {
        // Registered BEFORE :id so "create" is not swallowed by the id param.
        path: "compute/target-groups/create",
        handle: { hideSidebar: true },
        lazy: async () => {
            const { TargetGroupCreateWizardPage } =
                await import("./partials/TargetGroupCreateWizardPage")
            return { Component: TargetGroupCreateWizardPage }
        },
    },
    {
        path: "compute/target-groups/:id",
        lazy: async () => {
            const { TargetGroupDetailPage } = await import("./partials/TargetGroupDetailPage")
            return { Component: TargetGroupDetailPage }
        },
    },
]
