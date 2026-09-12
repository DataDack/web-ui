import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { CreateVpcPeeringRequest, VpcPeering } from "../vpc.types"

const PEERINGS_BASE = "/vpc/peerings"

/**
 * A peering is symmetric in effect but not in shape: the backend records which
 * side requested it, because only the OTHER side may accept. The list view
 * needs both ids, so nothing is normalized away here.
 */
export const peeringsApi = {
  list: (): Promise<VpcPeering[]> => apiGet<VpcPeering[]>(PEERINGS_BASE + LIST_QUERY),

  get: (id: string): Promise<VpcPeering> => apiGet<VpcPeering>(`${PEERINGS_BASE}/${id}`),

  create: (payload: CreateVpcPeeringRequest): Promise<VpcPeering> =>
    apiPost<VpcPeering>(PEERINGS_BASE, {
      name: payload.name,
      requester_vpc_id: payload.requesterVpcId,
      accepter_vpc_id: payload.accepterVpcId,
    }),

  /** Activates the peering. Nothing reaches the network before this. */
  accept: (id: string): Promise<VpcPeering> =>
    apiPost<VpcPeering>(`${PEERINGS_BASE}/${id}/accept`, {}),

  reject: (id: string): Promise<VpcPeering> =>
    apiPost<VpcPeering>(`${PEERINGS_BASE}/${id}/reject`, {}),

  delete: (id: string): Promise<void> => apiDelete(`${PEERINGS_BASE}/${id}`),
}
