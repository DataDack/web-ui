import type { RouteObject } from "react-router-dom"

// Catch-all 404 — must stay last in the top-level route array.
export const errorRoutes: RouteObject[] = [
    {
        path: "*",
        lazy: async () => {
            const { NotFoundPage } = await import("./NotFoundPage")
            return { Component: NotFoundPage }
        },
    },
]
