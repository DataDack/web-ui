/**
 * The API Gateway console, shared by every DataDack web surface.
 *
 * The package owns no HTTP client: it declares ApiGatewayTransport and the app
 * supplies one. That is what lets the same console live in serverless-web,
 * which talks to the control plane with a bearer token, and in cloud-react,
 * which goes through the console's gateway on a session cookie.
 */

export { ApiGatewayRoutes } from "./console/ApiGatewayRoutes"
export { ApiGatewayPage } from "./console/ApiGatewayPage"
export { ApiDetailPage } from "./console/ApiDetailPage"
export { CustomDomainsPage } from "./console/CustomDomainsPage"
export { ApiKeysPage } from "./console/ApiKeysPage"
export { UsagePlansPage } from "./console/UsagePlansPage"

export { createApiGatewayTransport } from "./data/createTransport"
export type { ApiGatewayHttp, ApiGatewayRequest, ApiGatewayResponse } from "./data/http"

export {
  ApiGatewayProvider,
  useApiGatewayContext,
  type ApiGatewayProviderProps,
  type ApiGatewayTransport,
  type ApiKeyInput,
  type ApiMappingInput,
  type AuthorizerInput,
  type CreateApiInput,
  type DeploymentInput,
  type DomainNameInput,
  type IntegrationInput,
  type ModelInput,
  type RouteInput,
  type StageInput,
  type UpdateApiInput,
  type UpdateStageInput,
  type UsagePlanInput,
} from "./data/transport"

export {
  apigwKeys,
  useApi,
  useApiMappings,
  useApis,
  useAuthorizers,
  useCreateApi,
  useCreateApiMapping,
  useCreateAuthorizer,
  useCreateDeployment,
  useCreateDomainName,
  useCreateIntegration,
  useCreateRoute,
  useCreateStage,
  useDeleteApi,
  useDeleteApiMapping,
  useDeleteAuthorizer,
  useDeleteDomainName,
  useDeleteIntegration,
  useDeleteRoute,
  useDeleteStage,
  useDeployments,
  useDomainNames,
  useIntegrations,
  useRoutes,
  useStages,
  useUpdateApi,
  useUpdateIntegration,
  useUpdateRoute,
  useUpdateStage,
  // Platform extensions.
  useApiKeys,
  useAttachPlanApi,
  useAttachPlanKey,
  useCreateApiKey,
  useCreateModel,
  useCreateUsagePlan,
  useDeleteApiKey,
  useDeleteModel,
  useDeleteUsagePlan,
  useDetachPlanApi,
  useDetachPlanKey,
  useExportApi,
  useModels,
  usePlanApis,
  usePlanKeys,
  useRevealApiKey,
  useUpdateApiKey,
  useUsagePlans,
} from "./data/queries"

/**
 * The wire shapes, exported so an app's transport can parse responses with the
 * same schemas the console renders from. Sharing them is the point: a field the
 * package reads and the app drops would be undefined at render time with
 * nothing to say why.
 */
export {
  apiListSchema,
  apiMappingListSchema,
  apiSchema,
  authorizerListSchema,
  corsConfigurationSchema,
  deploymentListSchema,
  domainNameListSchema,
  domainNameSchema,
  apiKeyListSchema,
  apiKeySchema,
  integrationListSchema,
  modelListSchema,
  routeListSchema,
  stageListSchema,
  usagePlanApiListSchema,
  usagePlanKeyListSchema,
  usagePlanListSchema,
  usagePlanSchema,
  type Api,
  type ApiMapping,
  type ApiRoute,
  type Authorizer,
  type CorsConfiguration,
  type Deployment,
  type DomainName,
  type ApiKey,
  type Integration,
  type Model,
  type Stage,
  type UsagePlan,
  type UsagePlanApi,
  type UsagePlanKey,
} from "./data/schemas"
