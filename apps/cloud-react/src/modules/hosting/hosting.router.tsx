import { Navigate, type RouteObject } from "react-router-dom"

import { MANAGED_APPS_ROUTES } from "@/modules/managed-apps/managed-apps.constants"

/**
 * Tenant-facing hosting routes, mounted inside the console shell.
 *
 * The pricing page is registered BEFORE "/hosting/:id" so "plans" is matched as
 * a literal segment rather than read as an account id.
 */
export const hostingRoutes: RouteObject[] = [
  {
    // The account list lives in the Domains service. This stays as a redirect:
    // "/hosting" is in customers' bookmarks and in every email we have sent
    // about a provisioned account.
    path: "hosting",
    element: <Navigate to={MANAGED_APPS_ROUTES.hosting} replace />,
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
    path: "hosting",
    lazy: async () => {
      const { HostingAdminLayout } = await import("./admin/HostingAdminLayout")
      return { Component: HostingAdminLayout }
    },
    children: [
      { index: true, element: <Navigate to="servers" replace /> },
      {
        path: "servers",
        lazy: async () => {
          const { HostingServersPage } = await import("./admin/HostingServersPage")
          return { Component: HostingServersPage }
        },
      },
      {
        path: "servers/new",
        lazy: async () => {
          const { HostingServerFormPage } = await import("./admin/HostingServerFormPage")
          return { Component: HostingServerFormPage }
        },
      },
      {
        path: "servers/:id/edit",
        lazy: async () => {
          const { HostingServerFormPage } = await import("./admin/HostingServerFormPage")
          return { Component: HostingServerFormPage }
        },
      },
      {
        path: "server-groups",
        lazy: async () => {
          const { HostingServerGroupsPage } = await import("./admin/HostingServerGroupsPage")
          return { Component: HostingServerGroupsPage }
        },
      },
      {
        path: "plans",
        lazy: async () => {
          const { HostingPlansPage } = await import("./admin/HostingPlansPage")
          return { Component: HostingPlansPage }
        },
      },
      {
        path: "plans/new",
        lazy: async () => {
          const { HostingPlanFormPage } = await import("./admin/HostingPlanFormPage")
          return { Component: HostingPlanFormPage }
        },
      },
      {
        path: "plans/:sku/edit",
        lazy: async () => {
          const { HostingPlanFormPage } = await import("./admin/HostingPlanFormPage")
          return { Component: HostingPlanFormPage }
        },
      },
      {
        path: "accounts",
        lazy: async () => {
          const { HostingAccountsPage } = await import("./admin/HostingAccountsPage")
          return { Component: HostingAccountsPage }
        },
      },
      {
        path: "accounts/:id",
        lazy: async () => {
          const { HostingAccountDetailPage } = await import("./admin/HostingAccountDetailPage")
          return { Component: HostingAccountDetailPage }
        },
      },
      {
        path: "queue",
        lazy: async () => {
          const { HostingQueuePage } = await import("./admin/HostingQueuePage")
          return { Component: HostingQueuePage }
        },
      },
    ],
  },
]
