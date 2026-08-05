import type { RouteObject } from "react-router-dom"

/**
 * Tenant-facing hosting routes, mounted inside the console shell.
 *
 * The pricing page is registered BEFORE "/hosting/:id" so "plans" is matched as
 * a literal segment rather than read as an account id.
 */
export const hostingRoutes: RouteObject[] = [
  {
    path: "hosting",
    lazy: async () => {
      const { HostingAccountsPage } = await import("./partials/HostingAccountsPage")
      return { Component: HostingAccountsPage }
    },
  },
  {
    path: "hosting/plans",
    lazy: async () => {
      const { HostingPricingPage } = await import("./partials/HostingPricingPage")
      return { Component: HostingPricingPage }
    },
  },
  {
    path: "hosting/:id",
    lazy: async () => {
      const { HostingAccountDetailPage } = await import("./partials/HostingAccountDetailPage")
      return { Component: HostingAccountDetailPage }
    },
  },
]

/**
 * Admin routes, spread into the super-admin router so they inherit its shell
 * and the is_super_admin gate. Declared here rather than there so the hosting
 * module owns every one of its surfaces.
 */
export const hostingAdminRoutes: RouteObject[] = [
  {
    path: "hosting/servers",
    lazy: async () => {
      const { HostingServersPage } = await import("./admin/HostingServersPage")
      return { Component: HostingServersPage }
    },
  },
  {
    // Before "/:id/edit" for the same literal-segment reason as above.
    path: "hosting/servers/new",
    lazy: async () => {
      const { HostingServerFormPage } = await import("./admin/HostingServerFormPage")
      return { Component: HostingServerFormPage }
    },
  },
  {
    path: "hosting/servers/:id/edit",
    lazy: async () => {
      const { HostingServerFormPage } = await import("./admin/HostingServerFormPage")
      return { Component: HostingServerFormPage }
    },
  },
  {
    path: "hosting/server-groups",
    lazy: async () => {
      const { HostingServerGroupsPage } = await import("./admin/HostingServerGroupsPage")
      return { Component: HostingServerGroupsPage }
    },
  },
  {
    path: "hosting/plans",
    lazy: async () => {
      const { HostingPlansPage } = await import("./admin/HostingPlansPage")
      return { Component: HostingPlansPage }
    },
  },
  {
    path: "hosting/plans/new",
    lazy: async () => {
      const { HostingPlanFormPage } = await import("./admin/HostingPlanFormPage")
      return { Component: HostingPlanFormPage }
    },
  },
  {
    path: "hosting/plans/:sku/edit",
    lazy: async () => {
      const { HostingPlanFormPage } = await import("./admin/HostingPlanFormPage")
      return { Component: HostingPlanFormPage }
    },
  },
  {
    path: "hosting/accounts",
    lazy: async () => {
      const { HostingAccountsPage } = await import("./admin/HostingAccountsPage")
      return { Component: HostingAccountsPage }
    },
  },
  {
    path: "hosting/accounts/:id",
    lazy: async () => {
      const { HostingAccountDetailPage } = await import("./admin/HostingAccountDetailPage")
      return { Component: HostingAccountDetailPage }
    },
  },
  {
    path: "hosting/queue",
    lazy: async () => {
      const { HostingQueuePage } = await import("./admin/HostingQueuePage")
      return { Component: HostingQueuePage }
    },
  },
]
