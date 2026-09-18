import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
  CreateInternetGatewayRequest,
  CreateNATGatewayRequest,
  CreateRouterRequest,
  InternetGateway,
  InternetGatewayStatus,
  NATGateway,
  NATGatewayStatus,
  UpdateNATGatewayRequest,
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
    const body: Record<string, unknown> = {
      name: payload.name,
      region: payload.region,
      enable_snat: payload.enable_snat,
    }
    if (payload.network_id) body.vpc_id = payload.network_id
    const raw = await apiPost<RawRouter>(ROUTERS_BASE, body)
    return toRouter(raw)
  },

  update: async (id: string, enable_snat: boolean): Promise<Router> =>
    toRouter(await apiPut<RawRouter>(`${ROUTERS_BASE}/${id}`, { enable_snat })),
  delete: (id: string): Promise<void> => apiDelete(`${ROUTERS_BASE}/${id}?force=true`),
}

/* ── NAT gateways ──────────────────────────────────────────────────────── */

interface RawNATGateway {
  id: string
  created_at: string
  updated_at: string
  name: string
  subnet_id: string
  /** Denormalized from the gateway's subnet; omitted on rows created before it existed. */
  vpc_id?: string | null
  static_ip_id: string
  connectivity: string
  status: string
  /** Absent on rows written before the column existed; those were translating,
   *  so absence reads as enabled. */
  enabled?: boolean
  status_reason?: string
  user_id: string
}

// Backend NAT gateways expose no public IP, so that FE-only field maps to an
// empty string; the EIP itself is resolvable from `static_ip_id` via the static
// IPs list. `vpc_id` is denormalized from the gateway's subnet at creation, so
// gateways predating that column still have no network and fall back to "",
// which renders as the per-network empty state.
function toNATGateway(raw: RawNATGateway): NATGateway {
  return {
    id: raw.id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    name: raw.name,
    network_id: raw.vpc_id && raw.vpc_id !== ZERO_UUID ? raw.vpc_id : "",
    subnet_id: raw.subnet_id,
    public_ip: "",
    static_ip_id: raw.static_ip_id && raw.static_ip_id !== ZERO_UUID ? raw.static_ip_id : undefined,
    connectivity: (raw.connectivity || "public") as NATGateway["connectivity"],
    status: raw.status as NATGatewayStatus,
    enabled: raw.enabled ?? true,
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

  /** Rename, or turn outbound translation on/off without deleting the gateway.
   *  `enabled` is sent only when the caller passes it, so a rename cannot be
   *  read as a request to disable. */
  update: async (id: string, payload: UpdateNATGatewayRequest): Promise<NATGateway> => {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name
    if (payload.enabled !== undefined) body.enabled = payload.enabled
    const raw = await apiPut<RawNATGateway>(`${NAT_BASE}/${id}`, body)
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
