import type { LucideIcon } from "lucide-react"

export type ServiceStatus = "operational" | "degraded" | "maintenance" | "outage"
export type ServiceCategory =
    | "compute"
    | "network"
    | "security"
    | "storage"
    | "management"
    | "billing"

export interface ServiceMaintenance {
    id: string
    title: string
    message: string
    startTime: string
    endTime: string
    impact: "none" | "partial" | "full"
}

export interface SubServiceDefinition {
    id: string
    name: string
    path: string
    icon: LucideIcon
    description: string
    status: ServiceStatus
    maintenance?: ServiceMaintenance
}

export interface ServiceDefinition {
    id: string
    name: string
    path: string
    icon: LucideIcon
    description: string
    category: ServiceCategory
    status: ServiceStatus
    maintenance?: ServiceMaintenance
    subServices: SubServiceDefinition[]
    tags?: string[]
}

export interface ServicesHealth {
    services: Record<
        string,
        {
            status: ServiceStatus
            maintenance?: ServiceMaintenance
            subServices?: Record<
                string,
                { status: ServiceStatus; maintenance?: ServiceMaintenance }
            >
        }
    >
    updatedAt: string
}
