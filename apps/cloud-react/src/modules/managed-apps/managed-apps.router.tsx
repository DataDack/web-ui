import type { RouteObject } from "react-router-dom"

export const managedAppsRoutes: RouteObject[] = [
  {
    path: "managed-apps",
    // The landing page carries the service sidebar (Overview · Settings),
    // like every other service in the console. Only the focused task
    // surfaces below opt out of it.
    lazy: async () => {
      const { ManagedAppsOverviewPage } =
        await import("./partials/overview/ManagedAppsOverviewPage")
      return { Component: ManagedAppsOverviewPage }
    },
  },
  {
    // Connections and other account-scoped configuration. Plan selection is a
    // focused flow on /upgrade, rather than another settings/sidebar section.
    path: "managed-apps/settings",
    lazy: async () => {
      const { ManagedAppsSettingsPage } =
        await import("./partials/settings/ManagedAppsSettingsPage")
      return { Component: ManagedAppsSettingsPage }
    },
  },
  {
    path: "managed-apps/upgrade",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ManagedAppsUpgradePage } =
        await import("./partials/settings/ManagedAppsUpgradePage")
      return { Component: ManagedAppsUpgradePage }
    },
  },
  {
    // Registered BEFORE any :id sibling would matter; kept first for clarity.
    path: "managed-apps/create",
    // Full-bleed: creating a project is a focused task, and the service
    // sidebar is navigation away from it. Same opt-out every other create
    // surface in the console uses (see AppShell.tsx:66-71).
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ProjectComposerPage } = await import("./partials/create/ProjectComposer")
      return { Component: ProjectComposerPage }
    },
  },
  {
    // Where a freshly created project lands: the pull request that has to be
    // merged before anything can build. Its own route so it survives a
    // refresh and can be linked to from the project's state chip.
    path: "managed-apps/projects/:id/setup",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ProjectSetupPage } = await import("./partials/setup/ProjectSetupPage")
      return { Component: ProjectSetupPage }
    },
  },
  {
    path: "managed-apps/projects/:id",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { ProjectDetailPage } = await import("./partials/project/ProjectDetailPage")
      return { Component: ProjectDetailPage }
    },
  },
  {
    // One build as its own page — log, source and output tabs. Registered as a
    // sibling rather than a child route: the project page renders its own tab
    // chrome, and a build page nested inside it would inherit that shell.
    path: "managed-apps/projects/:id/builds/:buildId",
    handle: { hideSidebar: true, fullBleed: true },
    lazy: async () => {
      const { BuildDetailPage } = await import("./partials/project/BuildDetailPage")
      return { Component: BuildDetailPage }
    },
  },
  {
    // The GitHub App post-install redirect lands here
    // (?installation_id=&setup_action=&state=) — its own SPA route so GitHub
    // can send the browser back while the user stays authenticated.
    path: "managed-apps/github/callback",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { GitHubCallbackPage } = await import("./partials/github-callback/GitHubCallbackPage")
      return { Component: GitHubCallbackPage }
    },
  },
]
