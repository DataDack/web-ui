import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { CreateNetworkInterfaceRequest, NetworkInterface } from "../vpc.types"

const NETWORK_INTERFACES_BASE = "/vpc/networkinterfaces"

// The backend returns ids as numbers or strings (`id`, `user_id`) and uses
// `vpc_id` for the parent network. The FE treats every id as a string and keys
// off `network_id`, so normalize ids to strings and rename vpc_id as the entity
// crosses the API boundary. A detached interface arrives with `instance_id: null`,
// which the FE flattens to "" so link/lookup code can use string equality.
interface RawNetworkInterface {
    id: number | string
    tenant_serial: number
    created_at: string
    updated_at: string
    name: string
    description: string
    vpc_id: string
    subnet_id: string
    region: string
    availability_zone_id: string
    private_ip: string
    mac_address: string
    // Backend may omit the SG list entirely; default to [] when absent.
    security_group_ids?: string[]
    instance_id: string | null
    status: string
    interface_type: string
    tags: string
    user_id: number | string
}

function toNetworkInterface(raw: RawNetworkInterface): NetworkInterface {
    return {
        id: String(raw.id),
        tenant_serial: raw.tenant_serial,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        name: raw.name,
        description: raw.description,
        network_id: raw.vpc_id,
        subnet_id: raw.subnet_id,
        region: raw.region,
        availability_zone_id: raw.availability_zone_id || undefined,
        private_ip: raw.private_ip,
        mac_address: raw.mac_address,
        security_group_ids: raw.security_group_ids ?? [],
        instance_id: raw.instance_id ?? "",
        status: raw.status as NetworkInterface["status"],
        user_id: String(raw.user_id),
    }
}

export const networkInterfacesApi = {
    list: async (): Promise<NetworkInterface[]> => {
        const rows = await apiGet<RawNetworkInterface[]>(NETWORK_INTERFACES_BASE + LIST_QUERY)
        return rows.map(toNetworkInterface)
    },

    get: async (id: string): Promise<NetworkInterface> =>
        toNetworkInterface(await apiGet<RawNetworkInterface>(`${NETWORK_INTERFACES_BASE}/${id}`)),

    create: async (payload: CreateNetworkInterfaceRequest): Promise<NetworkInterface> => {
        // Omit empty optional fields so the backend applies its defaults
        // (auto-assigned private IP, no security groups) rather than receiving "".
        const body: Record<string, unknown> = {
            name: payload.name,
            subnet_id: payload.subnet_id,
        }
        if (payload.description) body.description = payload.description
        if (payload.private_ip) body.private_ip = payload.private_ip
        if (payload.security_group_ids && payload.security_group_ids.length > 0) {
            body.security_group_ids = payload.security_group_ids
        }
        return toNetworkInterface(await apiPost<RawNetworkInterface>(NETWORK_INTERFACES_BASE, body))
    },

    delete: (id: string): Promise<void> => apiDelete(`${NETWORK_INTERFACES_BASE}/${id}`),

    attach: async (id: string, instanceId: string): Promise<NetworkInterface> => {
        const raw = await apiPost<RawNetworkInterface>(
            `${NETWORK_INTERFACES_BASE}/${id}/attach`,
            { instance_id: instanceId }
        )
        return toNetworkInterface(raw)
    },

    detach: async (id: string): Promise<NetworkInterface> => {
        const raw = await apiPost<RawNetworkInterface>(`${NETWORK_INTERFACES_BASE}/${id}/detach`)
        return toNetworkInterface(raw)
    },
}
