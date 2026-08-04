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

export interface CodeArtifact { bucket?: string; key: string; sha256?: string; sizeBytes?: number; source?: string }
export interface LayerRef { name: string; version: number; arn?: string }

export interface FunctionVersion {
  version: string
  versionNumber?: number
  description?: string
  codeSha256?: string
  codeArtifact?: CodeArtifact | null
  createdAt?: string
}

export interface FunctionEntity {
  id?: string
  accountId?: string
  name: string
  namespace?: string
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
}
