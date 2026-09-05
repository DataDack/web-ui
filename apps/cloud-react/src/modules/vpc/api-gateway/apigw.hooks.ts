import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { apigwApi } from "./apigw.api"
import { APIGW_QUERY_KEYS as K } from "./apigw.constants"
import type * as T from "./apigw.types"

function useAction<D, V>(
  fn: (variables: V) => Promise<D>,
  success: string,
  failure: string,
  keys: (variables: V) => QueryKey[],
) {
  const client = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, variables) => {
      keys(variables).forEach((queryKey) => void client.invalidateQueries({ queryKey }))
      toast.success(t(`apiGateway.${success}`))
    },
    // The quota- and KYC-gate handlers are deliberately absent. They read the
    // platform gateway's error envelope, and every mutation here now goes
    // straight to the serverless control plane, which answers in its own shape
    // — so calling them would be dead code that reads as a working gate.
    onError: () => {
      toast.error(t(`apiGateway.${failure}`))
    },
  })
}

export const useAPIs = () => useQuery({ queryKey: K.list, queryFn: apigwApi.list })
export const useAPI = (id: string) =>
  useQuery({ queryKey: K.detail(id), queryFn: () => apigwApi.get(id), enabled: !!id })
// NOT quota-gated any more, and that is a real change rather than an oversight.
// The quota check lived in cloud-be-go's quotaguard, which reads the platform's
// quota tables; the control plane moved to the serverless service on 2026-09-05
// and that service has no channel to those tables. `vpc.api_gateways` was
// removed from the quota registry with it. Nothing limits how many APIs an
// account creates today — restoring that needs the serverless side to consult
// the platform's quota API, the way it already does for functions.
export const useCreateAPI = () =>
  useAction(apigwApi.create, "toasts.created", "toasts.createFailed", () => [K.list])
export const useUpdateAPI = () =>
  useAction(
    ({ id, payload }: { id: string; payload: T.UpdateAPIRequest }) => apigwApi.update(id, payload),
    "toasts.updated",
    "toasts.updateFailed",
    ({ id }) => [K.list, K.detail(id)],
  )
export const useDeleteAPI = () =>
  useAction(
    (id: string) => apigwApi.delete(id),
    "toasts.deleted",
    "toasts.deleteFailed",
    (id) => [K.list, K.detail(id)],
  )
export const useUpdateCORS = () =>
  useAction(
    ({ id, payload }: { id: string; payload: T.UpdateCORSRequest }) =>
      apigwApi.updateCORS(id, payload),
    "toasts.corsUpdated",
    "toasts.corsUpdateFailed",
    ({ id }) => [K.detail(id)],
  )
export const useImportAPI = () =>
  useAction(apigwApi.import, "toasts.imported", "toasts.importFailed", () => [K.list])
export const useExportAPI = (id: string) =>
  useQuery({
    queryKey: ["apiGateway", "export", id],
    queryFn: () => apigwApi.export(id),
    enabled: !!id,
  })
/** Event-driven export for list row actions; unlike the detail query, this does not fetch eagerly. */
export const useExportAPIDefinition = () =>
  useMutation({ mutationFn: (id: string) => apigwApi.export(id) })

export const useRoutes = (id: string) =>
  useQuery({ queryKey: K.routes(id), queryFn: () => apigwApi.listRoutes(id), enabled: !!id })
export const useRoute = (id: string, childId: string) =>
  useQuery({
    queryKey: [...K.routes(id), childId],
    queryFn: () => apigwApi.getRoute(id, childId),
    enabled: !!id && !!childId,
  })
export const useCreateRoute = () =>
  useAction(
    ({ apiId, payload }: { apiId: string; payload: T.CreateRouteRequest }) =>
      apigwApi.createRoute(apiId, payload),
    "toasts.routeCreated",
    "toasts.routeCreateFailed",
    ({ apiId }) => [K.routes(apiId), K.detail(apiId)],
  )
export const useUpdateRoute = () =>
  useAction(
    ({
      apiId,
      routeId,
      payload,
    }: {
      apiId: string
      routeId: string
      payload: T.UpdateRouteRequest
    }) => apigwApi.updateRoute(apiId, routeId, payload),
    "toasts.routeUpdated",
    "toasts.routeUpdateFailed",
    ({ apiId }) => [K.routes(apiId), K.detail(apiId)],
  )
export const useDeleteRoute = () =>
  useAction(
    ({ apiId, routeId }: { apiId: string; routeId: string }) =>
      apigwApi.deleteRoute(apiId, routeId),
    "toasts.routeDeleted",
    "toasts.routeDeleteFailed",
    ({ apiId }) => [K.routes(apiId), K.detail(apiId)],
  )

export const useIntegrations = (id: string) =>
  useQuery({
    queryKey: K.integrations(id),
    queryFn: () => apigwApi.listIntegrations(id),
    enabled: !!id,
  })
export const useIntegration = (id: string, childId: string) =>
  useQuery({
    queryKey: [...K.integrations(id), childId],
    queryFn: () => apigwApi.getIntegration(id, childId),
    enabled: !!id && !!childId,
  })
export const useCreateIntegration = () =>
  useAction(
    ({ apiId, payload }: { apiId: string; payload: T.CreateIntegrationRequest }) =>
      apigwApi.createIntegration(apiId, payload),
    "toasts.integrationCreated",
    "toasts.integrationCreateFailed",
    ({ apiId }) => [K.integrations(apiId), K.detail(apiId)],
  )
export const useUpdateIntegration = () =>
  useAction(
    ({
      apiId,
      integrationId,
      payload,
    }: {
      apiId: string
      integrationId: string
      payload: T.UpdateIntegrationRequest
    }) => apigwApi.updateIntegration(apiId, integrationId, payload),
    "toasts.integrationUpdated",
    "toasts.integrationUpdateFailed",
    ({ apiId }) => [K.integrations(apiId), K.routes(apiId), K.detail(apiId)],
  )
export const useDeleteIntegration = () =>
  useAction(
    ({ apiId, integrationId }: { apiId: string; integrationId: string }) =>
      apigwApi.deleteIntegration(apiId, integrationId),
    "toasts.integrationDeleted",
    "toasts.integrationDeleteFailed",
    ({ apiId }) => [K.integrations(apiId), K.routes(apiId), K.detail(apiId)],
  )

export const useAuthorizers = (id: string) =>
  useQuery({
    queryKey: K.authorizers(id),
    queryFn: () => apigwApi.listAuthorizers(id),
    enabled: !!id,
  })
export const useAuthorizer = (id: string, childId: string) =>
  useQuery({
    queryKey: [...K.authorizers(id), childId],
    queryFn: () => apigwApi.getAuthorizer(id, childId),
    enabled: !!id && !!childId,
  })
export const useCreateAuthorizer = () =>
  useAction(
    ({ apiId, payload }: { apiId: string; payload: T.CreateAuthorizerRequest }) =>
      apigwApi.createAuthorizer(apiId, payload),
    "toasts.authorizerCreated",
    "toasts.authorizerCreateFailed",
    ({ apiId }) => [K.authorizers(apiId), K.detail(apiId)],
  )
export const useUpdateAuthorizer = () =>
  useAction(
    ({
      apiId,
      authorizerId,
      payload,
    }: {
      apiId: string
      authorizerId: string
      payload: T.UpdateAuthorizerRequest
    }) => apigwApi.updateAuthorizer(apiId, authorizerId, payload),
    "toasts.authorizerUpdated",
    "toasts.authorizerUpdateFailed",
    ({ apiId }) => [K.authorizers(apiId), K.routes(apiId), K.detail(apiId)],
  )
export const useDeleteAuthorizer = () =>
  useAction(
    ({ apiId, authorizerId }: { apiId: string; authorizerId: string }) =>
      apigwApi.deleteAuthorizer(apiId, authorizerId),
    "toasts.authorizerDeleted",
    "toasts.authorizerDeleteFailed",
    ({ apiId }) => [K.authorizers(apiId), K.routes(apiId), K.detail(apiId)],
  )

export const useStages = (id: string) =>
  useQuery({ queryKey: K.stages(id), queryFn: () => apigwApi.listStages(id), enabled: !!id })
export const useStage = (id: string, childId: string) =>
  useQuery({
    queryKey: [...K.stages(id), childId],
    queryFn: () => apigwApi.getStage(id, childId),
    enabled: !!id && !!childId,
  })
export const useCreateStage = () =>
  useAction(
    ({ apiId, payload }: { apiId: string; payload: T.CreateStageRequest }) =>
      apigwApi.createStage(apiId, payload),
    "toasts.stageCreated",
    "toasts.stageCreateFailed",
    ({ apiId }) => [K.stages(apiId), K.detail(apiId)],
  )
export const useUpdateStage = () =>
  useAction(
    ({
      apiId,
      stageId,
      payload,
    }: {
      apiId: string
      stageId: string
      payload: T.UpdateStageRequest
    }) => apigwApi.updateStage(apiId, stageId, payload),
    "toasts.stageUpdated",
    "toasts.stageUpdateFailed",
    ({ apiId }) => [K.stages(apiId), K.detail(apiId), K.usagePlans],
  )
export const useDeleteStage = () =>
  useAction(
    ({ apiId, stageId }: { apiId: string; stageId: string }) =>
      apigwApi.deleteStage(apiId, stageId),
    "toasts.stageDeleted",
    "toasts.stageDeleteFailed",
    ({ apiId }) => [K.stages(apiId), K.detail(apiId), K.usagePlans],
  )

export const useDeployments = (id: string) =>
  useQuery({
    queryKey: K.deployments(id),
    queryFn: () => apigwApi.listDeployments(id),
    enabled: !!id,
  })
export const useDeployment = (id: string, childId: string) =>
  useQuery({
    queryKey: [...K.deployments(id), childId],
    queryFn: () => apigwApi.getDeployment(id, childId),
    enabled: !!id && !!childId,
  })
export const useCreateDeployment = () =>
  useAction(
    ({ apiId, payload }: { apiId: string; payload: T.CreateDeploymentRequest }) =>
      apigwApi.createDeployment(apiId, payload),
    "toasts.deploymentCreated",
    "toasts.deploymentCreateFailed",
    ({ apiId }) => [K.deployments(apiId), K.stages(apiId), K.detail(apiId)],
  )
export const useDeleteDeployment = () =>
  useAction(
    ({ apiId, deploymentId }: { apiId: string; deploymentId: string }) =>
      apigwApi.deleteDeployment(apiId, deploymentId),
    "toasts.deploymentDeleted",
    "toasts.deploymentDeleteFailed",
    ({ apiId }) => [K.deployments(apiId), K.stages(apiId)],
  )

export const useModels = (id: string) =>
  useQuery({ queryKey: K.models(id), queryFn: () => apigwApi.listModels(id), enabled: !!id })
export const useModel = (id: string, childId: string) =>
  useQuery({
    queryKey: [...K.models(id), childId],
    queryFn: () => apigwApi.getModel(id, childId),
    enabled: !!id && !!childId,
  })
export const useCreateModel = () =>
  useAction(
    ({ apiId, payload }: { apiId: string; payload: T.CreateModelRequest }) =>
      apigwApi.createModel(apiId, payload),
    "toasts.modelCreated",
    "toasts.modelCreateFailed",
    ({ apiId }) => [K.models(apiId)],
  )
export const useUpdateModel = () =>
  useAction(
    ({
      apiId,
      modelId,
      payload,
    }: {
      apiId: string
      modelId: string
      payload: T.UpdateModelRequest
    }) => apigwApi.updateModel(apiId, modelId, payload),
    "toasts.modelUpdated",
    "toasts.modelUpdateFailed",
    ({ apiId }) => [K.models(apiId), K.routes(apiId)],
  )
export const useDeleteModel = () =>
  useAction(
    ({ apiId, modelId }: { apiId: string; modelId: string }) =>
      apigwApi.deleteModel(apiId, modelId),
    "toasts.modelDeleted",
    "toasts.modelDeleteFailed",
    ({ apiId }) => [K.models(apiId), K.routes(apiId)],
  )

export const useVPCLinks = () => useQuery({ queryKey: K.vpcLinks, queryFn: apigwApi.listVPCLinks })
export const useVPCLink = (id: string) =>
  useQuery({ queryKey: [...K.vpcLinks, id], queryFn: () => apigwApi.getVPCLink(id), enabled: !!id })
export const useCreateVPCLink = () =>
  useAction(apigwApi.createVPCLink, "toasts.vpcLinkCreated", "toasts.vpcLinkCreateFailed", () => [
    K.vpcLinks,
  ])
export const useUpdateVPCLink = () =>
  useAction(
    ({ id, payload }: { id: string; payload: T.UpdateVPCLinkRequest }) =>
      apigwApi.updateVPCLink(id, payload),
    "toasts.vpcLinkUpdated",
    "toasts.vpcLinkUpdateFailed",
    () => [K.vpcLinks],
  )
export const useDeleteVPCLink = () =>
  useAction(apigwApi.deleteVPCLink, "toasts.vpcLinkDeleted", "toasts.vpcLinkDeleteFailed", () => [
    K.vpcLinks,
  ])

export const useDomains = () => useQuery({ queryKey: K.domains, queryFn: apigwApi.listDomains })
export const useDomain = (id: string) =>
  useQuery({ queryKey: [...K.domains, id], queryFn: () => apigwApi.getDomain(id), enabled: !!id })
export const useCreateDomain = () =>
  useAction(apigwApi.createDomain, "toasts.domainCreated", "toasts.domainCreateFailed", () => [
    K.domains,
  ])
export const useUpdateDomain = () =>
  useAction(
    ({ id, payload }: { id: string; payload: T.UpdateDomainNameRequest }) =>
      apigwApi.updateDomain(id, payload),
    "toasts.domainUpdated",
    "toasts.domainUpdateFailed",
    () => [K.domains],
  )
export const useDeleteDomain = () =>
  useAction(apigwApi.deleteDomain, "toasts.domainDeleted", "toasts.domainDeleteFailed", () => [
    K.domains,
  ])
export const useDomainMappings = (id: string) =>
  useQuery({
    queryKey: K.domainMappings(id),
    queryFn: () => apigwApi.listDomainMappings(id),
    enabled: !!id,
  })
export const useCreateDomainMapping = () =>
  useAction(
    ({ domainId, payload }: { domainId: string; payload: T.CreateAPIMappingRequest }) =>
      apigwApi.createDomainMapping(domainId, payload),
    "toasts.mappingCreated",
    "toasts.mappingCreateFailed",
    ({ domainId }) => [K.domainMappings(domainId), K.domains],
  )
export const useUpdateDomainMapping = () =>
  useAction(
    ({
      domainId,
      mappingId,
      payload,
    }: {
      domainId: string
      mappingId: string
      payload: T.UpdateAPIMappingRequest
    }) => apigwApi.updateDomainMapping(domainId, mappingId, payload),
    "toasts.mappingUpdated",
    "toasts.mappingUpdateFailed",
    ({ domainId }) => [K.domainMappings(domainId), K.domains],
  )
export const useDeleteDomainMapping = () =>
  useAction(
    ({ domainId, mappingId }: { domainId: string; mappingId: string }) =>
      apigwApi.deleteDomainMapping(domainId, mappingId),
    "toasts.mappingDeleted",
    "toasts.mappingDeleteFailed",
    ({ domainId }) => [K.domainMappings(domainId), K.domains],
  )

export const useAPIKeys = () => useQuery({ queryKey: K.apiKeys, queryFn: apigwApi.listAPIKeys })
export const useAPIKey = (id: string) =>
  useQuery({ queryKey: [...K.apiKeys, id], queryFn: () => apigwApi.getAPIKey(id), enabled: !!id })
export const useCreateAPIKey = () =>
  useAction(apigwApi.createAPIKey, "toasts.apiKeyCreated", "toasts.apiKeyCreateFailed", () => [
    K.apiKeys,
  ])
export const useUpdateAPIKey = () =>
  useAction(
    ({ id, payload }: { id: string; payload: T.UpdateAPIKeyRequest }) =>
      apigwApi.updateAPIKey(id, payload),
    "toasts.apiKeyUpdated",
    "toasts.apiKeyUpdateFailed",
    () => [K.apiKeys],
  )
export const useDeleteAPIKey = () =>
  useAction(apigwApi.deleteAPIKey, "toasts.apiKeyDeleted", "toasts.apiKeyDeleteFailed", () => [
    K.apiKeys,
  ])
export const useRevealAPIKey = () =>
  useAction(apigwApi.revealAPIKey, "toasts.apiKeyRevealed", "toasts.apiKeyRevealFailed", () => [])

export const useUsagePlans = () =>
  useQuery({ queryKey: K.usagePlans, queryFn: apigwApi.listUsagePlans })
export const useUsagePlan = (id: string) =>
  useQuery({
    queryKey: [...K.usagePlans, id],
    queryFn: () => apigwApi.getUsagePlan(id),
    enabled: !!id,
  })
export const useCreateUsagePlan = () =>
  useAction(
    apigwApi.createUsagePlan,
    "toasts.usagePlanCreated",
    "toasts.usagePlanCreateFailed",
    () => [K.usagePlans],
  )
export const useUpdateUsagePlan = () =>
  useAction(
    ({ id, payload }: { id: string; payload: T.UpdateUsagePlanRequest }) =>
      apigwApi.updateUsagePlan(id, payload),
    "toasts.usagePlanUpdated",
    "toasts.usagePlanUpdateFailed",
    () => [K.usagePlans],
  )
export const useDeleteUsagePlan = () =>
  useAction(
    apigwApi.deleteUsagePlan,
    "toasts.usagePlanDeleted",
    "toasts.usagePlanDeleteFailed",
    () => [K.usagePlans],
  )
export const useUsagePlanKeys = (id: string) =>
  useQuery({
    queryKey: K.usagePlanKeys(id),
    queryFn: () => apigwApi.listUsagePlanKeys(id),
    enabled: !!id,
  })
export const useAttachUsagePlanKey = () =>
  useAction(
    ({ planId, payload }: { planId: string; payload: T.AttachPlanKeyRequest }) =>
      apigwApi.attachUsagePlanKey(planId, payload),
    "toasts.usagePlanKeyAttached",
    "toasts.usagePlanKeyAttachFailed",
    ({ planId }) => [K.usagePlanKeys(planId), K.usagePlans],
  )
export const useDetachUsagePlanKey = () =>
  useAction(
    ({ planId, planKeyId }: { planId: string; planKeyId: string }) =>
      apigwApi.detachUsagePlanKey(planId, planKeyId),
    "toasts.usagePlanKeyDetached",
    "toasts.usagePlanKeyDetachFailed",
    ({ planId }) => [K.usagePlanKeys(planId), K.usagePlans],
  )
export const useUsagePlanAPIs = (id: string) =>
  useQuery({
    queryKey: K.usagePlanApis(id),
    queryFn: () => apigwApi.listUsagePlanAPIs(id),
    enabled: !!id,
  })
export const useAttachUsagePlanStage = () =>
  useAction(
    ({ planId, payload }: { planId: string; payload: T.AttachPlanStageRequest }) =>
      apigwApi.attachUsagePlanStage(planId, payload),
    "toasts.usagePlanStageAttached",
    "toasts.usagePlanStageAttachFailed",
    ({ planId }) => [K.usagePlanApis(planId), K.usagePlans],
  )
export const useDetachUsagePlanStage = () =>
  useAction(
    ({ planId, entryId }: { planId: string; entryId: string }) =>
      apigwApi.detachUsagePlanStage(planId, entryId),
    "toasts.usagePlanStageDetached",
    "toasts.usagePlanStageDetachFailed",
    ({ planId }) => [K.usagePlanApis(planId), K.usagePlans],
  )
