import { z } from "zod"

/**
 * The apigatewayv2 wire shapes, as the control plane serves them.
 *
 * These mirror AWS, not this console. Every field is camelCase because that is
 * what /v2 answers with, and the ids are the ten-character public ones rather
 * than the platform's internal UUIDs — an SDK, this console and Terraform all
 * address a row the same way, and a console that used the private id would be
 * the one client whose links nobody else could follow.
 *
 * Unknown keys pass through, as everywhere else here: the surface returns more
 * than any one screen renders, and failing on an addition would break the
 * console on a backend release that added a field it does not read.
 */

/** Absent means CORS is off. An empty object means on and allowing nothing. */
export const corsConfigurationSchema = z.object({
  allowOrigins: z.array(z.string()).default([]),
  allowMethods: z.array(z.string()).default([]),
  allowHeaders: z.array(z.string()).default([]),
  exposeHeaders: z.array(z.string()).default([]),
  maxAge: z.number().default(0),
  allowCredentials: z.boolean().default(false),
})

export const apiSchema = z.object({
  apiId: z.string(),
  name: z.string().default(""),
  description: z.string().default(""),
  version: z.string().default(""),
  protocolType: z.string().default("HTTP"),
  apiEndpoint: z.string().default(""),
  routeSelectionExpression: z.string().default(""),
  apiKeySelectionExpression: z.string().default(""),
  disableExecuteApiEndpoint: z.boolean().default(false),
  corsConfiguration: corsConfigurationSchema.nullish(),
  createdDate: z.string().default(""),
  tags: z.record(z.string(), z.string()).default({}),
})

export const routeSchema = z.object({
  routeId: z.string(),
  routeKey: z.string().default(""),
  /** "integrations/{integrationId}", or absent when nothing is attached. */
  target: z.string().default(""),
  operationName: z.string().default(""),
  authorizationType: z.string().default("NONE"),
  authorizerId: z.string().default(""),
  authorizationScopes: z.array(z.string()).default([]),
  apiKeyRequired: z.boolean().default(false),
  /** Set on a row the service created itself; AWS refuses to delete one. */
  apiGatewayManaged: z.boolean().default(false),
})

export const integrationSchema = z.object({
  integrationId: z.string(),
  integrationType: z.string().default(""),
  integrationUri: z.string().default(""),
  integrationMethod: z.string().default(""),
  integrationSubtype: z.string().default(""),
  description: z.string().default(""),
  connectionType: z.string().default("INTERNET"),
  payloadFormatVersion: z.string().default(""),
  timeoutInMillis: z.number().default(0),
  credentialsArn: z.string().default(""),
  /**
   * A platform field, not an AWS one: LAMBDA | LOAD_BALANCER | HTTP | MOCK.
   * AWS's integrationType cannot say whether a URI is a function or a load
   * balancer — both are reached over HTTP — and this is what the console
   * renders an icon from.
   */
  "x-datadack-targetKind": z.string().default("HTTP"),
})

export const routeSettingsSchema = z.object({
  throttlingRateLimit: z.number().optional(),
  throttlingBurstLimit: z.number().optional(),
  detailedMetricsEnabled: z.boolean().optional(),
  loggingLevel: z.string().optional(),
  dataTraceEnabled: z.boolean().optional(),
})

export const stageSchema = z.object({
  /** Stages are addressed by NAME on this surface; they carry no id. */
  stageName: z.string(),
  description: z.string().default(""),
  deploymentId: z.string().default(""),
  autoDeploy: z.boolean().default(false),
  stageVariables: z.record(z.string(), z.string()).default({}),
  defaultRouteSettings: routeSettingsSchema.nullish(),
  lastDeploymentStatusMessage: z.string().default(""),
  createdDate: z.string().default(""),
  lastUpdatedDate: z.string().default(""),
  tags: z.record(z.string(), z.string()).default({}),
})

export const deploymentSchema = z.object({
  deploymentId: z.string(),
  description: z.string().default(""),
  deploymentStatus: z.string().default(""),
  deploymentStatusMessage: z.string().default(""),
  autoDeployed: z.boolean().default(false),
  createdDate: z.string().default(""),
})

export const authorizerSchema = z.object({
  authorizerId: z.string(),
  name: z.string().default(""),
  authorizerType: z.string().default(""),
  identitySource: z.array(z.string()).default([]),
  jwtConfiguration: z
    .object({
      issuer: z.string().default(""),
      audience: z.array(z.string()).default([]),
    })
    .nullish(),
  authorizerUri: z.string().default(""),
  authorizerResultTtlInSeconds: z.number().default(0),
})

/** AWS reports a LIST even where this platform stores one configuration. */
export const domainNameConfigurationSchema = z.object({
  apiGatewayDomainName: z.string().default(""),
  certificateArn: z.string().default(""),
  endpointType: z.string().default(""),
  hostedZoneId: z.string().default(""),
  securityPolicy: z.string().default(""),
  domainNameStatus: z.string().default(""),
  domainNameStatusMessage: z.string().default(""),
  ipAddressType: z.string().default(""),
})

export const domainNameSchema = z.object({
  /** Custom domains are addressed by the hostname itself. */
  domainName: z.string(),
  apiMappingSelectionExpression: z.string().default(""),
  domainNameConfigurations: z.array(domainNameConfigurationSchema).default([]),
  tags: z.record(z.string(), z.string()).default({}),
})

export const apiMappingSchema = z.object({
  apiMappingId: z.string(),
  apiId: z.string().default(""),
  /** The stage NAME, not an id. */
  stage: z.string().default(""),
  apiMappingKey: z.string().default(""),
})

// ── Platform extensions ───────────────────────────────────────────────────
//
// Models, API keys and usage plans are not apigatewayv2 resources — that
// contract has no equivalent — but the product has them and the console manages
// them. They are served in v2's shape so one reader learns one style.

export const apiKeySchema = z.object({
  apiKeyId: z.string(),
  name: z.string().default(""),
  description: z.string().default(""),
  enabled: z.boolean().default(true),
  customerId: z.string().default(""),
  maskedValue: z.string().default(""),
  createdDate: z.string().default(""),
  /**
   * Present on CREATE and on the explicit reveal, and on nothing else. Optional
   * rather than defaulted to "": a UI must be able to tell "not returned" from
   * "returned empty", because only the first is normal.
   */
  value: z.string().optional(),
  tags: z.record(z.string(), z.string()).default({}),
})

/** Absent means unthrottled. Zero would read as "no requests allowed". */
export const throttleSchema = z.object({
  rateLimit: z.number().default(0),
  burstLimit: z.number().default(0),
})

/** Absent means unlimited, for the same reason. */
export const quotaSchema = z.object({
  limit: z.number().default(0),
  period: z.string().default("MONTH"),
  offset: z.number().default(0),
})

export const usagePlanSchema = z.object({
  usagePlanId: z.string(),
  name: z.string().default(""),
  description: z.string().default(""),
  throttle: throttleSchema.nullish(),
  quota: quotaSchema.nullish(),
  productCode: z.string().default(""),
  createdDate: z.string().default(""),
  tags: z.record(z.string(), z.string()).default({}),
})

export const usagePlanKeySchema = z.object({
  id: z.string(),
  apiKeyId: z.string().default(""),
})

export const usagePlanApiSchema = z.object({
  id: z.string(),
  apiId: z.string().default(""),
  /** The stage NAME, matching how the rest of the surface addresses one. */
  stage: z.string().default(""),
})

export const modelSchema = z.object({
  modelId: z.string(),
  name: z.string().default(""),
  description: z.string().default(""),
  contentType: z.string().default("application/json"),
  schema: z.string().default(""),
})

/**
 * The collection envelope. `nextToken` is opaque and absent on the last page —
 * its absence is how a caller knows to stop, so it must not be defaulted to "".
 */
function listOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item).default([]),
    nextToken: z.string().optional(),
  })
}

export const apiListSchema = listOf(apiSchema)
export const routeListSchema = listOf(routeSchema)
export const integrationListSchema = listOf(integrationSchema)
export const stageListSchema = listOf(stageSchema)
export const deploymentListSchema = listOf(deploymentSchema)
export const authorizerListSchema = listOf(authorizerSchema)
export const domainNameListSchema = listOf(domainNameSchema)
export const apiMappingListSchema = listOf(apiMappingSchema)
export const apiKeyListSchema = listOf(apiKeySchema)
export const usagePlanListSchema = listOf(usagePlanSchema)
export const usagePlanKeyListSchema = listOf(usagePlanKeySchema)
export const usagePlanApiListSchema = listOf(usagePlanApiSchema)
export const modelListSchema = listOf(modelSchema)

export type Api = z.infer<typeof apiSchema>
export type ApiRoute = z.infer<typeof routeSchema>
export type Integration = z.infer<typeof integrationSchema>
export type Stage = z.infer<typeof stageSchema>
export type Deployment = z.infer<typeof deploymentSchema>
export type Authorizer = z.infer<typeof authorizerSchema>
export type DomainName = z.infer<typeof domainNameSchema>
export type ApiMapping = z.infer<typeof apiMappingSchema>
export type CorsConfiguration = z.infer<typeof corsConfigurationSchema>
export type ApiKey = z.infer<typeof apiKeySchema>
export type UsagePlan = z.infer<typeof usagePlanSchema>
export type UsagePlanKey = z.infer<typeof usagePlanKeySchema>
export type UsagePlanApi = z.infer<typeof usagePlanApiSchema>
export type Model = z.infer<typeof modelSchema>
