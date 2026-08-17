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

// There is no admin route here any more. The operator's cross-tenant listing moved
// to the serverless console, beside the service that owns the rows — see
// apps/serverless-web/src/features/domains. What is left is the tenant's own page,
// which cloud-be-go now serves by proxying the registry.
