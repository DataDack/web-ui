import type { RouteObject } from "react-router-dom"

export const organizationsRoutes: RouteObject[] = [
  {
    path: "governance/account",
    lazy: async () => {
      const { AccountSettingsPage } = await import("./partials/AccountSettingsPage")
      return { Component: AccountSettingsPage }
    },
  },
  {
    path: "governance/profile",
    lazy: async () => {
      const { ProfileSettingsPage } = await import("./partials/ProfileSettingsPage")
      return { Component: ProfileSettingsPage }
    },
  },
]
