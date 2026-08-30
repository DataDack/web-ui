/**
 * The FaaS domain types both consoles speak.
 *
 * These were duplicated in cloud-react (`serverless.types.ts`) and
 * serverless-web (`studio/lib/schemas.ts`) — field for field identical, because
 * both describe the same control-plane payloads. One copy here is what lets the
 * shared create UI and its hooks be written once.
 */

/** One entry of the control plane's runtime catalog (GET /v1/runtimes). */
export interface RuntimeInfo {
  name: string
  family: string
  languageVersion?: string
  osRelease: string
  architectures: string[]
  handlerFormat: string
  handlerRequired: boolean
  /** True when the artifact must carry its own RIC and a `bootstrap` binary. */
  bundledRic: boolean
  deprecatedForCreate: boolean
  deprecatedForUpdate: boolean
  /**
   * The platform cannot honour this runtime yet — no worker installs an
   * interpreter matching the version its name claims. Existing functions on it
   * keep working; it is only withheld from the create picker.
   *
   * `GET /v1/runtimes` already omits these, so this is false on every runtime a
   * console normally receives. It is only ever true under `?includeHidden=true`,
   * which is for operator views.
   */
  hidden: boolean
  successorRuntime?: string
}

/** A file in a starter template, as the control plane's zipper expects it. */
export interface TemplateFile {
  path: string
  content: string
}

/** Starter source for a new function, keyed by runtime family. */
export interface StarterTemplate {
  handler: string
  files: TemplateFile[]
}

/** Where a function's code comes from. */
export type PackageType = "zip" | "image" | "blank"

/** An uploaded archive in the artifact store, as the presign step returns it. */
export interface ArtifactRef {
  bucket: string
  key: string
}

/**
 * Create-from-source: the control plane zips `files` server-side. The only
 * path serverless-web has ever used, and cloud-react's "Blank" option.
 */
export interface CreateFromSourceInput {
  name: string
  /**
   * The central resource group the function belongs to. Optional because not
   * every host has one to give: the admin console can run against a control
   * plane with no central at all. Omitted rather than sent empty — the control
   * plane rejects unknown fields but treats an absent one as "no group".
   */
  resourceGroupId?: string
  runtime: string
  handler: string
  architecture?: string
  memorySize?: number
  timeout?: number
  env?: Record<string, string>
  files: TemplateFile[]
}

/**
 * Create from a package that already exists: an uploaded zip or a container
 * image. `runtime`/`handler`/`architecture` do not apply to an image, which
 * carries its own entrypoint.
 */
export interface CreateFromPackageInput {
  name: string
  packageType: Exclude<PackageType, "blank">
  memorySize: number
  timeout: number
  imageUri?: string
  codeArtifact?: ArtifactRef
  runtime?: string
  handler?: string
  architecture?: string
  env?: Record<string, string>
}

/** What the create call resolves to — enough to route to the new function. */
export interface CreatedFunction {
  name: string
}

export interface CodeArtifact {
  bucket?: string
  key: string
  sha256?: string
  sizeBytes?: number
  source?: string
}
export interface LayerRef {
  name: string
  version: number
  arn?: string
}

/** One publishable layer version, as the layers list returns it. */
export interface LayerVersionSummary {
  /** Present on the native listing; absent when a caller only had {name, version}. */
  id?: string
  name: string
  version: number
  description?: string
  /** Carries sizeBytes, which is the only size a layer listing can show. */
  codeArtifact?: CodeArtifact | null
  compatibleRuntimes?: string[]
  compatibleArchitectures?: string[]
  createdAt?: string
}

export interface FunctionVersion {
  version: string
  versionNumber?: number
  description?: string
  codeSha256?: string
  codeArtifact?: CodeArtifact | null
  createdAt?: string
}

/**
 * A hostname that invokes a function. The Lambda API addresses a function by
 * name in a signed request; a function URL is the other way in — an HTTPS
 * endpoint an ordinary client can call.
 */
export interface FunctionUrl {
  domain: string
  accountId?: string
  functionName: string
  /** Pins a version or alias. Absent targets $LATEST. */
  qualifier?: string
  /** "NONE" is public; "AWS_IAM" requires the caller to sign. */
  authType: string
  /** Parked: the mapping is kept so nobody else can claim the hostname. */
  disabled?: boolean
  /** True when the platform minted this domain from the function name. */
  generated?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FunctionEntity {
  id?: string
  accountId?: string
  name: string
  resourceGroupId?: string
  region?: string
  functionArn?: string
  packageType: string
  imageUri?: string
  runtime?: string
  runtimeMode?: string
  handler?: string
  architecture?: string
  memorySize?: number
  timeout?: number
  ephemeralStorageMb?: number
  description?: string
  reservedConcurrency?: number
  provisionedConcurrency?: number
  maxRetryAttempts?: number
  maxEventAgeSeconds?: number
  layers?: LayerRef[]
  env?: Record<string, string>
  labels?: Record<string, string>
  state: string
  version?: FunctionVersion
  createdAt?: string
  updatedAt?: string
}

/** Lifecycle event from the FaaS events webhook, stored per-account. */
export interface ActivityEvent {
  type: string
  function?: string
  region?: string
  at?: string
}

/** A new layer version. The archive is uploaded first; this references it. */
export interface PublishLayerInput {
  name: string
  description?: string
  codeArtifact: { bucket: string; key: string }
  compatibleRuntimes?: string[]
  compatibleArchitectures?: string[]
  region?: string
}

export interface FunctionAlias {
  name: string
  functionVersion: string
  additionalVersionWeights?: Record<string, number>
  description?: string
  state?: string
  revisionId?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * What creating a function URL asks for. Every field is optional: the common
 * case is "give this function a hostname", and the control plane mints
 * `{function}-{accountId}` under its base domain when `domain` is omitted.
 */
export interface CreateFunctionUrlInput {
  /** A custom hostname to map. Omit to have the platform generate one. */
  domain?: string
  /** "NONE" is public; "AWS_IAM" requires the caller to sign. Defaults to NONE. */
  authType?: string
  /** Pins a version or alias. Omit to target $LATEST. */
  qualifier?: string
}

/**
 * The body of a "create version" call. Everything about the version's content
 * comes from what is deployed right now, so the only thing worth supplying is
 * a note about why this state was worth keeping.
 */
export interface CreateVersionInput {
  description?: string
}

export interface PutAliasInput {
  name: string
  functionVersion: string
  description?: string
  additionalVersionWeights?: Record<string, number>
}

export interface Trigger {
  id: string
  type: string
  name?: string
  functionName: string
  state?: string
  schedule?: string
  intervalSeconds?: number
  sourceArn?: string
  bucket?: string
  prefix?: string
  suffix?: string
  createdAt?: string
  /**
   * When the scheduler will fire this next, and when it last did. Absent on an
   * `s3` trigger, which has no schedule to compute one from, and absent once a
   * `@once` trigger has run and moved to `completed`.
   */
  nextFireAt?: string
  lastFireAt?: string
  /** Pins the version or alias the trigger invokes. Absent means $LATEST. */
  qualifier?: string
}

/**
 * A new trigger.
 *
 * Note that the control plane's PUT is a CREATE: `PutTrigger` mints a fresh id
 * on every call rather than upserting by name, so sending this twice leaves two
 * triggers firing, not one. The console offers add and delete for that reason —
 * there is no edit that would not silently duplicate.
 *
 * Only the scheduled types are modelled here. `s3` needs a bucket and an
 * external notifier posting to /v1/events/s3; `queue` and `stream` are refused
 * by the control plane outright, since nothing polls an event source yet.
 */
export interface PutTriggerInput {
  functionName: string
  type: "cron" | "rate"
  /** Defaults server-side to `<type>-<functionName>`. */
  name?: string
  /** A control-plane schedule expression; omit when using `intervalSeconds`. */
  schedule?: string
  /** Seconds between runs. Takes precedence over `schedule` upstream. */
  intervalSeconds?: number
  qualifier?: string
}

export interface InvokeResult {
  status: number
  durationMs: number
  body: string
  contentType?: string
  executedVersion?: string
  functionError?: string
  logs?: string
}

/* ── Inline code editing ──────────────────────────────────────────────────
 *
 * The editor is a view over a function's zip deployment package, never a
 * checkout on a disk. Edits accumulate in a server-side draft archive and only
 * a deploy turns that draft into a new function version, so a half-finished
 * edit can never become running code.
 *
 * These mirror platform.FunctionCode / FunctionCodeEntry / FunctionCodeFile in
 * the control plane (common/platform/function_code.go) field for field.
 */

/** The deployment package size the control plane will open inline (3 MB). */
export const MAX_INLINE_EDIT_BYTES = 3 << 20
/** The largest single file the editor may write back (1 MB). */
export const MAX_CODE_FILE_BYTES = 1 << 20

/** One file in a deployment package, as the tree lists it. */
export interface FunctionCodeEntry {
  path: string
  sizeBytes: number
  /** Binary files are listed but never opened — round-tripping corrupts them. */
  binary: boolean
}

/**
 * Why a package cannot be edited inline. The control plane decides this rather
 * than letting each console infer it, so the UI only has to render the reason.
 */
export type CodeNotEditableReason =
  "ImagePackage" | "NoCodeArtifact" | "ArchiveMissing" | "PackageTooLarge" | "NotAZipArchive"

/** The editor's view of a function's deployment package. */
export interface FunctionCode {
  functionName: string
  packageType: string
  runtime?: string
  handler?: string
  imageUri?: string
  version?: string
  /** False means render `reason` instead of a tree. */
  editable: boolean
  reason?: CodeNotEditableReason
  /** Digest of the archive these files came from — the draft when one exists. */
  sha256?: string
  /**
   * Digest of the DEPLOYED package. A deploy sends this back to prove it is not
   * silently overwriting a deploy that landed while the draft was open.
   */
  baseSha256?: string
  sizeBytes: number
  draft: boolean
  draftUpdatedAt?: string
  files: FunctionCodeEntry[]
}

/** One file's contents, read from the draft when there is one. */
export interface FunctionCodeFile {
  path: string
  /** Empty for a binary file — the control plane never sends those as text. */
  content: string
  sizeBytes: number
  binary: boolean
  draft: boolean
}

/**
 * Patch for PATCH /v1/functions/{name} — an in-place configuration update that
 * does NOT mint a version. Send only the keys being changed; the backend
 * rejects unknown keys (400). A transport that omits updateFunctionConfig
 * hides all edit UI (configEdit=false).
 */
export interface UpdateFunctionConfigInput {
  description?: string
  memorySize?: number
  timeout?: number
  handler?: string
  ephemeralStorageMb?: number
  env?: Record<string, string>
  labels?: Record<string, string>
  reservedConcurrency?: number
  provisionedConcurrency?: number
  maxRetryAttempts?: number
  maxEventAgeSeconds?: number
  /**
   * Replaces the attached layer set wholesale. Omit to leave it alone; send an
   * empty array to detach everything — the two empty cases are different, which
   * is why the server models this as a pointer.
   */
  layers?: LayerRef[]
}

/* ── Metrics ────────────────────────────────────────────────────────────
 *
 * The bucketed series behind GET /v1/metrics/series. Two sources feed it and
 * the difference matters when reading a card:
 *
 *   - Counts and durations come from execution records — one row per
 *     invocation, so they are exact rather than sampled.
 *   - Concurrency and memory are gauges reported by workers. `samples` is how
 *     many backed a bucket, which is what separates "zero" from "nobody
 *     reported"; a chart that ignores it draws a flat line through a gap.
 */

/** One time bucket, covering [timestamp, timestamp + stepSeconds). */
export interface MetricBucket {
  timestamp: string
  invocations: number
  errors: number
  throttles: number
  coldStarts: number
  /** Milliseconds, over the invocations that ENDED in this bucket. */
  avgDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  p99DurationMs: number
  maxDurationMs: number
  /** Billed compute for the bucket. */
  gbSeconds: number
  /** How many worker samples backed the gauges below. Zero means none. */
  samples: number
  avgCpuSeconds: number
  avgMemoryMb: number
  peakMemoryMb: number
  avgInflight: number
  peakInflight: number
}

/** The whole window, summarized. */
export interface MetricTotals {
  invocations: number
  errors: number
  /** Fraction, not a percentage: 0.05 is 5%. */
  errorRate: number
  coldStarts: number
  coldStartRate: number
  avgDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  p99DurationMs: number
  maxDurationMs: number
  gbSeconds: number
}

/** One function's share of the window; empty when a series is function-scoped. */
export interface FunctionMetricTotal {
  functionName: string
  invocations: number
  errors: number
  avgDurationMs: number
  p95DurationMs: number
  gbSeconds: number
}

export interface MetricSeries {
  since: string
  until: string
  stepSeconds: number
  functionName?: string
  buckets: MetricBucket[]
  totals: MetricTotals
  topFunctions: FunctionMetricTotal[]
  /**
   * The store hit its row cap, so the series covers less than the window that
   * was asked for. Worth surfacing: silently returning a partial chart reads as
   * "traffic stopped".
   */
  truncated: boolean
}

/**
 * What to chart. `since` and `step` are the control plane's own spellings —
 * `since` takes an RFC3339 stamp or a negative Go duration ("-3h"), `step` a
 * positive one ("5m") or bare seconds — so a poll never has to recompute a
 * timestamp.
 */
export interface MetricSeriesQuery {
  functionName: string
  since: string
  step?: string
}
