// Mocked VPC backend, split per entity. This module re-exports the per-entity
// APIs so consumers (vpc.service.ts) have a single import point.
export { networksApi, subnetsApi } from "./api/networks.api"
export { securityGroupsApi } from "./api/security-groups.api"
export { staticIpsApi } from "./api/static-ips.api"
export { networkInterfacesApi } from "./api/network-interfaces.api"
export { internetGatewaysApi, natGatewaysApi, routersApi, vpnApi } from "./api/gateways.api"
