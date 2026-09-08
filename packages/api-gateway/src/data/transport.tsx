import { createContext, useContext, useMemo, type ReactNode } from "react"

import type {
  Api,
  ApiKey,
  ApiMapping,
  ApiRoute,
  Authorizer,
  CorsConfiguration,
  Deployment,
  DomainName,
  Integration,
  Model,
  Stage,
  UsagePlan,
  UsagePlanApi,
  UsagePlanKey,
} from "./schemas"

/**
 * What this console needs from a host application, and nothing more.
 *
 * The package owns no HTTP client on purpose. serverless-web talks to the
 * control plane directly with a bearer token and an X-Faas-Account-Id header;
 * cloud-react goes through the console's own gateway on a session cookie. Both
 * render this UI, and neither app's auth belongs in shared code.
 *
 * Every method maps to one apigatewayv2 operation. A transport that wants a
 * readable failure message throws an Error carrying it — the package knows no
 * error envelope and will not invent one.
 */
export interface ApiGatewayTransport {
  listApis: () => Promise<Api[]>
  getApi: (apiId: string) => Promise<Api>
  createApi: (input: CreateApiInput) => Promise<Api>
  updateApi: (apiId: string, input: UpdateApiInput) => Promise<Api>
  deleteApi: (apiId: string) => Promise<void>

  listRoutes: (apiId: string) => Promise<ApiRoute[]>
  createRoute: (apiId: string, input: RouteInput) => Promise<void>
  updateRoute: (apiId: string, routeId: string, input: Partial<RouteInput>) => Promise<void>
  deleteRoute: (apiId: string, routeId: string) => Promise<void>

  listIntegrations: (apiId: string) => Promise<Integration[]>
  createIntegration: (apiId: string, input: IntegrationInput) => Promise<void>
  updateIntegration: (
    apiId: string,
    integrationId: string,
    input: Partial<IntegrationInput>,
  ) => Promise<void>
  deleteIntegration: (apiId: string, integrationId: string) => Promise<void>

  listStages: (apiId: string) => Promise<Stage[]>
  createStage: (apiId: string, input: StageInput) => Promise<void>
  updateStage: (apiId: string, stageName: string, input: UpdateStageInput) => Promise<void>
  deleteStage: (apiId: string, stageName: string) => Promise<void>

  listDeployments: (apiId: string) => Promise<Deployment[]>
  createDeployment: (apiId: string, input: DeploymentInput) => Promise<void>

  listAuthorizers: (apiId: string) => Promise<Authorizer[]>
  createAuthorizer: (apiId: string, input: AuthorizerInput) => Promise<void>
  deleteAuthorizer: (apiId: string, authorizerId: string) => Promise<void>

  listDomainNames: () => Promise<DomainName[]>
  createDomainName: (input: DomainNameInput) => Promise<DomainName>
  deleteDomainName: (domainName: string) => Promise<void>

  listApiMappings: (domainName: string) => Promise<ApiMapping[]>
  createApiMapping: (domainName: string, input: ApiMappingInput) => Promise<void>
  deleteApiMapping: (domainName: string, apiMappingId: string) => Promise<void>

  // Platform extensions. Not apigatewayv2 — see the package README — but the
  // product has them and the console manages them.
  listApiKeys: () => Promise<ApiKey[]>
  createApiKey: (input: ApiKeyInput) => Promise<ApiKey>
  updateApiKey: (apiKeyId: string, input: Partial<ApiKeyInput>) => Promise<ApiKey>
  deleteApiKey: (apiKeyId: string) => Promise<void>
  /** The secret, from the one call that returns it. */
  revealApiKey: (apiKeyId: string) => Promise<string>

  listUsagePlans: () => Promise<UsagePlan[]>
  createUsagePlan: (input: UsagePlanInput) => Promise<UsagePlan>
  updateUsagePlan: (usagePlanId: string, input: UsagePlanInput) => Promise<UsagePlan>
  deleteUsagePlan: (usagePlanId: string) => Promise<void>
  listUsagePlanKeys: (usagePlanId: string) => Promise<UsagePlanKey[]>
  attachUsagePlanKey: (usagePlanId: string, apiKeyId: string) => Promise<void>
  detachUsagePlanKey: (usagePlanId: string, planKeyId: string) => Promise<void>
  listUsagePlanApis: (usagePlanId: string) => Promise<UsagePlanApi[]>
  attachUsagePlanApi: (usagePlanId: string, apiId: string, stage: string) => Promise<void>
  detachUsagePlanApi: (usagePlanId: string, entryId: string) => Promise<void>

  listModels: (apiId: string) => Promise<Model[]>
  createModel: (apiId: string, input: ModelInput) => Promise<void>
  deleteModel: (apiId: string, modelId: string) => Promise<void>

  exportApi: (apiId: string) => Promise<unknown>
}

export interface ApiKeyInput {
  name: string
  description?: string
  /** Imports a key already issued elsewhere. Blank generates one. */
  value?: string
  enabled?: boolean
  customerId?: string
}

export interface UsagePlanInput {
  name: string
  description?: string
  /** Omit to leave unthrottled; zero would mean "no requests allowed". */
  throttle?: { rateLimit: number; burstLimit: number }
  /** Omit to leave unlimited. */
  quota?: { limit: number; period: string; offset?: number }
  productCode?: string
}

export interface ModelInput {
  name: string
  description?: string
  contentType?: string
  /** A JSON Schema document, as text. */
  schema: string
}

export interface CreateApiInput {
  name: string
  description?: string
  protocolType?: string
  version?: string
  /** Quick-create: the control plane builds a route and integration with it. */
  target?: string
  routeKey?: string
}

export interface UpdateApiInput {
  name?: string
  description?: string
  version?: string
  disableExecuteApiEndpoint?: boolean
  corsConfiguration?: CorsConfiguration
}

export interface RouteInput {
  routeKey: string
  /** "integrations/{integrationId}". Empty detaches. */
  target?: string
  operationName?: string
  authorizationType?: string
  authorizerId?: string
  apiKeyRequired?: boolean
}

export interface IntegrationInput {
  integrationType: string
  integrationUri?: string
  integrationMethod?: string
  description?: string
  payloadFormatVersion?: string
  timeoutInMillis?: number
}

export interface StageInput {
  stageName: string
  description?: string
  autoDeploy?: boolean
}

export interface UpdateStageInput {
  description?: string
  autoDeploy?: boolean
  deploymentId?: string
}

export interface DeploymentInput {
  description?: string
  /** Naming a stage repoints it at the new deployment in the same call. */
  stageName?: string
}

export interface AuthorizerInput {
  name: string
  authorizerType: string
  identitySource?: string[]
  jwtConfiguration?: { issuer: string; audience: string[] }
  authorizerUri?: string
}

export interface DomainNameInput {
  domainName: string
  endpointType?: string
  securityPolicy?: string
  certificateArn?: string
}

export interface ApiMappingInput {
  apiId: string
  stage: string
  apiMappingKey?: string
}

interface ApiGatewayContextValue {
  transport: ApiGatewayTransport
  /**
   * Scopes every cache key. Without it, switching tenants shows the previous
   * one's APIs from cache until the refetch lands — stale data the operator was
   * already shown, but an operator who has just switched is precisely the one
   * who cannot tell it apart from a leak.
   */
  scope: string
}

const ApiGatewayContext = createContext<ApiGatewayContextValue | null>(null)

export interface ApiGatewayProviderProps {
  transport: ApiGatewayTransport
  /** The active account, or any string that changes when the tenant does. */
  scope?: string
  children: ReactNode
}

/**
 * Supplies the transport this console fetches through. Wrap once, high in each
 * app's tree and inside its QueryClientProvider.
 */
export function ApiGatewayProvider({
  transport,
  scope = "default",
  children,
}: Readonly<ApiGatewayProviderProps>) {
  const value = useMemo<ApiGatewayContextValue>(() => ({ transport, scope }), [transport, scope])
  return <ApiGatewayContext.Provider value={value}>{children}</ApiGatewayContext.Provider>
}

export function useApiGatewayContext(): ApiGatewayContextValue {
  const ctx = useContext(ApiGatewayContext)
  if (!ctx) {
    throw new Error("useApiGatewayContext must be used within an <ApiGatewayProvider>")
  }
  return ctx
}
