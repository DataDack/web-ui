import type { RouteObject } from "react-router-dom"

export const disksRoutes: RouteObject[] = [
    {
        path: "compute/disks",
        lazy: async () => {
            const { DisksListPage } = await import("./partials/DisksListPage")
            return { Component: DisksListPage }
        },
    },
]
