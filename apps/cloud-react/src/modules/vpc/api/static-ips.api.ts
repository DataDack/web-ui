import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { ReserveStaticIPRequest, StaticIP } from "../vpc.types"

const STATIC_IPS_BASE = "/vpc/staticips"

/** Backend StaticIP entity (vpc_static_ips). */
interface RawStaticIP {
    id: string
    tenant_serial: number
    created_at: string
    updated_at: string
    name: string
    ip_address: string | null // null while provisioning (not yet allocated)
    region: string
    status: string // provisioning | available | associated | releasing
    association_type: string // instance | nat_gateway | load_balancer
    association_id: string | null
    user_id: string
}

// The UI keys off the legacy reserved/assigned vocabulary; map the richer
// backend lifecycle onto it and surface only instance associations.
// A freshly reserved IP stays in `provisioning` until the address is
// allocated, then settles into `reserved` (available) or `assigned`.
function toStaticIP(raw: RawStaticIP): StaticIP {
    let status: StaticIP["status"]
    if (raw.status === "associated") status = "assigned"
    else if (raw.status === "provisioning") status = "provisioning"
    else status = "reserved"
    const instanceId =
        raw.association_type === "instance" && raw.association_id ? raw.association_id : ""
    return {
        id: raw.id,
        tenant_serial: raw.tenant_serial,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        name: raw.name,
        ip_address: raw.ip_address ?? "",
        region: raw.region,
        status,
        instance_id: instanceId,
        user_id: raw.user_id,
    }
}

export const staticIpsApi = {
    list: async (): Promise<StaticIP[]> => {
        const rows = await apiGet<RawStaticIP[]>(STATIC_IPS_BASE + LIST_QUERY)
        return rows.map(toStaticIP)
    },

    reserve: async (payload: ReserveStaticIPRequest): Promise<StaticIP> => {
        const raw = await apiPost<RawStaticIP>(STATIC_IPS_BASE, {
            name: payload.name,
            region: payload.region,
        })
        return toStaticIP(raw)
    },

    assign: async (id: string, instanceId: string): Promise<StaticIP> => {
        const raw = await apiPost<RawStaticIP>(`${STATIC_IPS_BASE}/${id}/assign`, {
            instance_id: instanceId,
        })
        return toStaticIP(raw)
    },

    unassign: async (id: string): Promise<StaticIP> => {
        const raw = await apiPost<RawStaticIP>(`${STATIC_IPS_BASE}/${id}/unassign`)
        return toStaticIP(raw)
    },

    release: (id: string): Promise<void> => apiDelete(`${STATIC_IPS_BASE}/${id}`),
}
