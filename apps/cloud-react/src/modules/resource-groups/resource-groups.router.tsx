import type { RouteObject } from "react-router-dom"

// Resource Groups is a platform-level, full-width page (breadcrumb "Platform /
// Resource Groups") — it is not part of any service, so it opts out of the
// service sidebar to avoid rendering an empty sidebar rail.
export const resourceGroupsRoutes: RouteObject[] = [
  {
    path: "resource-groups",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ResourceGroupsPage } = await import("./partials/ResourceGroupsPage")
      return { Component: ResourceGroupsPage }
    },
  },
  {
    path: "resource-groups/create",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ResourceGroupCreateWizardPage } =
        await import("./partials/ResourceGroupCreateWizardPage")
      return { Component: ResourceGroupCreateWizardPage }
    },
  },
  {
    path: "resource-groups/:id",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ResourceGroupDetailPage } = await import("./partials/ResourceGroupDetailPage")
      return { Component: ResourceGroupDetailPage }
    },
  },
]
