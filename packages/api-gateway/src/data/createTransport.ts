import type { ApiGatewayHttp, ApiGatewayRequest } from "./http"
import {
  apiKeyListSchema,
  apiKeySchema,
  apiListSchema,
  apiMappingListSchema,
  apiSchema,
  authorizerListSchema,
  deploymentListSchema,
  domainNameListSchema,
  domainNameSchema,
  integrationListSchema,
  modelListSchema,
  routeListSchema,
  stageListSchema,
  usagePlanApiListSchema,
  usagePlanKeyListSchema,
  usagePlanListSchema,
  usagePlanSchema,
} from "./schemas"
import type { ApiGatewayTransport } from "./transport"

/**
 * The transport every console shares, over an app-supplied adapter.
 *
 * This used to live in serverless-web. It moved here because none of it is
 * app-specific: the paths are the apigatewayv2 contract, the schemas are the
 * wire, and the error envelope is the control plane's. Two apps re-deriving all
 * of that would be two places for a path to go stale, and the second console
 * would find out at runtime.
 */

const apiPath = (apiId: string) => `/v2/apis/${encodeURIComponent(apiId)}`
const domainPath = (domainName: string) => `/v2/domainnames/${encodeURIComponent(domainName)}`

/**
 * Every list is fetched whole. These collections are tens of rows — an API has
 * a handful of stages, not a page of them — so paging the UI would add a
 * control for something nobody scrolls.
 */
const PAGE = { maxResults: 200 }

/**
 * Turns a non-2xx into an Error carrying the readable message.
 *
 * The /v2 surface answers `{"Type": "User"|"Service", "message": "..."}`, which
 * is the AWS shape rather than the control plane's `{error: {...}}` envelope.
 * The x-amzn-errortype header is the fallback: it names the class of failure
 * even when a proxy replaced the body with an HTML page, which beats surfacing
 * "Request failed with status code 502".
 */
function failure(status: number, data: unknown, headers: Record<string, unknown> | undefined) {
  const body = data as { message?: unknown; Message?: unknown } | undefined
  const message = body?.message ?? body?.Message
  if (typeof message === "string" && message !== "") return new Error(message)
  const type = headers?.["x-amzn-errortype"]
  if (typeof type === "string" && type !== "") return new Error(type)
  return new Error(`API Gateway request failed with status ${String(status)}`)
}

export function createApiGatewayTransport(http: ApiGatewayHttp): ApiGatewayTransport {
  /** Issues a request and returns its body, or throws a readable Error. */
  async function send(request: ApiGatewayRequest): Promise<unknown> {
    const response = await http(request)
    if (response.status < 200 || response.status >= 300) {
      throw failure(response.status, response.data, response.headers)
    }
    return response.data
  }

  const get = (path: string, query?: Record<string, string | number>) =>
    send({ method: "GET", path, query })
  const post = (path: string, body?: unknown) => send({ method: "POST", path, body })
  const patch = (path: string, body?: unknown) => send({ method: "PATCH", path, body })
  const remove = async (path: string) => {
    await send({ method: "DELETE", path })
  }

  return {
    listApis: async () => apiListSchema.parse(await get("/v2/apis", PAGE)).items,
    getApi: async (apiId) => apiSchema.parse(await get(apiPath(apiId))),
    createApi: async (input) =>
      apiSchema.parse(await post("/v2/apis", { protocolType: "HTTP", ...input })),
    updateApi: async (apiId, input) => apiSchema.parse(await patch(apiPath(apiId), input)),
    deleteApi: (apiId) => remove(apiPath(apiId)),

    listRoutes: async (apiId) =>
      routeListSchema.parse(await get(`${apiPath(apiId)}/routes`, PAGE)).items,
    createRoute: async (apiId, input) => {
      await post(`${apiPath(apiId)}/routes`, input)
    },
    updateRoute: async (apiId, routeId, input) => {
      await patch(`${apiPath(apiId)}/routes/${encodeURIComponent(routeId)}`, input)
    },
    deleteRoute: (apiId, routeId) =>
      remove(`${apiPath(apiId)}/routes/${encodeURIComponent(routeId)}`),

    listIntegrations: async (apiId) =>
      integrationListSchema.parse(await get(`${apiPath(apiId)}/integrations`, PAGE)).items,
    createIntegration: async (apiId, input) => {
      await post(`${apiPath(apiId)}/integrations`, input)
    },
    updateIntegration: async (apiId, integrationId, input) => {
      await patch(`${apiPath(apiId)}/integrations/${encodeURIComponent(integrationId)}`, input)
    },
    deleteIntegration: (apiId, integrationId) =>
      remove(`${apiPath(apiId)}/integrations/${encodeURIComponent(integrationId)}`),

    // Stages are addressed by NAME on this surface, which is why they carry no id.
    listStages: async (apiId) =>
      stageListSchema.parse(await get(`${apiPath(apiId)}/stages`, PAGE)).items,
    createStage: async (apiId, input) => {
      await post(`${apiPath(apiId)}/stages`, input)
    },
    updateStage: async (apiId, stageName, input) => {
      await patch(`${apiPath(apiId)}/stages/${encodeURIComponent(stageName)}`, input)
    },
    deleteStage: (apiId, stageName) =>
      remove(`${apiPath(apiId)}/stages/${encodeURIComponent(stageName)}`),

    listDeployments: async (apiId) =>
      deploymentListSchema.parse(await get(`${apiPath(apiId)}/deployments`, PAGE)).items,
    createDeployment: async (apiId, input) => {
      await post(`${apiPath(apiId)}/deployments`, input)
    },

    listAuthorizers: async (apiId) =>
      authorizerListSchema.parse(await get(`${apiPath(apiId)}/authorizers`, PAGE)).items,
    createAuthorizer: async (apiId, input) => {
      await post(`${apiPath(apiId)}/authorizers`, input)
    },
    deleteAuthorizer: (apiId, authorizerId) =>
      remove(`${apiPath(apiId)}/authorizers/${encodeURIComponent(authorizerId)}`),

    listDomainNames: async () =>
      domainNameListSchema.parse(await get("/v2/domainnames", PAGE)).items,
    createDomainName: async ({ domainName, ...config }) =>
      domainNameSchema.parse(
        await post("/v2/domainnames", {
          domainName,
          // The wire takes a LIST because one domain can carry several
          // configurations upstream; this platform stores one and refuses more.
          domainNameConfigurations: [config],
        }),
      ),
    deleteDomainName: (domainName) => remove(domainPath(domainName)),

    listApiMappings: async (domainName) =>
      apiMappingListSchema.parse(await get(`${domainPath(domainName)}/apimappings`, PAGE)).items,
    createApiMapping: async (domainName, input) => {
      await post(`${domainPath(domainName)}/apimappings`, input)
    },
    deleteApiMapping: (domainName, apiMappingId) =>
      remove(`${domainPath(domainName)}/apimappings/${encodeURIComponent(apiMappingId)}`),

    // ── Platform extensions ───────────────────────────────────────────────

    listApiKeys: async () => apiKeyListSchema.parse(await get("/v2/apikeys", PAGE)).items,
    createApiKey: async (input) => apiKeySchema.parse(await post("/v2/apikeys", input)),
    updateApiKey: async (apiKeyId, input) =>
      apiKeySchema.parse(await patch(`/v2/apikeys/${encodeURIComponent(apiKeyId)}`, input)),
    deleteApiKey: (apiKeyId) => remove(`/v2/apikeys/${encodeURIComponent(apiKeyId)}`),
    revealApiKey: async (apiKeyId) => {
      const body = (await get(`/v2/apikeys/${encodeURIComponent(apiKeyId)}/value`)) as {
        value?: string
      }
      return body.value ?? ""
    },

    listUsagePlans: async () =>
      usagePlanListSchema.parse(await get("/v2/usageplans", PAGE)).items,
    createUsagePlan: async (input) => usagePlanSchema.parse(await post("/v2/usageplans", input)),
    updateUsagePlan: async (usagePlanId, input) =>
      usagePlanSchema.parse(await patch(`/v2/usageplans/${encodeURIComponent(usagePlanId)}`, input)),
    deleteUsagePlan: (usagePlanId) => remove(`/v2/usageplans/${encodeURIComponent(usagePlanId)}`),

    listUsagePlanKeys: async (usagePlanId) =>
      usagePlanKeyListSchema.parse(
        await get(`/v2/usageplans/${encodeURIComponent(usagePlanId)}/keys`, PAGE),
      ).items,
    attachUsagePlanKey: async (usagePlanId, apiKeyId) => {
      await post(`/v2/usageplans/${encodeURIComponent(usagePlanId)}/keys`, { apiKeyId })
    },
    detachUsagePlanKey: (usagePlanId, planKeyId) =>
      remove(
        `/v2/usageplans/${encodeURIComponent(usagePlanId)}/keys/${encodeURIComponent(planKeyId)}`,
      ),

    listUsagePlanApis: async (usagePlanId) =>
      usagePlanApiListSchema.parse(
        await get(`/v2/usageplans/${encodeURIComponent(usagePlanId)}/apis`, PAGE),
      ).items,
    attachUsagePlanApi: async (usagePlanId, apiId, stage) => {
      await post(`/v2/usageplans/${encodeURIComponent(usagePlanId)}/apis`, { apiId, stage })
    },
    detachUsagePlanApi: (usagePlanId, entryId) =>
      remove(
        `/v2/usageplans/${encodeURIComponent(usagePlanId)}/apis/${encodeURIComponent(entryId)}`,
      ),

    listModels: async (apiId) =>
      modelListSchema.parse(await get(`${apiPath(apiId)}/models`, PAGE)).items,
    createModel: async (apiId, input) => {
      await post(`${apiPath(apiId)}/models`, input)
    },
    deleteModel: (apiId, modelId) =>
      remove(`${apiPath(apiId)}/models/${encodeURIComponent(modelId)}`),

    exportApi: (apiId) => get(`${apiPath(apiId)}/export`),
  }
}
