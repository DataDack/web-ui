import type { RouteObject } from "react-router-dom"

// Kubernetes is a "coming soon" placeholder for now — it has a sidebar entry and
// a route but no implementation yet.
export const kubernetesRoutes: RouteObject[] = [
  {
    path: "compute/kubernetes",
    lazy: async () => {
      const { KubernetesComingSoon } = await import("./partials/KubernetesComingSoon")
      return { Component: KubernetesComingSoon }
    },
  },
]
