import { Navigate, type RouteObject } from "react-router-dom"

export const governanceRoutes: RouteObject[] = [
  {
    // Manage Account has no standalone overview, so direct hits fall through
    // to the first section.
    path: "manage-account",
    element: <Navigate to="/manage-account/account" replace />,
  },
  {
    path: "manage-account/naming-conventions",
    lazy: async () => {
      const { NamingConventionsPage } = await import("./partials/NamingConventionsPage")
      return { Component: NamingConventionsPage }
    },
  },
  {
    path: "manage-account/quotas",
    lazy: async () => {
      const { QuotasPage } = await import("./partials/QuotasPage")
      return { Component: QuotasPage }
    },
  },
  {
    path: "manage-account/tax-settings",
    lazy: async () => {
      const { TaxSettingsPage } = await import("./partials/TaxSettingsPage")
      return { Component: TaxSettingsPage }
    },
  },
  {
    path: "manage-account/tax-settings/new",
    lazy: async () => {
      const { TaxRegistrationFormPage } = await import("./partials/TaxRegistrationFormPage")
      return { Component: TaxRegistrationFormPage }
    },
  },
  {
    path: "manage-account/tax-settings/:id/edit",
    lazy: async () => {
      const { TaxRegistrationFormPage } = await import("./partials/TaxRegistrationFormPage")
      return { Component: TaxRegistrationFormPage }
    },
  },
  {
    path: "governance",
    element: <Navigate to="/manage-account/account" replace />,
  },
  {
    path: "governance/naming-conventions",
    element: <Navigate to="/manage-account/naming-conventions" replace />,
  },
  {
    path: "governance/quotas",
    element: <Navigate to="/manage-account/quotas" replace />,
  },
  {
    path: "governance/tax-settings/*",
    element: <Navigate to="/manage-account/tax-settings" replace />,
  },
]
