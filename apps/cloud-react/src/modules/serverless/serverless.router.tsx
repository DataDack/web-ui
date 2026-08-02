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
    path: "serverless/functions/:name",
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
