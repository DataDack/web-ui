import type { RouteObject } from "react-router-dom"

export const sshKeysRoutes: RouteObject[] = [
  {
    path: "compute/ssh-keys",
    lazy: async () => {
      const { SshKeysListPage } = await import("./partials/SshKeysListPage")
      return { Component: SshKeysListPage }
    },
  },
  {
    path: "compute/ssh-keys/create",
    lazy: async () => {
      const { SshKeyCreateWizardPage } = await import("./partials/SshKeyCreateWizardPage")
      return { Component: SshKeyCreateWizardPage }
    },
  },
]
