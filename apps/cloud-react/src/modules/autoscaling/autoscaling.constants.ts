import type { ScalingPolicy } from "./autoscaling.types"

export const ASG_ROUTES = {
  ROOT: "/compute/autoscaling",
  DETAIL: "/compute/autoscaling/:id",
  detail: (id: string) => `/compute/autoscaling/${id}`,
} as const

export const ASG_QUERY_KEYS = {
  list: ["autoscaling", "list"] as const,
  detail: (id: string) => ["autoscaling", "detail", id] as const,
}

export const SCALING_POLICIES: ScalingPolicy[] = ["cpu-based", "schedule-based", "manual"]
