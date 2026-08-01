import { apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type {
    InternetGateway,
    InternetGatewayStatus,
    NATGateway,
    NATGatewayStatus,
    Router,
    VPNConnection,
    VPNConnectionStatus,
} from "../vpc.types"

const ROUTERS_BASE = "/vpc/routers"
const NAT_BASE = "/vpc/natgateway"
const IGW_BASE = "/vpc/internetgateway"
const VPN_BASE = "/vpc/vpn"

/* ── Routers ───────────────────────────────────────────────────────────── */

interface RawRouter extends Omit<Router, "network_id" | "status"> {
    vpc_id: string
    status: string
}

function toRouter(raw: RawRouter): Router {
    const { vpc_id: networkId, status, ...rest } = raw
    return { ...rest, network_id: networkId, status: status as Router["status"] }
}

export const routersApi = {
    list: async (): Promise<Router[]> => {
        const rows = await apiGet<RawRouter[]>(ROUTERS_BASE + LIST_QUERY)
        return rows.map(toRouter)
    },
}

/* ── NAT gateways ──────────────────────────────────────────────────────── */

interface RawNATGateway {
    id: string
    created_at: string
    updated_at: string
    name: string
    subnet_id: string
    status: string
    user_id: string
}

// Backend NAT gateways carry no VPC linkage or public IP, so they cannot be
// attributed to a network in the detail view. Map those FE-only fields to
// empty strings; the per-network NAT section then renders its empty state.
function toNATGateway(raw: RawNATGateway): NATGateway {
    return {
        id: raw.id,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        name: raw.name,
        network_id: "",
        subnet_id: raw.subnet_id,
        public_ip: "",
        status: raw.status as NATGatewayStatus,
        user_id: raw.user_id,
    }
}

export const natGatewaysApi = {
    list: async (): Promise<NATGateway[]> => {
        const rows = await apiGet<RawNATGateway[]>(NAT_BASE + LIST_QUERY)
        return rows.map(toNATGateway)
    },
}

/* ── Internet gateways ─────────────────────────────────────────────────── */

interface RawInternetGateway {
    id: string
    created_at: string
    updated_at: string
    name: string
    region: string
    vpc_id: string | null
    status: string
    user_id: string
}

function toInternetGateway(raw: RawInternetGateway): InternetGateway {
    return {
        id: raw.id,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        name: raw.name,
        network_id: raw.vpc_id ?? "",
        status: raw.status as InternetGatewayStatus,
        user_id: raw.user_id,
    }
}

export const internetGatewaysApi = {
    list: async (): Promise<InternetGateway[]> => {
        const rows = await apiGet<RawInternetGateway[]>(IGW_BASE + LIST_QUERY)
        return rows.map(toInternetGateway)
    },

    attach: async (id: string, networkId: string): Promise<InternetGateway> => {
        const raw = await apiPost<RawInternetGateway>(`${IGW_BASE}/${id}/attach`, {
            vpc_id: networkId,
        })
        return toInternetGateway(raw)
    },

    detach: async (id: string): Promise<InternetGateway> => {
        const raw = await apiPost<RawInternetGateway>(`${IGW_BASE}/${id}/detach`)
        return toInternetGateway(raw)
    },
}

/* ── VPN connections ───────────────────────────────────────────────────── */

interface RawVPNConnection {
    id: string
    created_at: string
    updated_at: string
    name: string
    vpn_gateway_id: string
    customer_gateway_id: string
    status: string
    user_id: string
}

// The VPN detail tab ties connections to a network via routers, but backend
// VPN connections expose no router/network linkage (only gateway IDs) and no
// remote-gateway IP. Without that join we list the raw connections; the tab's
// per-network filter then yields nothing and shows its empty state.
function toVPNConnection(raw: RawVPNConnection): VPNConnection {
    return {
        id: raw.id,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        name: raw.name,
        router_id: "",
        remote_gateway: "",
        status: raw.status as VPNConnectionStatus,
        user_id: raw.user_id,
    }
}

export const vpnApi = {
    list: async (): Promise<VPNConnection[]> => {
        const rows = await apiGet<RawVPNConnection[]>(VPN_BASE + LIST_QUERY)
        return rows.map(toVPNConnection)
    },
}
