import { Navigate, type RouteObject } from "react-router-dom"

export const governanceRoutes: RouteObject[] = [
  {
    // Governance landing — there is no standalone overview yet, so direct
    // hits on /governance fall through to the first section.
    path: "governance",
    element: <Navigate to="/governance/account" replace />,
  },
  {
    path: "governance/naming-conventions",
    lazy: async () => {
      const { NamingConventionsPage } = await import("./partials/NamingConventionsPage")
      return { Component: NamingConventionsPage }
    },
  },
  {
    path: "governance/quotas",
    lazy: async () => {
      const { QuotasPage } = await import("./partials/QuotasPage")
      return { Component: QuotasPage }
    },
  },
  {
    path: "governance/tax-settings",
    lazy: async () => {
      const { TaxSettingsPage } = await import("./partials/TaxSettingsPage")
      return { Component: TaxSettingsPage }
    },
  },
  {
    path: "governance/tax-settings/new",
    lazy: async () => {
      const { TaxRegistrationFormPage } = await import("./partials/TaxRegistrationFormPage")
      return { Component: TaxRegistrationFormPage }
    },
  },
  {
    path: "governance/tax-settings/:id/edit",
    lazy: async () => {
      const { TaxRegistrationFormPage } = await import("./partials/TaxRegistrationFormPage")
      return { Component: TaxRegistrationFormPage }
    },
  },
]
