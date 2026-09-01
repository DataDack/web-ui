import { Navigate, type RouteObject } from "react-router-dom"

export const organizationsRoutes: RouteObject[] = [
  {
    path: "manage-account/account",
    lazy: async () => {
      const { AccountSettingsPage } = await import("./partials/AccountSettingsPage")
      return { Component: AccountSettingsPage }
    },
  },
  {
    path: "manage-account/profile",
    lazy: async () => {
      const { ProfileSettingsPage } = await import("./partials/ProfileSettingsPage")
      return { Component: ProfileSettingsPage }
    },
  },
  {
    path: "governance/account",
    element: <Navigate to="/manage-account/account" replace />,
  },
  {
    path: "governance/profile",
    element: <Navigate to="/manage-account/profile" replace />,
  },
]
