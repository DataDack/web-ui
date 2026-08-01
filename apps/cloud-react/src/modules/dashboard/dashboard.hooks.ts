import { useQuery } from "@tanstack/react-query"

import { DASHBOARD_QUERY_KEYS } from "./dashboard.constants"
import { dashboardService } from "./dashboard.service"

/** Service health from the cloud-be-go console endpoint (GET /actuator/services).
 * Fetched once on mount — no polling. */
export function useServiceHealth() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.serviceHealth,
    queryFn: dashboardService.fetchServiceHealth,
    staleTime: 60_000,
  })
}
