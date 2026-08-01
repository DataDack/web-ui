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
]
