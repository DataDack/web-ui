import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import {
  useApiGatewayContext,
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
} from "./transport"

/**
 * Configuration does not change unless somebody changes it, and this console is
 * usually the somebody. So nothing here polls: a mutation invalidates exactly
 * what it touched, which is both cheaper and more truthful than a timer that
 * shows a stale row for up to five seconds after an edit.
 */
const CONFIG_STALE_MS = 30_000

export const apigwKeys = {
  apis: (scope: string) => ["apigw", "apis", scope] as const,
  api: (scope: string, apiId: string) => ["apigw", "api", apiId, scope] as const,
  routes: (scope: string, apiId: string) => ["apigw", "routes", apiId, scope] as const,
  integrations: (scope: string, apiId: string) => ["apigw", "integrations", apiId, scope] as const,
  stages: (scope: string, apiId: string) => ["apigw", "stages", apiId, scope] as const,
  deployments: (scope: string, apiId: string) => ["apigw", "deployments", apiId, scope] as const,
  authorizers: (scope: string, apiId: string) => ["apigw", "authorizers", apiId, scope] as const,
  domains: (scope: string) => ["apigw", "domainnames", scope] as const,
  mappings: (scope: string, domainName: string) =>
    ["apigw", "apimappings", domainName, scope] as const,
  apiKeys: (scope: string) => ["apigw", "apikeys", scope] as const,
  usagePlans: (scope: string) => ["apigw", "usageplans", scope] as const,
  planKeys: (scope: string, planId: string) => ["apigw", "plankeys", planId, scope] as const,
  planApis: (scope: string, planId: string) => ["apigw", "planapis", planId, scope] as const,
  models: (scope: string, apiId: string) => ["apigw", "models", apiId, scope] as const,
}

export function useApis() {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.apis(scope),
    queryFn: () => transport.listApis(),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useApi(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.api(scope, apiId ?? ""),
    queryFn: () => transport.getApi(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useRoutes(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.routes(scope, apiId ?? ""),
    queryFn: () => transport.listRoutes(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useIntegrations(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.integrations(scope, apiId ?? ""),
    queryFn: () => transport.listIntegrations(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useStages(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.stages(scope, apiId ?? ""),
    queryFn: () => transport.listStages(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useDeployments(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.deployments(scope, apiId ?? ""),
    queryFn: () => transport.listDeployments(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useAuthorizers(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.authorizers(scope, apiId ?? ""),
    queryFn: () => transport.listAuthorizers(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useDomainNames() {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.domains(scope),
    queryFn: () => transport.listDomainNames(),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useApiMappings(domainName: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.mappings(scope, domainName ?? ""),
    queryFn: () => transport.listApiMappings(domainName ?? ""),
    enabled: Boolean(domainName),
    staleTime: CONFIG_STALE_MS,
  })
}

/**
 * Mutations invalidate the lists they affect, and the ones they affect
 * INDIRECTLY.
 *
 * Deleting an integration is the case that catches people: a route pointing at
 * it now renders a target that resolves to nothing, so the route list has to be
 * refetched too even though the delete never mentioned it.
 */
function useApigwMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  invalidate: (queryClient: QueryClient) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidate(queryClient)
    },
  })
}

export function useCreateApi() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: CreateApiInput) => transport.createApi(input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.apis(scope) }),
  )
}

export function useUpdateApi(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: UpdateApiInput) => transport.updateApi(apiId, input),
    (qc) => {
      void qc.invalidateQueries({ queryKey: apigwKeys.api(scope, apiId) })
      void qc.invalidateQueries({ queryKey: apigwKeys.apis(scope) })
    },
  )
}

export function useDeleteApi() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (apiId: string) => transport.deleteApi(apiId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.apis(scope) }),
  )
}

export function useCreateRoute(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: RouteInput) => transport.createRoute(apiId, input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.routes(scope, apiId) }),
  )
}

export function useUpdateRoute(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (args: { routeId: string; input: Partial<RouteInput> }) =>
      transport.updateRoute(apiId, args.routeId, args.input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.routes(scope, apiId) }),
  )
}

export function useDeleteRoute(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (routeId: string) => transport.deleteRoute(apiId, routeId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.routes(scope, apiId) }),
  )
}

export function useCreateIntegration(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: IntegrationInput) => transport.createIntegration(apiId, input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.integrations(scope, apiId) }),
  )
}

export function useUpdateIntegration(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (args: { integrationId: string; input: Partial<IntegrationInput> }) =>
      transport.updateIntegration(apiId, args.integrationId, args.input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.integrations(scope, apiId) }),
  )
}

export function useDeleteIntegration(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (integrationId: string) => transport.deleteIntegration(apiId, integrationId),
    (qc) => {
      void qc.invalidateQueries({ queryKey: apigwKeys.integrations(scope, apiId) })
      // A route that targeted it now points at nothing.
      void qc.invalidateQueries({ queryKey: apigwKeys.routes(scope, apiId) })
    },
  )
}

export function useCreateStage(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: StageInput) => transport.createStage(apiId, input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.stages(scope, apiId) }),
  )
}

export function useUpdateStage(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (args: { stageName: string; input: UpdateStageInput }) =>
      transport.updateStage(apiId, args.stageName, args.input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.stages(scope, apiId) }),
  )
}

export function useDeleteStage(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (stageName: string) => transport.deleteStage(apiId, stageName),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.stages(scope, apiId) }),
  )
}

export function useCreateDeployment(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: DeploymentInput) => transport.createDeployment(apiId, input),
    (qc) => {
      void qc.invalidateQueries({ queryKey: apigwKeys.deployments(scope, apiId) })
      // Deploying to a stage repoints it, so the stage list is stale too.
      void qc.invalidateQueries({ queryKey: apigwKeys.stages(scope, apiId) })
    },
  )
}

export function useCreateAuthorizer(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: AuthorizerInput) => transport.createAuthorizer(apiId, input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.authorizers(scope, apiId) }),
  )
}

export function useDeleteAuthorizer(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (authorizerId: string) => transport.deleteAuthorizer(apiId, authorizerId),
    (qc) => {
      void qc.invalidateQueries({ queryKey: apigwKeys.authorizers(scope, apiId) })
      // A route naming it now has a dangling authorizer.
      void qc.invalidateQueries({ queryKey: apigwKeys.routes(scope, apiId) })
    },
  )
}

export function useCreateDomainName() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: DomainNameInput) => transport.createDomainName(input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.domains(scope) }),
  )
}

export function useDeleteDomainName() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (domainName: string) => transport.deleteDomainName(domainName),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.domains(scope) }),
  )
}

export function useCreateApiMapping(domainName: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: ApiMappingInput) => transport.createApiMapping(domainName, input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.mappings(scope, domainName) }),
  )
}

export function useDeleteApiMapping(domainName: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (apiMappingId: string) => transport.deleteApiMapping(domainName, apiMappingId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.mappings(scope, domainName) }),
  )
}


// ── Platform extensions ────────────────────────────────────────────────────

export function useApiKeys() {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.apiKeys(scope),
    queryFn: () => transport.listApiKeys(),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useCreateApiKey() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: ApiKeyInput) => transport.createApiKey(input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.apiKeys(scope) }),
  )
}

export function useUpdateApiKey() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (args: { apiKeyId: string; input: Partial<ApiKeyInput> }) =>
      transport.updateApiKey(args.apiKeyId, args.input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.apiKeys(scope) }),
  )
}

export function useDeleteApiKey() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (apiKeyId: string) => transport.deleteApiKey(apiKeyId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.apiKeys(scope) }),
  )
}

/**
 * Revealing a secret is a mutation, not a query, and deliberately so: a query
 * would be cached and refetched on a window focus, so the key would sit in the
 * cache long after the operator closed the dialog they asked for it in.
 */
export function useRevealApiKey() {
  const { transport } = useApiGatewayContext()
  return useMutation({ mutationFn: (apiKeyId: string) => transport.revealApiKey(apiKeyId) })
}

export function useUsagePlans() {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.usagePlans(scope),
    queryFn: () => transport.listUsagePlans(),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useCreateUsagePlan() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: UsagePlanInput) => transport.createUsagePlan(input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.usagePlans(scope) }),
  )
}

export function useDeleteUsagePlan() {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (usagePlanId: string) => transport.deleteUsagePlan(usagePlanId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.usagePlans(scope) }),
  )
}

export function usePlanKeys(usagePlanId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.planKeys(scope, usagePlanId ?? ""),
    queryFn: () => transport.listUsagePlanKeys(usagePlanId ?? ""),
    enabled: Boolean(usagePlanId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useAttachPlanKey(usagePlanId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (apiKeyId: string) => transport.attachUsagePlanKey(usagePlanId, apiKeyId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.planKeys(scope, usagePlanId) }),
  )
}

export function useDetachPlanKey(usagePlanId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (planKeyId: string) => transport.detachUsagePlanKey(usagePlanId, planKeyId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.planKeys(scope, usagePlanId) }),
  )
}

export function usePlanApis(usagePlanId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.planApis(scope, usagePlanId ?? ""),
    queryFn: () => transport.listUsagePlanApis(usagePlanId ?? ""),
    enabled: Boolean(usagePlanId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useAttachPlanApi(usagePlanId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (args: { apiId: string; stage: string }) =>
      transport.attachUsagePlanApi(usagePlanId, args.apiId, args.stage),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.planApis(scope, usagePlanId) }),
  )
}

export function useDetachPlanApi(usagePlanId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (entryId: string) => transport.detachUsagePlanApi(usagePlanId, entryId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.planApis(scope, usagePlanId) }),
  )
}

export function useModels(apiId: string | undefined) {
  const { transport, scope } = useApiGatewayContext()
  return useQuery({
    queryKey: apigwKeys.models(scope, apiId ?? ""),
    queryFn: () => transport.listModels(apiId ?? ""),
    enabled: Boolean(apiId),
    staleTime: CONFIG_STALE_MS,
  })
}

export function useCreateModel(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (input: ModelInput) => transport.createModel(apiId, input),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.models(scope, apiId) }),
  )
}

export function useDeleteModel(apiId: string) {
  const { transport, scope } = useApiGatewayContext()
  return useApigwMutation(
    (modelId: string) => transport.deleteModel(apiId, modelId),
    (qc) => void qc.invalidateQueries({ queryKey: apigwKeys.models(scope, apiId) }),
  )
}

/** Export is a one-off fetch, not a cached list. */
export function useExportApi() {
  const { transport } = useApiGatewayContext()
  return useMutation({ mutationFn: (apiId: string) => transport.exportApi(apiId) })
}
