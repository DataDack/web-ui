// Shapes mirror cloud-be-go: apps/vpc (entities + request DTOs).
// Field names are normalized in the api/* layer so partials keep using the
// stable FE names below (e.g. `network_id`) while the backend uses `vpc_id`.
// Statuses are kept as widened strings because the backend uses a richer
// lifecycle vocabulary (pending | available | deleting | deleted | ...).

export type VPCNetworkStatus = "pending" | "available" | "active" | "deleting" | "deleted" | "error"

export interface VPCNetwork {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  cidr: string
  region: string
  status: VPCNetworkStatus
  is_default: boolean
  /** Backend-only flag; not surfaced in the UI. */
  enable_dns?: boolean
  user_id: string
  tags: string
}

export interface Subnet {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  cidr: string
  /**
   * Availability zone the subnet lives in, as a uuid. The backend serializes
   * this as `availability_zone_id`; resolve it to a label via the region
   * catalog (`useAvailabilityZoneMap`). Undefined when unset (zero uuid).
   */
  availability_zone_id?: string
  /** Normalized from backend `vpc_id`. */
  network_id: string
  region?: string
  is_public: boolean
  /** Backend provisioning lifecycle: pending | provisioning | available | failed | … */
  status?: string
  /** Addresses still free in the subnet; backend-computed during provisioning. */
  available_ips?: number
  user_id: string
}

export type SecurityGroupStatus = "pending" | "syncing" | "available" | "error"

export interface SecurityGroup {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  description: string
  /** Normalized from backend `vpc_id`; empty string = account-wide (no VPC). */
  network_id: string
  /** Firewall provisioning lifecycle on the node. */
  status: SecurityGroupStatus
  /** Populated when status is "error". */
  provision_error: string
  tags: string
  user_id: string
  /** Hydrated on the detail endpoint only. */
  rules?: SGRule[]
}

export type SGDirection = "ingress" | "egress"
export type SGProtocol = "tcp" | "udp" | "icmp" | "all"
export type SGRuleAction = "allow" | "deny"
export type SGSourceType = "cidr" | "security_group"

export interface SGRule {
  id: string
  security_group_id: string
  direction: SGDirection
  protocol: SGProtocol
  /** Normalized from backend `port_from`/`port_to`, e.g. "443" or "1024-2048". */
  port_range: string
  source_type: SGSourceType
  /** Normalized from backend `source_cidr`. */
  source: string
  source_sg_id: string | null
  action: SGRuleAction
  description: string
}

export type StaticIPStatus =
  "provisioning" | "reserved" | "assigned" | "available" | "associated" | "releasing"

/**
 * What a static IP can be attached to. The association is POLYMORPHIC on the
 * backend (`vpc_static_ips.association_type`), so an address in use is not
 * necessarily on an instance — it can just as well hold a load balancer's or a
 * VPC gateway's public address. `""` means the address is attached to nothing.
 */
export type StaticIPAttachmentType =
  "" | "instance" | "load_balancer" | "nat_gateway" | "vpc_gateway" | "managed_app"

export interface StaticIPAttachment {
  type: StaticIPAttachmentType
  /** Normalized from backend `association_id`; empty string when unattached. */
  id: string
  /**
   * Display name of the holder, resolved by the API (`attachment_name`). Empty
   * when the owning row could not be read — render the id rather than nothing,
   * because an address IS attached either way.
   */
  name: string
  /** The holder was deleted and still has the address: a leaked attachment. */
  deleted: boolean
}

export interface StaticIP {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  ip_address: string
  region: string
  status: StaticIPStatus
  /**
   * Normalized from backend `association_id`, but ONLY for instance
   * associations — it stays empty for every other holder, which is what the
   * assign/unassign dialogs key off. To show what an address is attached to,
   * use `attachment`.
   */
  instance_id: string
  attachment: StaticIPAttachment
  user_id: string
}

export type NetworkInterfaceStatus = "available" | "in-use" | "pending" | "detaching" | "failed"

export interface NetworkInterface {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
  name: string
  description: string
  /** Normalized from backend `vpc_id`. */
  network_id: string
  subnet_id: string
  region: string
  /**
   * Availability zone the interface lives in, as a uuid mirrored from the
   * parent subnet. Resolve it to a label via the region catalog
   * (`useAvailabilityZoneMap`). Undefined when unset (zero uuid).
   */
  availability_zone_id?: string
  private_ip: string
  mac_address: string
  security_group_ids: string[]
  /** Normalized from backend `instance_id`; empty string when detached. */
  instance_id: string
  status: NetworkInterfaceStatus
  user_id: string
}

// The router is the realization record of a VyOS guest, not a static row, so
// its lifecycle has a state for each place provisioning can get stuck: no
// guest yet (pending), clone/config/start running (provisioning), guest up
// but no transport yet (booting), transport up and pushing config
// (configuring), fully up (available), reachable-but-drifted and being
// retried (degraded — NOT the same as failed), gave up (failed), or tearing
// down (deleting).
export type RouterStatus =
  | "pending"
  | "provisioning"
  | "booting"
  | "configuring"
  | "available"
  | "degraded"
  | "failed"
  | "deleting"

export interface Router {
  id: string
  created_at: string
  updated_at: string
  name: string
  /** Normalized from backend `vpc_id`. */
  network_id: string
  region: string
  status: RouterStatus
  /** The router's WAN address once assigned (dhcp or static); unset while pending/booting. */
  wan_ip?: string
  user_id: string
}

export type NATGatewayStatus =
  "pending" | "available" | "active" | "deleting" | "deleted" | "failed"

export type NATGatewayConnectivity = "public" | "private"

export interface NATGateway {
  id: string
  created_at: string
  updated_at: string
  name: string
  /** Backend has no VPC linkage on NAT gateways; always empty here. */
  network_id: string
  subnet_id: string
  /** Backend exposes no public IP field on NAT gateways. */
  public_ip: string
  /** Id of the StaticIP bound as this gateway's EIP; unset for private gateways or zero-uuid. */
  static_ip_id?: string
  connectivity: NATGatewayConnectivity
  status: NATGatewayStatus
  user_id: string
}

export type InternetGatewayStatus = "attached" | "detached" | "attaching" | "detaching"

export interface InternetGateway {
  id: string
  created_at: string
  updated_at: string
  name: string
  /** Normalized from backend `vpc_id`; empty string when detached. */
  network_id: string
  status: InternetGatewayStatus
  user_id: string
}

export type VPNConnectionStatus =
  "connected" | "pending" | "available" | "deleting" | "deleted" | "failed" | "error"

export type VPNRoutingType = "static" | "bgp"

export interface VPNConnection {
  id: string
  created_at: string
  updated_at: string
  name: string
  /** Backend VPN connections have no router/network linkage retrievable here; always "". */
  router_id: string
  /** Backend exposes no remote-gateway IP on the connection; always "". */
  remote_gateway: string
  /** The cloud-side VPN gateway this connection terminates on. */
  vpn_gateway_id: string
  /** The customer's on-prem gateway this connection peers with. */
  customer_gateway_id: string
  routing_type: VPNRoutingType
  status: VPNConnectionStatus
  user_id: string
}

/* ── Request DTOs ──────────────────────────────────────────────────────── */

/** One subnet carved together with its parent VPC in a single create request. */
export interface CreateVPCSubnet {
  name: string
  cidr: string
  /** Availability zone id; sent to the backend as `availability_zone_id`. */
  zone: string
  is_public: boolean
}

export interface CreateVPCRequest {
  name: string
  cidr: string
  region: string
  /** Resource group the VPC is created into (required). */
  resource_group_id: string
  /** FE-only; backend create DTO ignores tags. */
  tags: string
  /**
   * Subnets to create atomically alongside the VPC. The backend persists the
   * whole graph in one transaction and carves the subnets onto the VPC's VNet
   * once it is provisioned. Omit for a bare VPC.
   */
  subnets?: CreateVPCSubnet[]
}

export interface CreateSubnetRequest {
  name: string
  cidr: string
  zone: string
  network_id: string
  /** Backend requires a region on subnet creation. */
  region: string
  is_public: boolean
}

export interface CreateSecurityGroupRequest {
  name: string
  description: string
  /** Omit for an account-wide group (backend `vpc_id` is optional). */
  network_id?: string
}

export interface AddSGRuleRequest {
  direction: SGDirection
  protocol: SGProtocol
  port_range: string
  source: string
  action: SGRuleAction
  description?: string
}

/** PUT /securitygroups/:id/rules/:ruleId takes the same body as add. */
export type UpdateSGRuleRequest = AddSGRuleRequest

export interface ReserveStaticIPRequest {
  name: string
  region: string
}

export interface CreateNetworkInterfaceRequest {
  name: string
  description?: string
  subnet_id: string
  private_ip?: string
  security_group_ids?: string[]
}

export interface CreateRouterRequest {
  name: string
  region: string
  /** Attach the router to a VPC on creation; omit to leave it unattached. */
  network_id?: string
}

export interface CreateInternetGatewayRequest {
  name: string
  region: string
}

export interface CreateNATGatewayRequest {
  name: string
  subnet_id: string
  /** Static IP to bind as the gateway's EIP; omit to leave it unbound. */
  static_ip_id?: string
  /** Defaults to "public" server-side when omitted. */
  connectivity?: NATGatewayConnectivity
}
