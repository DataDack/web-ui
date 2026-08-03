import { z } from "zod"

// Zod schemas mirror the control plane's native /v1 responses. Every field the
// console reads is validated at the boundary, so a backend change surfaces as a
// parse error next to the request rather than as `undefined` deep in a cell.
//
// Unknown keys pass through: the API sends far more than the lists render, and
// failing on additions would break the console on every backend release.

export const codeArtifactSchema = z.object({
  bucket: z.string().optional(),
  key: z.string(),
  sha256: z.string().optional(),
  sizeBytes: z.number().optional(),
  source: z.string().optional(),
})

export const layerRefSchema = z.object({
  name: z.string(),
  version: z.number(),
  arn: z.string().optional(),
})

export const functionVersionSchema = z.object({
  version: z.string(),
  versionNumber: z.number().optional(),
  codeSha256: z.string().optional(),
  codeArtifact: codeArtifactSchema.nullish(),
  createdAt: z.string().optional(),
})

export const functionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  namespace: z.string(),
  region: z.string(),
  name: z.string(),
  functionArn: z.string().optional(),
  packageType: z.string(),
  imageUri: z.string().optional(),
  runtime: z.string().optional(),
  handler: z.string().optional(),
  architecture: z.string().optional(),
  runtimeMode: z.string().optional(),
  memorySize: z.number().optional(),
  timeout: z.number().optional(),
  reservedConcurrency: z.number().optional(),
  layers: z.array(layerRefSchema).optional(),
  env: z.record(z.string(), z.string()).optional(),
  state: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: functionVersionSchema.optional(),
})

export const workerSchema = z.object({
  id: z.string(),
  region: z.string(),
  zone: z.string().optional(),
  hostname: z.string(),
  internalIp: z.string().optional(),
  backend: z.string().optional(),
  architecture: z.string().optional(),
  state: z.string(),
  capacityMemoryMb: z.number().optional(),
  capacityVcpuMillis: z.number().optional(),
  capacityMaxSandboxes: z.number().optional(),
  capabilities: z.array(z.string()).optional(),
  supportedRuntimes: z.array(z.string()).optional(),
  lastHeartbeatAt: z.string().optional(),
  createdAt: z.string().optional(),
})

export const layerVersionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  layerArn: z.string().optional(),
  description: z.string().optional(),
  codeArtifact: codeArtifactSchema.nullish(),
  compatibleRuntimes: z.array(z.string()).optional(),
  compatibleArchitectures: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
})

export const dashboardSchema = z.object({
  status: z.string(),
  generatedAt: z.string().optional(),
  summary: z.record(z.string(), z.number()).default({}),
  detail: z
    .object({
      functions: z.array(functionSchema).default([]),
      workers: z.array(workerSchema).default([]),
      layers: z.array(layerVersionSchema).default([]),
    })
    .default({ functions: [], workers: [], layers: [] }),
})

// ── Observability ────────────────────────────────────────────────────────────

export const logLineSchema = z.object({
  sequence: z.number(),
  accountId: z.string().optional(),
  namespace: z.string().optional(),
  functionName: z.string().optional(),
  functionVersion: z.string().optional(),
  requestId: z.string().optional(),
  workerId: z.string().optional(),
  sandboxId: z.string().optional(),
  stream: z.string(),
  level: z.string().optional(),
  message: z.string(),
  timestamp: z.string(),
})

export const logSnapshotSchema = z.object({
  lines: z.array(logLineSchema).default([]),
  count: z.number().default(0),
  latestSequence: z.number().default(0),
})

export const metricBucketSchema = z.object({
  timestamp: z.string(),
  invocations: z.number(),
  errors: z.number(),
  throttles: z.number(),
  coldStarts: z.number(),
  avgDurationMs: z.number(),
  p50DurationMs: z.number(),
  p95DurationMs: z.number(),
  p99DurationMs: z.number(),
  maxDurationMs: z.number(),
  gbSeconds: z.number(),
  samples: z.number(),
  avgCpuSeconds: z.number(),
  avgMemoryMb: z.number(),
  peakMemoryMb: z.number(),
  avgInflight: z.number(),
  peakInflight: z.number(),
})

export const metricSeriesSchema = z.object({
  since: z.string(),
  until: z.string(),
  stepSeconds: z.number(),
  functionName: z.string().optional(),
  buckets: z.array(metricBucketSchema).default([]),
  totals: z.object({
    invocations: z.number(),
    errors: z.number(),
    errorRate: z.number(),
    coldStarts: z.number(),
    coldStartRate: z.number(),
    avgDurationMs: z.number(),
    p50DurationMs: z.number(),
    p95DurationMs: z.number(),
    p99DurationMs: z.number(),
    maxDurationMs: z.number(),
    gbSeconds: z.number(),
  }),
  topFunctions: z
    .array(
      z.object({
        functionName: z.string(),
        invocations: z.number(),
        errors: z.number(),
        avgDurationMs: z.number(),
        p95DurationMs: z.number(),
        gbSeconds: z.number(),
      }),
    )
    .default([]),
  truncated: z.boolean().default(false),
})

export const auditEventSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  principalId: z.string(),
  principalType: z.string().optional(),
  method: z.string(),
  path: z.string(),
  route: z.string().optional(),
  action: z.string(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),
  statusCode: z.number(),
  outcome: z.string(),
  error: z.string().optional(),
  sourceIp: z.string().optional(),
  userAgent: z.string().optional(),
  durationMs: z.number(),
  occurredAt: z.string(),
})

export const auditListSchema = z.object({
  events: z.array(auditEventSchema).default([]),
  count: z.number().default(0),
})

export const tenantSchema = z.object({
  accountId: z.string(),
  namespaces: z.array(z.string()).default([]),
  functions: z.number().default(0),
  layers: z.number().default(0),
  triggers: z.number().default(0),
})

export const tenantListSchema = z.object({
  accounts: z.array(tenantSchema).default([]),
  current: z.string().default(""),
  // switchable is false when the credential is pinned to one account, in which
  // case the console hides the switcher rather than offering a no-op control.
  switchable: z.boolean().default(false),
})

/**
 * Who the control plane thinks is calling.
 *
 * `authenticated` false with `principalType` "anonymous" is a deployment with
 * auth switched off, not a signed-out operator — the console renders normally
 * and hides sign-out rather than bouncing to a login form nothing would accept.
 */
export const sessionSchema = z.object({
  authenticated: z.boolean().default(false),
  principalId: z.string().default(""),
  principalType: z.string().default(""),
  email: z.string().default(""),
  accountId: z.string().default(""),
  scopes: z.array(z.string()).default([]),
  platformAdmin: z.boolean().default(false),
  expiresAt: z.string().optional(),
})

export type CodeArtifact = z.infer<typeof codeArtifactSchema>
export type LayerRef = z.infer<typeof layerRefSchema>
export type FunctionEntity = z.infer<typeof functionSchema>
export type Worker = z.infer<typeof workerSchema>
export type LayerVersion = z.infer<typeof layerVersionSchema>
export type Dashboard = z.infer<typeof dashboardSchema>
export type LogLine = z.infer<typeof logLineSchema>
export type LogSnapshot = z.infer<typeof logSnapshotSchema>
export type MetricBucket = z.infer<typeof metricBucketSchema>
export type MetricSeries = z.infer<typeof metricSeriesSchema>
export type AuditEvent = z.infer<typeof auditEventSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type TenantList = z.infer<typeof tenantListSchema>
export type Session = z.infer<typeof sessionSchema>
