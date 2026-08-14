import type { RouteObject } from "react-router-dom"

export const domainsRoutes: RouteObject[] = [
  {
    path: "domains",
    lazy: async () => {
      const { DomainsListPage } = await import("./partials/DomainsListPage")
      return { Component: DomainsListPage }
    },
  },
]

// Spread into superadmin.router.tsx (like hostingAdminRoutes) so the page
// inherits the admin shell and the is_super_admin gate.
export const domainsAdminRoutes: RouteObject[] = [
  {
    path: "domains",
    lazy: async () => {
      const { AdminDomainsPage } = await import("./partials/AdminDomainsPage")
      return { Component: AdminDomainsPage }
    },
  },
]
