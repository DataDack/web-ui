import type { RouteObject } from "react-router-dom"

// Support is a service-scoped area (its own sidebar rail), so these routes keep
// the default shell sidebar rather than opting out like the platform pages.
export const supportTicketsRoutes: RouteObject[] = [
    {
        path: "support/tickets",
        lazy: async () => {
            const { SupportTicketsPage } = await import("./partials/SupportTicketsPage")
            return { Component: SupportTicketsPage }
        },
    },
    {
        path: "support/tickets/create",
        lazy: async () => {
            const { SupportTicketCreatePage } = await import("./partials/SupportTicketCreatePage")
            return { Component: SupportTicketCreatePage }
        },
    },
    {
        path: "support/tickets/:id",
        lazy: async () => {
            const { SupportTicketDetailPage } = await import("./partials/SupportTicketDetailPage")
            return { Component: SupportTicketDetailPage }
        },
    },
]
