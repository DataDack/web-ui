import { Navigate, type RouteObject } from "react-router-dom"

// The accounts list was merged into the account settings page (Governance), so
// the standalone /accounts list now redirects there. The per-account detail page
// stays at /accounts/:id and is kept on the Governance sidebar via the service's
// `extraMatch` (see sidebar-nav).
export const accountsRoutes: RouteObject[] = [
    {
        path: "accounts",
        element: <Navigate to="/governance/account" replace />,
    },
    {
        path: "accounts/:id",
        lazy: async () => {
            const { AccountDetailPage } = await import("./partials/AccountDetailPage")
            return { Component: AccountDetailPage }
        },
    },
]
