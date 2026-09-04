import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type * as T from "./apigw.types"

const BASE = "/vpc/apigateway"
const ZERO_UUID = "00000000-0000-0000-0000-000000000000"
const uuid = (value: string | null | undefined): string | undefined =>
  value && value !== ZERO_UUID ? value : undefined
const mapAPI = (v: T.APIGateway): T.APIGateway => ({
  ...v,
  resource_group_id: uuid(v.resource_group_id),
  routes: v.routes?.map(mapRoute),
  integrations: v.integrations?.map(mapIntegration),
  stages: v.stages?.map(mapStage),
})
const mapRoute = (v: T.APIGatewayRoute): T.APIGatewayRoute => ({
  ...v,
  target_integration_id: uuid(v.target_integration_id),
  authorizer_id: uuid(v.authorizer_id),
})
const mapIntegration = (v: T.APIGatewayIntegration): T.APIGatewayIntegration => ({
  ...v,
  vpc_link_id: uuid(v.vpc_link_id),
})
const mapStage = (v: T.APIGatewayStage): T.APIGatewayStage => ({
  ...v,
  deployment_id: uuid(v.deployment_id),
})
const list = <R>(path: string) => apiGet<R[]>(path + LIST_QUERY)

export const apigwApi = {
  list: async () => (await list<T.APIGateway>(BASE)).map(mapAPI),
  get: async (id: string) => mapAPI(await apiGet<T.APIGateway>(`${BASE}/${id}`)),
  create: async (body: T.CreateAPIRequest) => mapAPI(await apiPost<T.APIGateway>(BASE, body)),
  update: async (id: string, body: T.UpdateAPIRequest) =>
    mapAPI(await apiPut<T.APIGateway>(`${BASE}/${id}`, body)),
  delete: (id: string) => apiDelete(`${BASE}/${id}`),
  updateCORS: async (id: string, body: T.UpdateCORSRequest) =>
    mapAPI(await apiPut<T.APIGateway>(`${BASE}/${id}/cors`, body)),
  import: async (body: T.ImportAPIRequest) =>
    mapAPI(await apiPost<T.APIGateway>(`${BASE}/import`, body)),
  export: (id: string) => apiGet<T.ExportedAPI>(`${BASE}/${id}/export`),

  listRoutes: async (id: string) =>
    (await list<T.APIGatewayRoute>(`${BASE}/${id}/routes`)).map(mapRoute),
  getRoute: async (id: string, routeId: string) =>
    mapRoute(await apiGet<T.APIGatewayRoute>(`${BASE}/${id}/routes/${routeId}`)),
  createRoute: async (id: string, body: T.CreateRouteRequest) =>
    mapRoute(await apiPost<T.APIGatewayRoute>(`${BASE}/${id}/routes`, body)),
  updateRoute: async (id: string, routeId: string, body: T.UpdateRouteRequest) =>
    mapRoute(await apiPut<T.APIGatewayRoute>(`${BASE}/${id}/routes/${routeId}`, body)),
  deleteRoute: (id: string, routeId: string) => apiDelete(`${BASE}/${id}/routes/${routeId}`),

  listIntegrations: async (id: string) =>
    (await list<T.APIGatewayIntegration>(`${BASE}/${id}/integrations`)).map(mapIntegration),
  getIntegration: async (id: string, childId: string) =>
    mapIntegration(await apiGet<T.APIGatewayIntegration>(`${BASE}/${id}/integrations/${childId}`)),
  createIntegration: async (id: string, body: T.CreateIntegrationRequest) =>
    mapIntegration(await apiPost<T.APIGatewayIntegration>(`${BASE}/${id}/integrations`, body)),
  updateIntegration: async (id: string, childId: string, body: T.UpdateIntegrationRequest) =>
    mapIntegration(
      await apiPut<T.APIGatewayIntegration>(`${BASE}/${id}/integrations/${childId}`, body),
    ),
  deleteIntegration: (id: string, childId: string) =>
    apiDelete(`${BASE}/${id}/integrations/${childId}`),

  listAuthorizers: (id: string) => list<T.APIGatewayAuthorizer>(`${BASE}/${id}/authorizers`),
  getAuthorizer: (id: string, childId: string) =>
    apiGet<T.APIGatewayAuthorizer>(`${BASE}/${id}/authorizers/${childId}`),
  createAuthorizer: (id: string, body: T.CreateAuthorizerRequest) =>
    apiPost<T.APIGatewayAuthorizer>(`${BASE}/${id}/authorizers`, body),
  updateAuthorizer: (id: string, childId: string, body: T.UpdateAuthorizerRequest) =>
    apiPut<T.APIGatewayAuthorizer>(`${BASE}/${id}/authorizers/${childId}`, body),
  deleteAuthorizer: (id: string, childId: string) =>
    apiDelete(`${BASE}/${id}/authorizers/${childId}`),

  listStages: async (id: string) =>
    (await list<T.APIGatewayStage>(`${BASE}/${id}/stages`)).map(mapStage),
  getStage: async (id: string, childId: string) =>
    mapStage(await apiGet<T.APIGatewayStage>(`${BASE}/${id}/stages/${childId}`)),
  createStage: async (id: string, body: T.CreateStageRequest) =>
    mapStage(await apiPost<T.APIGatewayStage>(`${BASE}/${id}/stages`, body)),
  updateStage: async (id: string, childId: string, body: T.UpdateStageRequest) =>
    mapStage(await apiPut<T.APIGatewayStage>(`${BASE}/${id}/stages/${childId}`, body)),
  deleteStage: (id: string, childId: string) => apiDelete(`${BASE}/${id}/stages/${childId}`),

  listDeployments: (id: string) => list<T.APIGatewayDeployment>(`${BASE}/${id}/deployments`),
  getDeployment: (id: string, childId: string) =>
    apiGet<T.APIGatewayDeployment>(`${BASE}/${id}/deployments/${childId}`),
  createDeployment: (id: string, body: T.CreateDeploymentRequest) =>
    apiPost<T.APIGatewayDeployment>(`${BASE}/${id}/deployments`, body),
  deleteDeployment: (id: string, childId: string) =>
    apiDelete(`${BASE}/${id}/deployments/${childId}`),

  listModels: (id: string) => list<T.APIGatewayModel>(`${BASE}/${id}/models`),
  getModel: (id: string, childId: string) =>
    apiGet<T.APIGatewayModel>(`${BASE}/${id}/models/${childId}`),
  createModel: (id: string, body: T.CreateModelRequest) =>
    apiPost<T.APIGatewayModel>(`${BASE}/${id}/models`, body),
  updateModel: (id: string, childId: string, body: T.UpdateModelRequest) =>
    apiPut<T.APIGatewayModel>(`${BASE}/${id}/models/${childId}`, body),
  deleteModel: (id: string, childId: string) => apiDelete(`${BASE}/${id}/models/${childId}`),

  listVPCLinks: () => list<T.VPCLink>(`${BASE}/vpclinks`),
  getVPCLink: (id: string) => apiGet<T.VPCLink>(`${BASE}/vpclinks/${id}`),
  createVPCLink: (body: T.CreateVPCLinkRequest) => apiPost<T.VPCLink>(`${BASE}/vpclinks`, body),
  updateVPCLink: (id: string, body: T.UpdateVPCLinkRequest) =>
    apiPut<T.VPCLink>(`${BASE}/vpclinks/${id}`, body),
  deleteVPCLink: (id: string) => apiDelete(`${BASE}/vpclinks/${id}`),
  listDomains: () => list<T.DomainName>(`${BASE}/domainnames`),
  getDomain: (id: string) => apiGet<T.DomainName>(`${BASE}/domainnames/${id}`),
  createDomain: (body: T.CreateDomainNameRequest) =>
    apiPost<T.DomainName>(`${BASE}/domainnames`, body),
  updateDomain: (id: string, body: T.UpdateDomainNameRequest) =>
    apiPut<T.DomainName>(`${BASE}/domainnames/${id}`, body),
  deleteDomain: (id: string) => apiDelete(`${BASE}/domainnames/${id}`),
  listDomainMappings: (id: string) => list<T.APIMapping>(`${BASE}/domainnames/${id}/mappings`),
  createDomainMapping: (id: string, body: T.CreateAPIMappingRequest) =>
    apiPost<T.APIMapping>(`${BASE}/domainnames/${id}/mappings`, body),
  updateDomainMapping: (id: string, childId: string, body: T.UpdateAPIMappingRequest) =>
    apiPut<T.APIMapping>(`${BASE}/domainnames/${id}/mappings/${childId}`, body),
  deleteDomainMapping: (id: string, childId: string) =>
    apiDelete(`${BASE}/domainnames/${id}/mappings/${childId}`),
  listAPIKeys: () => list<T.APIKey>(`${BASE}/apikeys`),
  getAPIKey: (id: string) => apiGet<T.APIKey>(`${BASE}/apikeys/${id}`),
  createAPIKey: (body: T.CreateAPIKeyRequest) => apiPost<T.CreatedAPIKey>(`${BASE}/apikeys`, body),
  updateAPIKey: (id: string, body: T.UpdateAPIKeyRequest) =>
    apiPut<T.APIKey>(`${BASE}/apikeys/${id}`, body),
  deleteAPIKey: (id: string) => apiDelete(`${BASE}/apikeys/${id}`),
  revealAPIKey: (id: string) => apiGet<T.APIKeyValue>(`${BASE}/apikeys/${id}/value`),
  listUsagePlans: () => list<T.UsagePlan>(`${BASE}/usageplans`),
  getUsagePlan: (id: string) => apiGet<T.UsagePlan>(`${BASE}/usageplans/${id}`),
  createUsagePlan: (body: T.CreateUsagePlanRequest) =>
    apiPost<T.UsagePlan>(`${BASE}/usageplans`, body),
  updateUsagePlan: (id: string, body: T.UpdateUsagePlanRequest) =>
    apiPut<T.UsagePlan>(`${BASE}/usageplans/${id}`, body),
  deleteUsagePlan: (id: string) => apiDelete(`${BASE}/usageplans/${id}`),
  listUsagePlanKeys: (id: string) => list<T.UsagePlanKey>(`${BASE}/usageplans/${id}/keys`),
  attachUsagePlanKey: (id: string, body: T.AttachPlanKeyRequest) =>
    apiPost<T.UsagePlanKey>(`${BASE}/usageplans/${id}/keys`, body),
  detachUsagePlanKey: (id: string, childId: string) =>
    apiDelete(`${BASE}/usageplans/${id}/keys/${childId}`),
  listUsagePlanAPIs: (id: string) => list<T.UsagePlanAPI>(`${BASE}/usageplans/${id}/apis`),
  attachUsagePlanStage: (id: string, body: T.AttachPlanStageRequest) =>
    apiPost<T.UsagePlanAPI>(`${BASE}/usageplans/${id}/apis`, body),
  detachUsagePlanStage: (id: string, childId: string) =>
    apiDelete(`${BASE}/usageplans/${id}/apis/${childId}`),
}
