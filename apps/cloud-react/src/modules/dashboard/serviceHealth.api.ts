import axios from "axios"

import type { HealthStatus, ServiceHealthItem } from "./dashboard.types"

// Single source of truth: the cloud-be-go console Service-health endpoint
// (GET /actuator/services) returns the rows AND statuses to render directly —
// the console no longer hardcodes the service map or the coming-soon flag.
// Mounted at the API root (not under /api/v1), so it bypasses the versioned
// axios client. Public — no Authorization header required.

interface BackendServiceRow {
    id: string
    name: string
    status: string // "operational" | "degraded" | "coming_soon"
}

interface ServicesEnvelope {
    data: { items: BackendServiceRow[] }
    meta: { success: boolean; message: string; statusCode: number }
}

export interface ServiceHealthSnapshot {
    items: ServiceHealthItem[]
    fetchedAt: number
}

export const serviceHealthApi = {
    get: async (): Promise<ServiceHealthSnapshot> => {
        const res = await axios.get<ServicesEnvelope>("/actuator/services")
        const items: ServiceHealthItem[] = (res.data.data.items ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            status: r.status as HealthStatus,
        }))
        return { items, fetchedAt: Date.now() }
    },
}
