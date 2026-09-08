import type { RouteObject } from "react-router-dom"

export const domainsRoutes: RouteObject[] = [
  {
    path: "domains",
    lazy: async () => {
      const { RegisterDomainComingSoon } = await import("./partials/DomainComingSoon")
      return { Component: RegisterDomainComingSoon }
    },
  },
  {
    path: "domains/hostnames",
    lazy: async () => {
      const { DomainsListPage } = await import("./partials/DomainsListPage")
      return { Component: DomainsListPage }
    },
  },
  {
    path: "domains/certificates",
    lazy: async () => {
      const { CertificatesComingSoon } = await import("./partials/DomainComingSoon")
      return { Component: CertificatesComingSoon }
    },
  },
  {
    path: "domains/dns",
    lazy: async () => {
      const { DnsComingSoon } = await import("./partials/DomainComingSoon")
      return { Component: DnsComingSoon }
    },
  },
  {
    path: "domains/hosting",
    lazy: async () => {
      const { CPanelHostingPage } =
        await import("../managed-apps/partials/overview/ManagedAppsOverviewPage")
      return { Component: CPanelHostingPage }
    },
  },
]
