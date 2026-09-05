import { apigwHttp } from "./apigw.client"
import type * as T from "./apigw.types"

// The API Gateway control plane's HTTP surface, as this console calls it.
//
// It moved off cloud-be-go on 2026-09-05: every path below is now served by the
// serverless FaaS control plane and reached DIRECTLY from the browser, not
// through the platform gateway. Two things follow from that and are worth
// knowing before editing this file.
//
// FaaS answers in its own shapes. A collection is `{items, page, limit, total}`
// rather than the platform's `{data, meta}` envelope, a single resource is the
// bare object, and a delete is 204 with no body. `apigwHttp.list` unwraps
// `items`, so every function here still returns exactly what it returned
// before — the hooks and the components above are unchanged by the move.
//
// The second string argument on every call is the message a failure falls back
// to when the server sent nothing readable. The server's own words win when
// there are any; see apigwErrorMessage.

const BASE = "/v1/apigateway"

// The console has no pagination controls on these lists, so it asks for one
// large page. 100 is under the control plane's per-page ceiling of 200, and an
// account with more than 100 APIs would see the list truncate silently — that
// is the point at which this needs real paging rather than a bigger number.
const PAGE = "?page=1&limit=100"

const ZERO_UUID = "00000000-0000-0000-0000-000000000000"

// The control plane serializes an unset foreign key as JSON null (OptionalUUID),
// but rows written before that type was adopted still carry the all-zeroes UUID.
// Both must read as "not attached" or the console shows a link to a resource
// that does not exist.
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

const APIS = `${BASE}/apis`

export const apigwApi = {
  list: async () =>
    (await apigwHttp.list<T.APIGateway>(APIS + PAGE, "Could not load the APIs")).map(mapAPI),
  get: async (id: string) =>
    mapAPI(await apigwHttp.get<T.APIGateway>(`${APIS}/${id}`, "Could not load the API")),
  create: async (body: T.CreateAPIRequest) =>
    mapAPI(await apigwHttp.post<T.APIGateway>(APIS, body, "Could not create the API")),
  update: async (id: string, body: T.UpdateAPIRequest) =>
    mapAPI(await apigwHttp.put<T.APIGateway>(`${APIS}/${id}`, body, "Could not save the API")),
  delete: (id: string) => apigwHttp.del(`${APIS}/${id}`, "Could not delete the API"),
  updateCORS: async (id: string, body: T.UpdateCORSRequest) =>
    mapAPI(
      await apigwHttp.put<T.APIGateway>(
        `${APIS}/${id}/cors`,
        body,
        "Could not save the CORS policy",
      ),
    ),
  // 201 with {api, warnings} — the ONE route that does not answer with a bare
  // object. The warnings are operations the document described that could not
  // be mapped onto a route.
  //
  // Flattened here rather than handed up as the envelope: the dialog reads
  // `warnings` off the result to decide whether to show them, and reads `id` to
  // navigate to the new API. It needs both on one object, and it previously got
  // the envelope — which is why importing a clean document navigated to
  // /networking/api-gateway/undefined.
  import: async (body: T.ImportAPIRequest) => {
    const res = await apigwHttp.post<{ api: T.APIGateway; warnings?: string[] }>(
      `${APIS}/import`,
      body,
      "Could not import the API",
    )
    return { ...mapAPI(res.api), warnings: res.warnings ?? [] }
  },
  export: (id: string) =>
    apigwHttp.get<T.ExportedAPI>(`${APIS}/${id}/export`, "Could not export the API"),

  listRoutes: async (id: string) =>
    (
      await apigwHttp.list<T.APIGatewayRoute>(
        `${APIS}/${id}/routes${PAGE}`,
        "Could not load the routes",
      )
    ).map(mapRoute),
  getRoute: async (id: string, routeId: string) =>
    mapRoute(
      await apigwHttp.get<T.APIGatewayRoute>(
        `${APIS}/${id}/routes/${routeId}`,
        "Could not load the route",
      ),
    ),
  createRoute: async (id: string, body: T.CreateRouteRequest) =>
    mapRoute(
      await apigwHttp.post<T.APIGatewayRoute>(
        `${APIS}/${id}/routes`,
        body,
        "Could not create the route",
      ),
    ),
  updateRoute: async (id: string, routeId: string, body: T.UpdateRouteRequest) =>
    mapRoute(
      await apigwHttp.put<T.APIGatewayRoute>(
        `${APIS}/${id}/routes/${routeId}`,
        body,
        "Could not save the route",
      ),
    ),
  deleteRoute: (id: string, routeId: string) =>
    apigwHttp.del(`${APIS}/${id}/routes/${routeId}`, "Could not delete the route"),

  listIntegrations: async (id: string) =>
    (
      await apigwHttp.list<T.APIGatewayIntegration>(
        `${APIS}/${id}/integrations${PAGE}`,
        "Could not load the integrations",
      )
    ).map(mapIntegration),
  getIntegration: async (id: string, childId: string) =>
    mapIntegration(
      await apigwHttp.get<T.APIGatewayIntegration>(
        `${APIS}/${id}/integrations/${childId}`,
        "Could not load the integration",
      ),
    ),
  createIntegration: async (id: string, body: T.CreateIntegrationRequest) =>
    mapIntegration(
      await apigwHttp.post<T.APIGatewayIntegration>(
        `${APIS}/${id}/integrations`,
        body,
        "Could not create the integration",
      ),
    ),
  updateIntegration: async (id: string, childId: string, body: T.UpdateIntegrationRequest) =>
    mapIntegration(
      await apigwHttp.put<T.APIGatewayIntegration>(
        `${APIS}/${id}/integrations/${childId}`,
        body,
        "Could not save the integration",
      ),
    ),
  deleteIntegration: (id: string, childId: string) =>
    apigwHttp.del(`${APIS}/${id}/integrations/${childId}`, "Could not delete the integration"),

  listAuthorizers: (id: string) =>
    apigwHttp.list<T.APIGatewayAuthorizer>(
      `${APIS}/${id}/authorizers${PAGE}`,
      "Could not load the authorizers",
    ),
  getAuthorizer: (id: string, childId: string) =>
    apigwHttp.get<T.APIGatewayAuthorizer>(
      `${APIS}/${id}/authorizers/${childId}`,
      "Could not load the authorizer",
    ),
  createAuthorizer: (id: string, body: T.CreateAuthorizerRequest) =>
    apigwHttp.post<T.APIGatewayAuthorizer>(
      `${APIS}/${id}/authorizers`,
      body,
      "Could not create the authorizer",
    ),
  updateAuthorizer: (id: string, childId: string, body: T.UpdateAuthorizerRequest) =>
    apigwHttp.put<T.APIGatewayAuthorizer>(
      `${APIS}/${id}/authorizers/${childId}`,
      body,
      "Could not save the authorizer",
    ),
  deleteAuthorizer: (id: string, childId: string) =>
    apigwHttp.del(`${APIS}/${id}/authorizers/${childId}`, "Could not delete the authorizer"),

  listStages: async (id: string) =>
    (
      await apigwHttp.list<T.APIGatewayStage>(
        `${APIS}/${id}/stages${PAGE}`,
        "Could not load the stages",
      )
    ).map(mapStage),
  getStage: async (id: string, childId: string) =>
    mapStage(
      await apigwHttp.get<T.APIGatewayStage>(
        `${APIS}/${id}/stages/${childId}`,
        "Could not load the stage",
      ),
    ),
  createStage: async (id: string, body: T.CreateStageRequest) =>
    mapStage(
      await apigwHttp.post<T.APIGatewayStage>(
        `${APIS}/${id}/stages`,
        body,
        "Could not create the stage",
      ),
    ),
  updateStage: async (id: string, childId: string, body: T.UpdateStageRequest) =>
    mapStage(
      await apigwHttp.put<T.APIGatewayStage>(
        `${APIS}/${id}/stages/${childId}`,
        body,
        "Could not save the stage",
      ),
    ),
  deleteStage: (id: string, childId: string) =>
    apigwHttp.del(`${APIS}/${id}/stages/${childId}`, "Could not delete the stage"),

  listDeployments: (id: string) =>
    apigwHttp.list<T.APIGatewayDeployment>(
      `${APIS}/${id}/deployments${PAGE}`,
      "Could not load the deployments",
    ),
  getDeployment: (id: string, childId: string) =>
    apigwHttp.get<T.APIGatewayDeployment>(
      `${APIS}/${id}/deployments/${childId}`,
      "Could not load the deployment",
    ),
  createDeployment: (id: string, body: T.CreateDeploymentRequest) =>
    apigwHttp.post<T.APIGatewayDeployment>(
      `${APIS}/${id}/deployments`,
      body,
      "Could not create the deployment",
    ),
  deleteDeployment: (id: string, childId: string) =>
    apigwHttp.del(`${APIS}/${id}/deployments/${childId}`, "Could not delete the deployment"),

  listModels: (id: string) =>
    apigwHttp.list<T.APIGatewayModel>(`${APIS}/${id}/models${PAGE}`, "Could not load the models"),
  getModel: (id: string, childId: string) =>
    apigwHttp.get<T.APIGatewayModel>(`${APIS}/${id}/models/${childId}`, "Could not load the model"),
  createModel: (id: string, body: T.CreateModelRequest) =>
    apigwHttp.post<T.APIGatewayModel>(`${APIS}/${id}/models`, body, "Could not create the model"),
  updateModel: (id: string, childId: string, body: T.UpdateModelRequest) =>
    apigwHttp.put<T.APIGatewayModel>(
      `${APIS}/${id}/models/${childId}`,
      body,
      "Could not save the model",
    ),
  deleteModel: (id: string, childId: string) =>
    apigwHttp.del(`${APIS}/${id}/models/${childId}`, "Could not delete the model"),

  listVPCLinks: () =>
    apigwHttp.list<T.VPCLink>(`${BASE}/vpclinks${PAGE}`, "Could not load the VPC links"),
  getVPCLink: (id: string) =>
    apigwHttp.get<T.VPCLink>(`${BASE}/vpclinks/${id}`, "Could not load the VPC link"),
  createVPCLink: (body: T.CreateVPCLinkRequest) =>
    apigwHttp.post<T.VPCLink>(`${BASE}/vpclinks`, body, "Could not create the VPC link"),
  updateVPCLink: (id: string, body: T.UpdateVPCLinkRequest) =>
    apigwHttp.put<T.VPCLink>(`${BASE}/vpclinks/${id}`, body, "Could not save the VPC link"),
  deleteVPCLink: (id: string) =>
    apigwHttp.del(`${BASE}/vpclinks/${id}`, "Could not delete the VPC link"),

  listDomains: () =>
    apigwHttp.list<T.DomainName>(`${BASE}/domainnames${PAGE}`, "Could not load the custom domains"),
  getDomain: (id: string) =>
    apigwHttp.get<T.DomainName>(`${BASE}/domainnames/${id}`, "Could not load the domain"),
  createDomain: (body: T.CreateDomainNameRequest) =>
    apigwHttp.post<T.DomainName>(`${BASE}/domainnames`, body, "Could not add the domain"),
  updateDomain: (id: string, body: T.UpdateDomainNameRequest) =>
    apigwHttp.put<T.DomainName>(`${BASE}/domainnames/${id}`, body, "Could not save the domain"),
  deleteDomain: (id: string) =>
    apigwHttp.del(`${BASE}/domainnames/${id}`, "Could not remove the domain"),
  listDomainMappings: (id: string) =>
    apigwHttp.list<T.APIMapping>(
      `${BASE}/domainnames/${id}/mappings${PAGE}`,
      "Could not load the API mappings",
    ),
  createDomainMapping: (id: string, body: T.CreateAPIMappingRequest) =>
    apigwHttp.post<T.APIMapping>(
      `${BASE}/domainnames/${id}/mappings`,
      body,
      "Could not create the API mapping",
    ),
  updateDomainMapping: (id: string, childId: string, body: T.UpdateAPIMappingRequest) =>
    apigwHttp.put<T.APIMapping>(
      `${BASE}/domainnames/${id}/mappings/${childId}`,
      body,
      "Could not save the API mapping",
    ),
  deleteDomainMapping: (id: string, childId: string) =>
    apigwHttp.del(
      `${BASE}/domainnames/${id}/mappings/${childId}`,
      "Could not delete the API mapping",
    ),

  listAPIKeys: () =>
    apigwHttp.list<T.APIKey>(`${BASE}/apikeys${PAGE}`, "Could not load the API keys"),
  getAPIKey: (id: string) =>
    apigwHttp.get<T.APIKey>(`${BASE}/apikeys/${id}`, "Could not load the API key"),
  // The one response that carries the generated secret. Nothing else does, and
  // the value is not recoverable from a later read — only from the explicit
  // reveal below.
  createAPIKey: (body: T.CreateAPIKeyRequest) =>
    apigwHttp.post<T.CreatedAPIKey>(`${BASE}/apikeys`, body, "Could not create the API key"),
  updateAPIKey: (id: string, body: T.UpdateAPIKeyRequest) =>
    apigwHttp.put<T.APIKey>(`${BASE}/apikeys/${id}`, body, "Could not save the API key"),
  deleteAPIKey: (id: string) =>
    apigwHttp.del(`${BASE}/apikeys/${id}`, "Could not delete the API key"),
  revealAPIKey: (id: string) =>
    apigwHttp.get<T.APIKeyValue>(`${BASE}/apikeys/${id}/value`, "Could not reveal the API key"),

  listUsagePlans: () =>
    apigwHttp.list<T.UsagePlan>(`${BASE}/usageplans${PAGE}`, "Could not load the usage plans"),
  getUsagePlan: (id: string) =>
    apigwHttp.get<T.UsagePlan>(`${BASE}/usageplans/${id}`, "Could not load the usage plan"),
  createUsagePlan: (body: T.CreateUsagePlanRequest) =>
    apigwHttp.post<T.UsagePlan>(`${BASE}/usageplans`, body, "Could not create the usage plan"),
  updateUsagePlan: (id: string, body: T.UpdateUsagePlanRequest) =>
    apigwHttp.put<T.UsagePlan>(`${BASE}/usageplans/${id}`, body, "Could not save the usage plan"),
  deleteUsagePlan: (id: string) =>
    apigwHttp.del(`${BASE}/usageplans/${id}`, "Could not delete the usage plan"),
  listUsagePlanKeys: (id: string) =>
    apigwHttp.list<T.UsagePlanKey>(
      `${BASE}/usageplans/${id}/keys${PAGE}`,
      "Could not load the plan's API keys",
    ),
  attachUsagePlanKey: (id: string, body: T.AttachPlanKeyRequest) =>
    apigwHttp.post<T.UsagePlanKey>(
      `${BASE}/usageplans/${id}/keys`,
      body,
      "Could not attach the API key",
    ),
  detachUsagePlanKey: (id: string, childId: string) =>
    apigwHttp.del(`${BASE}/usageplans/${id}/keys/${childId}`, "Could not detach the API key"),
  listUsagePlanAPIs: (id: string) =>
    apigwHttp.list<T.UsagePlanAPI>(
      `${BASE}/usageplans/${id}/apis${PAGE}`,
      "Could not load the plan's stages",
    ),
  attachUsagePlanStage: (id: string, body: T.AttachPlanStageRequest) =>
    apigwHttp.post<T.UsagePlanAPI>(
      `${BASE}/usageplans/${id}/apis`,
      body,
      "Could not attach the stage",
    ),
  detachUsagePlanStage: (id: string, childId: string) =>
    apigwHttp.del(`${BASE}/usageplans/${id}/apis/${childId}`, "Could not detach the stage"),
}
