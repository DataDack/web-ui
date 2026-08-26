export type HealthStatus =
  | "operational"
  | "elevated"
  | "degraded"
  | "outage"
  | "inactive"
  | "maintenance"
  | "coming_soon"

export interface ServiceHealthItem {
  id: string
  name: string
  status: HealthStatus
  // Optional: the live health aggregator reports binary status only, no uptime.
  uptime?: string
}
