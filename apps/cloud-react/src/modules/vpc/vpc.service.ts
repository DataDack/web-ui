import {
  internetGatewaysApi,
  natGatewaysApi,
  networkInterfacesApi,
  networksApi,
  routersApi,
  securityGroupsApi,
  staticIpsApi,
  subnetsApi,
  vpnApi,
} from "./vpc.api"
import type {
  AddSGRuleRequest,
  CreateNetworkInterfaceRequest,
  CreateSecurityGroupRequest,
  CreateSubnetRequest,
  CreateVPCRequest,
  ReserveStaticIPRequest,
  UpdateSGRuleRequest,
} from "./vpc.types"

export const vpcService = {
  // Networks
  fetchAll: () => networksApi.list(),
  fetchById: (id: string) => networksApi.get(id),
  create: (payload: CreateVPCRequest) => networksApi.create(payload),
  remove: (id: string) => networksApi.delete(id),

  // Subnets
  fetchAllSubnets: () => subnetsApi.listAll(),
  fetchSubnets: (networkId: string) => subnetsApi.list(networkId),
  createSubnet: (payload: CreateSubnetRequest) => subnetsApi.create(payload),
  removeSubnet: (id: string) => subnetsApi.delete(id),

  // Security groups
  fetchAllSecurityGroups: () => securityGroupsApi.listAll(),
  fetchSecurityGroups: (networkId: string) => securityGroupsApi.list(networkId),
  fetchSecurityGroup: (id: string) => securityGroupsApi.get(id),
  createSecurityGroup: (payload: CreateSecurityGroupRequest) => securityGroupsApi.create(payload),
  createDefaultSecurityGroup: (networkId?: string) => securityGroupsApi.createDefault(networkId),
  removeSecurityGroup: (id: string) => securityGroupsApi.delete(id),
  fetchSGRules: (sgId: string) => securityGroupsApi.listRules(sgId),
  addSGRule: (sgId: string, payload: AddSGRuleRequest) => securityGroupsApi.addRule(sgId, payload),
  updateSGRule: (sgId: string, ruleId: string, payload: UpdateSGRuleRequest) =>
    securityGroupsApi.updateRule(sgId, ruleId, payload),
  removeSGRule: (sgId: string, ruleId: string) => securityGroupsApi.removeRule(sgId, ruleId),
  fetchInstanceSecurityGroups: (instanceId: string) =>
    securityGroupsApi.listForInstance(instanceId),
  attachInstanceSecurityGroup: (instanceId: string, sgId: string) =>
    securityGroupsApi.attachToInstance(instanceId, sgId),
  detachInstanceSecurityGroup: (instanceId: string, sgId: string) =>
    securityGroupsApi.detachFromInstance(instanceId, sgId),

  // Static IPs
  fetchStaticIPs: () => staticIpsApi.list(),
  reserveStaticIP: (payload: ReserveStaticIPRequest) => staticIpsApi.reserve(payload),
  assignStaticIP: (id: string, instanceId: string) => staticIpsApi.assign(id, instanceId),
  unassignStaticIP: (id: string) => staticIpsApi.unassign(id),
  releaseStaticIP: (id: string) => staticIpsApi.release(id),

  // Network interfaces (ENI)
  fetchNetworkInterfaces: () => networkInterfacesApi.list(),
  fetchNetworkInterface: (id: string) => networkInterfacesApi.get(id),
  createNetworkInterface: (payload: CreateNetworkInterfaceRequest) =>
    networkInterfacesApi.create(payload),
  removeNetworkInterface: (id: string) => networkInterfacesApi.delete(id),
  attachNetworkInterface: (id: string, instanceId: string) =>
    networkInterfacesApi.attach(id, instanceId),
  detachNetworkInterface: (id: string) => networkInterfacesApi.detach(id),

  // Routers / gateways / VPN
  fetchRouters: () => routersApi.list(),
  fetchNATGateways: () => natGatewaysApi.list(),
  fetchInternetGateways: () => internetGatewaysApi.list(),
  attachIGW: (id: string, networkId: string) => internetGatewaysApi.attach(id, networkId),
  detachIGW: (id: string) => internetGatewaysApi.detach(id),
  fetchVPNConnections: () => vpnApi.list(),
}
