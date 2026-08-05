import type { SGDirection, SGProtocol, SGRuleAction } from "./vpc.types"

export const VPC_ROUTES = {
  ROOT: "/networking",
  CREATE: "/networking/create",
  DETAIL: "/networking/:id",
  SUBNETS: "/networking/subnets",
  STATIC_IPS: "/networking/static-ips",
  NETWORK_INTERFACES: "/networking/network-interfaces",
  SECURITY_GROUPS: "/networking/security-groups",
  SECURITY_GROUPS_CREATE: "/networking/security-groups/create",
  ROUTERS: "/networking/routers",
  INTERNET_GATEWAYS: "/networking/internet-gateways",
  NAT_GATEWAYS: "/networking/nat-gateways",
  VPN: "/networking/vpn",
  detail: (id: string) => `/networking/${id}`,
  securityGroup: (id: string) => `/networking/security-groups/${id}`,
} as const

export const VPC_QUERY_KEYS = {
  list: ["vpc", "networks", "list"] as const,
  detail: (id: string) => ["vpc", "networks", "detail", id] as const,
  subnets: (networkId: string) => ["vpc", "subnets", networkId] as const,
  securityGroups: (networkId: string) => ["vpc", "sgs", networkId] as const,
  securityGroupDetail: (id: string) => ["vpc", "sgs", "detail", id] as const,
  sgRules: (sgId: string) => ["vpc", "sg-rules", sgId] as const,
  instanceSecurityGroups: (instanceId: string) => ["vpc", "instance-sgs", instanceId] as const,
  staticIps: ["vpc", "static-ips"] as const,
  networkInterfaces: ["vpc", "network-interfaces"] as const,
  networkInterfaceDetail: (id: string) => ["vpc", "network-interfaces", "detail", id] as const,
  routers: ["vpc", "routers"] as const,
  nat: ["vpc", "nat"] as const,
  igw: ["vpc", "igw"] as const,
  vpn: ["vpc", "vpn"] as const,
}

// Gateway resources (routers, NAT/internet gateways, VPN connections) all
// realize onto real infrastructure asynchronously, so their list views poll
// while anything is mid-lifecycle — mirrors load-balancers' isLbTransitional.
const VPC_GATEWAY_TRANSITIONAL_STATUSES = new Set([
  "pending",
  "provisioning",
  "booting",
  "configuring",
  "attaching",
  "detaching",
  "deleting",
])

export function isVpcGatewayTransitional(status?: string | null): boolean {
  return !!status && VPC_GATEWAY_TRANSITIONAL_STATUSES.has(status)
}

export const SG_DIRECTIONS: SGDirection[] = ["ingress", "egress"]
export const SG_PROTOCOLS: SGProtocol[] = ["tcp", "udp", "icmp", "all"]
export const SG_RULE_ACTIONS: SGRuleAction[] = ["allow", "deny"]

/** ^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$ — e.g. 10.0.0.0/16 */
export const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
