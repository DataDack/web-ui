import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { CreateSubnetRequest, CreateVPCRequest, Subnet, VPCNetwork } from "../vpc.types"

const NETWORKS_BASE = "/vpc/networks"
const SUBNETS_BASE = "/vpc/subnets"

/** Go serializes an unset `uuid.UUID` as the all-zero uuid, not null/omitted. */
const ZERO_UUID = "00000000-0000-0000-0000-000000000000"

// The backend returns ids as numbers (`id`, `user_id`, `vpc_id`), but the FE
// treats every id as a string — zod schemas (`z.string()`), Radix Select item
// values (which must be strings), and `===` id lookups all assume strings.
// Normalize ids to strings as they cross the API boundary.
interface RawVPCNetwork extends Omit<VPCNetwork, "id" | "user_id"> {
  id: number | string
  user_id: number | string
}

function toNetwork(raw: RawVPCNetwork): VPCNetwork {
  return { ...raw, id: String(raw.id), user_id: String(raw.user_id) }
}

/**
 * Combined create response: the new VPC plus any subnets carved alongside it in
 * the same request. Mirrors the backend `CreatedNetwork`.
 */
interface RawCreatedNetwork {
  network: RawVPCNetwork
  subnets?: RawSubnet[] | null
}

/** Backend subnet entity uses numeric ids and `vpc_id`; normalize to FE shape. */
interface RawSubnet extends Omit<Subnet, "id" | "network_id" | "user_id"> {
  id: number | string
  vpc_id: number | string
  user_id: number | string
}

function toSubnet(raw: RawSubnet): Subnet {
  const { vpc_id: networkId, ...rest } = raw
  const azId = rest.availability_zone_id
  return {
    ...rest,
    id: String(rest.id),
    network_id: String(networkId),
    user_id: String(rest.user_id),
    availability_zone_id: azId && azId !== ZERO_UUID ? azId : undefined,
  }
}

export const networksApi = {
  list: async (): Promise<VPCNetwork[]> => {
    const rows = await apiGet<RawVPCNetwork[]>(NETWORKS_BASE + LIST_QUERY)
    return rows.map(toNetwork)
  },

  get: async (id: string): Promise<VPCNetwork> =>
    toNetwork(await apiGet<RawVPCNetwork>(`${NETWORKS_BASE}/${id}`)),

  // Backend CreateNetworkRequest accepts name/cidr/region/resource_group_id
  // plus an optional `subnets` array (tags ignored). The VPC and its subnets
  // are created in a SINGLE request; the response carries both back.
  create: async (payload: CreateVPCRequest): Promise<VPCNetwork> => {
    const res = await apiPost<RawCreatedNetwork>(NETWORKS_BASE, {
      name: payload.name,
      cidr: payload.cidr,
      region: payload.region,
      resource_group_id: payload.resource_group_id,
      subnets: (payload.subnets ?? []).map((s) => ({
        name: s.name,
        cidr: s.cidr,
        availability_zone_id: s.zone,
        is_public: s.is_public,
      })),
    })
    return toNetwork(res.network)
  },

  delete: (id: string): Promise<void> => apiDelete(`${NETWORKS_BASE}/${id}`),
}

export const subnetsApi = {
  listAll: async (): Promise<Subnet[]> => {
    const rows = await apiGet<RawSubnet[]>(SUBNETS_BASE + LIST_QUERY)
    return rows.map(toSubnet)
  },

  list: async (networkId: string): Promise<Subnet[]> => {
    const rows = await apiGet<RawSubnet[]>(SUBNETS_BASE + LIST_QUERY)
    return rows.map(toSubnet).filter((s) => s.network_id === networkId)
  },

  create: async (payload: CreateSubnetRequest): Promise<Subnet> => {
    const raw = await apiPost<RawSubnet>(SUBNETS_BASE, {
      name: payload.name,
      cidr: payload.cidr,
      region: payload.region,
      availability_zone_id: payload.zone,
      vpc_id: payload.network_id,
      is_public: payload.is_public,
    })
    return toSubnet(raw)
  },

  delete: (id: string): Promise<void> => apiDelete(`${SUBNETS_BASE}/${id}`),
}
