import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type {
  CreateInternetGatewayRequest,
  CreateNATGatewayRequest,
  CreateRouterRequest,
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

/** Go serializes an unset `uuid.UUID` as the all-zero uuid, not null/omitted. */
const ZERO_UUID = "00000000-0000-0000-0000-000000000000"

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

  create: async (payload: CreateRouterRequest): Promise<Router> => {
    const body: Record<string, unknown> = { name: payload.name, region: payload.region }
    if (payload.network_id) body.vpc_id = payload.network_id
    const raw = await apiPost<RawRouter>(ROUTERS_BASE, body)
    return toRouter(raw)
  },

  delete: (id: string): Promise<void> => apiDelete(`${ROUTERS_BASE}/${id}`),
}

/* ── NAT gateways ──────────────────────────────────────────────────────── */

interface RawNATGateway {
  id: string
  created_at: string
  updated_at: string
  name: string
  subnet_id: string
  static_ip_id: string
  connectivity: string
  status: string
  user_id: string
}

// Backend NAT gateways carry no VPC linkage or public IP, so they cannot be
// attributed to a network in the detail view. Map those FE-only fields to
// empty strings; the per-network NAT section then renders its empty state.
// The EIP itself is resolvable from `static_ip_id` via the static IPs list.
function toNATGateway(raw: RawNATGateway): NATGateway {
  return {
    id: raw.id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    name: raw.name,
    network_id: "",
    subnet_id: raw.subnet_id,
    public_ip: "",
    static_ip_id: raw.static_ip_id && raw.static_ip_id !== ZERO_UUID ? raw.static_ip_id : undefined,
    connectivity: (raw.connectivity || "public") as NATGateway["connectivity"],
    status: raw.status as NATGatewayStatus,
    user_id: raw.user_id,
  }
}

export const natGatewaysApi = {
  list: async (): Promise<NATGateway[]> => {
    const rows = await apiGet<RawNATGateway[]>(NAT_BASE + LIST_QUERY)
    return rows.map(toNATGateway)
  },

  create: async (payload: CreateNATGatewayRequest): Promise<NATGateway> => {
    const body: Record<string, unknown> = { name: payload.name, subnet_id: payload.subnet_id }
    if (payload.static_ip_id) body.static_ip_id = payload.static_ip_id
    if (payload.connectivity) body.connectivity = payload.connectivity
    const raw = await apiPost<RawNATGateway>(NAT_BASE, body)
    return toNATGateway(raw)
  },

  delete: (id: string): Promise<void> => apiDelete(`${NAT_BASE}/${id}`),
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

  create: async (payload: CreateInternetGatewayRequest): Promise<InternetGateway> => {
    const raw = await apiPost<RawInternetGateway>(IGW_BASE, {
      name: payload.name,
      region: payload.region,
    })
    return toInternetGateway(raw)
  },

  delete: (id: string): Promise<void> => apiDelete(`${IGW_BASE}/${id}`),

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
  routing_type: string
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
    vpn_gateway_id: raw.vpn_gateway_id,
    customer_gateway_id: raw.customer_gateway_id,
    routing_type: (raw.routing_type || "static") as VPNConnection["routing_type"],
    status: raw.status as VPNConnectionStatus,
    user_id: raw.user_id,
  }
}

export const vpnApi = {
  list: async (): Promise<VPNConnection[]> => {
    const rows = await apiGet<RawVPNConnection[]>(VPN_BASE + LIST_QUERY)
    return rows.map(toVPNConnection)
  },

  delete: (id: string): Promise<void> => apiDelete(`${VPN_BASE}/${id}`),
}
