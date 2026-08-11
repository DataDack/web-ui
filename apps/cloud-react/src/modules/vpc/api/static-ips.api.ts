import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { ReserveStaticIPRequest, StaticIP, StaticIPAttachmentType } from "../vpc.types"

const STATIC_IPS_BASE = "/vpc/staticips"

const ATTACHMENT_TYPES: readonly StaticIPAttachmentType[] = [
  "instance",
  "load_balancer",
  "nat_gateway",
  "vpc_gateway",
  "managed_app",
]

/** Backend StaticIP entity (vpc_static_ips) plus its resolved attachment. */
interface RawStaticIP {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  ip_address: string | null // null while provisioning (not yet allocated)
  region: string
  status: string // provisioning | available | associated | releasing
  association_type: string // instance | load_balancer | nat_gateway | vpc_gateway | managed_app
  association_id: string | null
  /** Display name of the holder, resolved server-side; absent when unattached. */
  attachment_name?: string
  /** The holder row is soft-deleted and still holds the address. */
  attachment_deleted?: boolean
  user_id: string
}

// The UI keys off the legacy reserved/assigned vocabulary; map the richer
// backend lifecycle onto it. A freshly reserved IP stays in `provisioning`
// until the address is allocated, then settles into `reserved` (available) or
// `assigned`.
//
// The attachment is carried WHOLE. This mapper used to keep instance
// associations only, which left every address held by a load balancer, a NAT
// gateway, a VPC gateway or a managed app looking attached to nothing — status
// "assigned" against an empty owner column, which reads as a platform bug
// rather than an address doing its job.
function toStaticIP(raw: RawStaticIP): StaticIP {
  let status: StaticIP["status"]
  if (raw.status === "associated") status = "assigned"
  else if (raw.status === "provisioning") status = "provisioning"
  else status = "reserved"
  const attachmentType = (
    ATTACHMENT_TYPES.includes(raw.association_type as StaticIPAttachmentType)
      ? raw.association_type
      : ""
  ) as StaticIPAttachmentType
  const attachmentId = attachmentType && raw.association_id ? raw.association_id : ""
  return {
    id: raw.id,
    tenant_serial: raw.tenant_serial,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    name: raw.name,
    ip_address: raw.ip_address ?? "",
    region: raw.region,
    status,
    instance_id: attachmentType === "instance" ? attachmentId : "",
    attachment: {
      type: attachmentId ? attachmentType : "",
      id: attachmentId,
      name: attachmentId ? (raw.attachment_name ?? "") : "",
      deleted: Boolean(attachmentId && raw.attachment_deleted),
    },
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
