import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import {
    DASHBOARD_SERVICE_ORDER,
    SERVICE_REGISTRY,
    SERVICES_QUERY_KEYS,
} from "./services.constants"
import { servicesService } from "./services.service"
import type { ServiceDefinition, ServiceMaintenance } from "./services.types"

/* ── useServicesHealth ─────────────────────────────────────────────────── */

export function useServicesHealth() {
    return useQuery({
        queryKey: SERVICES_QUERY_KEYS.health,
        queryFn: servicesService.fetchHealth,
        refetchInterval: 30_000,
        staleTime: 20_000,
    })
}

/* ── useServices ─────────────────────────────────────────────────────────
 * Returns the registry merged with live health, in dashboard order.
 * ──────────────────────────────────────────────────────────────────────── */

export function useServices(): ServiceDefinition[] {
    const { data: health } = useServicesHealth()

    return useMemo(() => {
        return DASHBOARD_SERVICE_ORDER.map((id) => {
            const svc = SERVICE_REGISTRY[id]
            if (!health) return svc

            const liveStatus = health.services[id]
            return {
                ...svc,
                status: liveStatus.status,
                maintenance: liveStatus.maintenance ?? svc.maintenance,
                subServices: svc.subServices.map((sub) => ({
                    ...sub,
                    status: liveStatus.subServices?.[sub.id]?.status ?? sub.status,
                    maintenance: liveStatus.subServices?.[sub.id]?.maintenance ?? sub.maintenance,
                })),
            }
        })
    }, [health])
}

/* ── useServiceStatus ────────────────────────────────────────────────────
 * Per-page hook: tells a module page if IT is under maintenance.
 * ──────────────────────────────────────────────────────────────────────── */

export function useServiceStatus(serviceId: string): {
    isUnderMaintenance: boolean
    isDegraded: boolean
    maintenance: ServiceMaintenance | undefined
    affectedSubServices: string[]
} {
    const { data: health } = useServicesHealth()

    return useMemo(() => {
        const svc = SERVICE_REGISTRY[serviceId]
        const live = health?.services[serviceId]
        const status = live?.status ?? svc.status

        const affectedSubServices = svc.subServices
            .filter((sub) => {
                const liveStatus = live?.subServices?.[sub.id]?.status ?? sub.status
                return liveStatus === "maintenance" || liveStatus === "degraded"
            })
            .map((sub) => sub.name)

        return {
            isUnderMaintenance: status === "maintenance",
            isDegraded: status === "degraded",
            maintenance: live?.maintenance ?? svc.maintenance,
            affectedSubServices,
        }
    }, [health, serviceId])
}
