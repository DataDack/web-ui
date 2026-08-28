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
  // Grouping is resourceGroupId, owned by the central platform. Omitted by the
  // API when unset, so optional rather than defaulted.
  resourceGroupId: z.string().optional(),
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
  // "function", "workflow" or "app". Absent on rows written before the column
  // existed, which are functions — the same default the control plane applies.
  kind: z.string().default("function"),
})

// ── Fleet telemetry ──────────────────────────────────────────────────────────
// The cluster view the control plane keeps IN MEMORY over a rolling window. It
// says so itself in `persisted`, and the console renders that rather than hiding
// it: a number that vanishes on restart must not be mistaken for a record.

export const hostStatsSchema = z.object({
  cpuPercent: z.number().optional(),
  loadAverage1: z.number().optional(),
  netRxBytes: z.number().optional(),
  netTxBytes: z.number().optional(),
  netRxBytesPerSec: z.number().optional(),
  netTxBytesPerSec: z.number().optional(),
  diskTotalMb: z.number().optional(),
  diskFreeMb: z.number().optional(),
})

export const nodeViewSchema = z.object({
  nodeId: z.string(),
  hostname: z.string(),
  // "worker" or "gateway" — both report into one view, because an operator
  // asking whether the cluster is healthy means the whole cluster.
  role: z.string().default("worker"),
  state: z.string().default(""),
  lastSeen: z.string().optional(),
  secondsSinceSeen: z.number().optional(),
  totalMemoryMb: z.number().optional(),
  freeMemoryMb: z.number().optional(),
  allocMemoryMb: z.number().optional(),
  sandboxCount: z.number().optional(),
  cpuCount: z.number().optional(),
  host: hostStatsSchema.optional(),
  samples: z.number().optional(),
})

export const clusterViewSchema = z.object({
  at: z.string(),
  window: z.string(),
  reportingNodes: z.number().default(0),
  reportingWorkers: z.number().default(0),
  reportingGateways: z.number().default(0),
  totalMemoryMb: z.number().default(0),
  freeMemoryMb: z.number().default(0),
  allocMemoryMb: z.number().default(0),
  sandboxCount: z.number().default(0),
  cpuCount: z.number().default(0),
  cpuPercent: z.number().default(0),
  loadAverage1: z.number().default(0),
  netRxBytesPerSec: z.number().default(0),
  netTxBytesPerSec: z.number().default(0),
  diskTotalMb: z.number().default(0),
  diskFreeMb: z.number().default(0),
  nodes: z.array(nodeViewSchema).default([]),
  persisted: z.boolean().default(false),
})

export const seriesPointSchema = z.object({
  at: z.string(),
  cpuPercent: z.number().default(0),
  loadAverage1: z.number().default(0),
  freeMemoryMb: z.number().default(0),
  allocMemoryMb: z.number().default(0),
  sandboxCount: z.number().default(0),
  netRxBytesPerSec: z.number().default(0),
  netTxBytesPerSec: z.number().default(0),
  diskFreeMb: z.number().default(0),
  state: z.string().default(""),
})

export const nodeDetailSchema = nodeViewSchema.extend({
  at: z.string(),
  window: z.string(),
  // Oldest first, so a chart plots it without reversing.
  series: z.array(seriesPointSchema).default([]),
  persisted: z.boolean().default(false),
})

// ── Workloads ────────────────────────────────────────────────────────────────
// The operator listing, which shows all three kinds. Separate from the function
// surface, which hides managed apps and must keep hiding them.

export const workloadKinds = ["function", "workflow", "app"] as const
export type WorkloadKind = (typeof workloadKinds)[number]

export const workloadSchema = z.object({
  kind: z.string(),
  name: z.string(),
  accountId: z.string().optional(),
  resourceGroupId: z.string().optional(),
  packageType: z.string().optional(),
  runtime: z.string().optional(),
  runtimeMode: z.string().optional(),
  handler: z.string().optional(),
  state: z.string().optional(),
  memorySizeMb: z.number().optional(),
  timeoutSec: z.number().optional(),
  version: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const workloadListSchema = z.object({
  workloads: z.array(workloadSchema).default([]),
  // Counted BEFORE the filter, so the tab badges describe the fleet rather than
  // the current view.
  counts: z.record(z.string(), z.number()).default({}),
  total: z.number().default(0),
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
  resourceGroupIds: z.array(z.string()).default([]),
  functions: z.number().default(0),
  layers: z.number().default(0),
  triggers: z.number().default(0),
})

export const tenantListSchema = z.object({
  accounts: z.array(tenantSchema).default([]),
  current: z.string().default(""),
  // switchable is false when the credential is pinned to one account, in which
  // case the console still renders the switcher but disables it, so the pinning
  // is visible rather than indistinguishable from a missing control.
  switchable: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// The platform domain registry.
//
// snake_case, unlike everything above it: these rows are the registry's own table
// serialized directly, and the field names are the column names. The console reads
// them as they come rather than renaming, so a field is greppable across the two
// services and the wire shape has one spelling.

/** A custom domain's proof-of-ownership progress. Absent on platform-minted rows. */
export const domainVerificationSchema = z.object({
  verified: z.boolean().default(false),
  verified_at: z.string().optional(),
  last_checked_at: z.string().optional(),
  attempts: z.number().default(0),
  last_error: z.string().optional(),
})

/** What a tenant publishes in their own DNS. Absent until a challenge is minted. */
export const domainDnsInstructionsSchema = z.object({
  txt_name: z.string().default(""),
  txt_value: z.string().default(""),
  cname_name: z.string().default(""),
  cname_target: z.string().default(""),
  a_name: z.string().default(""),
  a_value: z.string().default(""),
  is_apex: z.boolean().default(false),
})

export const domainSchema = z.object({
  hostname: z.string(),
  label: z.string().default(""),
  zone: z.string().default(""),
  /** func | vm | lb | app. */
  type: z.string().default(""),
  /**
   * true when the platform minted this name, false when a tenant brought their own.
   * There is no "custom" TYPE — custom IS managed=false, and the filter tabs ride
   * this rather than a fifth type value.
   */
  managed: z.boolean().default(true),
  /** uuid.Nil ("00000000-…") is a real value here: it is the platform's own rows. */
  account_id: z.string().default(""),
  resource_group_id: z.string().nullish(),
  region: z.string().default(""),
  resource_type: z.string().default(""),
  resource_id: z.string().default(""),
  /** Exactly one hostname per resource is its canonical address. */
  is_primary: z.boolean().default(false),
  /** invoke | proxy_http | dns_a — what the EDGE does, not what the resource is. */
  target: z.string().default(""),
  public_ip: z.string().default(""),
  private_ip: z.string().default(""),
  port: z.number().default(0),
  function_name: z.string().default(""),
  function_qualifier: z.string().default(""),
  auth_type: z.string().default(""),
  endpoint: z.string().default(""),
  /** pending | active | suspended | released. */
  status: z.string().default(""),
  status_reason: z.string().optional(),
  /** wildcard | record | none. */
  dns_mode: z.string().default(""),
  /**
   * What the DNS reconciler LAST WROTE — never what it should write. For a
   * dns_mode=record name (vm, lb) an empty value means no record exists yet, so the
   * hostname resolves nowhere even while the row reads active. See resolves().
   */
  dns_synced_ip: z.string().optional(),
  dns_synced_at: z.string().optional(),
  dns_error: z.string().optional(),
  created_at: z.string().default(""),
  updated_at: z.string().default(""),
  verification: domainVerificationSchema.optional(),
  dns_instructions: domainDnsInstructionsSchema.optional(),
})

export const domainListSchema = z.object({
  domains: z.array(domainSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(50),
})

/** One account the signed-in operator belongs to, per the identity service. */
export const sessionAccountSchema = z.object({
  id: z.string(),
  accountNumber: z.string().default(""),
  name: z.string().default(""),
  status: z.string().default(""),
  isOwner: z.boolean().default(false),
  memberRole: z.string().default(""),
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
  name: z.string().default(""),
  accountId: z.string().default(""),
  scopes: z.array(z.string()).default([]),
  platformAdmin: z.boolean().default(false),
  expiresAt: z.string().optional(),
  // Sourced from the identity service, so it lists every account the operator
  // is a member of — including ones that have never deployed a function and so
  // are invisible to the control plane's own tenant list.
  accounts: z.array(sessionAccountSchema).default([]),
})

export type CodeArtifact = z.infer<typeof codeArtifactSchema>
export type LayerRef = z.infer<typeof layerRefSchema>
export type FunctionEntity = z.infer<typeof functionSchema>
export type Worker = z.infer<typeof workerSchema>
export type LayerVersion = z.infer<typeof layerVersionSchema>
export type Dashboard = z.infer<typeof dashboardSchema>
export type HostStats = z.infer<typeof hostStatsSchema>
export type NodeView = z.infer<typeof nodeViewSchema>
export type ClusterView = z.infer<typeof clusterViewSchema>
export type NodeDetail = z.infer<typeof nodeDetailSchema>
export type SeriesPoint = z.infer<typeof seriesPointSchema>
export type Workload = z.infer<typeof workloadSchema>
export type WorkloadList = z.infer<typeof workloadListSchema>
export type LogLine = z.infer<typeof logLineSchema>
export type LogSnapshot = z.infer<typeof logSnapshotSchema>
export type MetricBucket = z.infer<typeof metricBucketSchema>
export type MetricSeries = z.infer<typeof metricSeriesSchema>
export type AuditEvent = z.infer<typeof auditEventSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type TenantList = z.infer<typeof tenantListSchema>
export type Domain = z.infer<typeof domainSchema>
export type DomainList = z.infer<typeof domainListSchema>
export type DomainVerification = z.infer<typeof domainVerificationSchema>
export type DomainDnsInstructions = z.infer<typeof domainDnsInstructionsSchema>
export type Session = z.infer<typeof sessionSchema>
export type SessionAccount = z.infer<typeof sessionAccountSchema>
