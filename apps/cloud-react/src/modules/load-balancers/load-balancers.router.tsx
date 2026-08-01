import type { RouteObject } from "react-router-dom"

export const loadBalancersRoutes: RouteObject[] = [
  {
    path: "compute/load-balancers",
    lazy: async () => {
      const { LoadBalancersListPage } = await import("./partials/LoadBalancersListPage")
      return { Component: LoadBalancersListPage }
    },
  },
  {
    // Registered BEFORE :id so "create" is not swallowed by the id param.
    path: "compute/load-balancers/create",
    // Full-bleed wizard: hide the service sidebar and center the content.
    handle: { hideSidebar: true },
    lazy: async () => {
      const { LoadBalancerCreateWizardPage } = await import("./partials/LoadBalancerCreateWizard")
      return { Component: LoadBalancerCreateWizardPage }
    },
  },
  {
    path: "compute/load-balancers/:id",
    lazy: async () => {
      const { LoadBalancerDetailPage } = await import("./partials/LoadBalancerDetailPage")
      return { Component: LoadBalancerDetailPage }
    },
  },
]
