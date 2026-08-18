import type { RouteObject } from "react-router-dom"

export const serverlessRoutes: RouteObject[] = [
  {
    // Landing: the functions list (the section's primary object).
    path: "serverless",
    lazy: async () => {
      const { ServerlessFunctionsPage } = await import("./partials/FunctionsPage")
      return { Component: ServerlessFunctionsPage }
    },
  },
  {
    // Full-bleed like every other create surface: the service sidebar is
    // navigation away from a focused task (see AppShell's hideSidebar).
    path: "serverless/create",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { CreateFunctionPage } = await import("./partials/CreateFunctionPage")
      return { Component: CreateFunctionPage }
    },
  },
  {
    // The detail page carries its own navigation rail — the function's tabs and
    // every configuration section in one list — so the console's service
    // sidebar would be a second, redundant column of links beside it. fullBleed
    // drops the shell's gutter too: the page is a workbench that runs to the
    // window edges, not a card floating on the background.
    path: "serverless/functions/:name",
    handle: { hideSidebar: true, fullBleed: true },
    lazy: async () => {
      const { ServerlessFunctionDetailPage } = await import("./partials/FunctionDetailPage")
      return { Component: ServerlessFunctionDetailPage }
    },
  },
  {
    path: "serverless/layers",
    lazy: async () => {
      const { ServerlessLayersPage } = await import("./partials/LayersPage")
      return { Component: ServerlessLayersPage }
    },
  },
  {
    path: "serverless/layers/publish",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { PublishLayerPage } = await import("./partials/PublishLayerPage")
      return { Component: PublishLayerPage }
    },
  },
]
