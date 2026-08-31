import type { RouteObject } from "react-router-dom"

export const domainsRoutes: RouteObject[] = [
  // The REGISTRAR is /domains, because it is the page a tenant comes looking for
  // when they think "I want to use my own domain". The hostname registry — every
  // name the platform answers for, most of them minted automatically — is the
  // deeper, more operational view and sits one level in.
  {
    path: "domains",
    lazy: async () => {
      const { RegistrarPage } = await import("./partials/RegistrarPage")
      return { Component: RegistrarPage }
    },
  },
  {
    path: "domains/hostnames",
    lazy: async () => {
      const { DomainsListPage } = await import("./partials/DomainsListPage")
      return { Component: DomainsListPage }
    },
  },
]

// There is no admin route here. Both pages are tenant-scoped: every row on them
// belongs to the account reading it. The operator's cross-tenant listing lives in
// the serverless console (apps/serverless-web/src/features/domains).
