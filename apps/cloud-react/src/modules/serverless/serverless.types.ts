// Shapes mirror the FaaS control plane's native /v1 responses, which the
// cloud-be-go serverless gateway proxies verbatim inside the platform
// envelope (apps/serverless — the gateway adds auth/KYC/quota gates, never
// remodels the JSON). Unknown extra keys are simply not typed.

export interface CodeArtifact {
  bucket?: string
  key: string
  sha256?: string
  sizeBytes?: number
}

export interface LayerRef {
  name: string
  version: number
  arn?: string
}

export interface FunctionVersion {
  version: string
  versionNumber?: number
  codeSha256?: string
  codeArtifact?: CodeArtifact | null
  createdAt?: string
}

export interface FunctionEntity {
  id: string
  name: string
  resourceGroupId?: string
  region?: string
  packageType: string
  imageUri?: string
  runtime?: string
  handler?: string
  architecture?: string
  memorySize?: number
  timeout?: number
  reservedConcurrency?: number
  layers?: LayerRef[]
  env?: Record<string, string>
  state: string
  createdAt?: string
  updatedAt?: string
}

export interface FunctionAlias {
  name: string
  functionVersion: string
  additionalVersionWeights?: Record<string, number>
  description?: string
}

export interface LayerVersion {
  id: string
  name: string
  version: number
  description?: string
  codeArtifact?: CodeArtifact | null
  compatibleRuntimes?: string[]
  compatibleArchitectures?: string[]
  createdAt?: string
}

/** Lifecycle event from the FaaS events webhook, stored per-account. */
export interface ActivityEvent {
  type: string
  function?: string
  region?: string
  at?: string
}

/** One deployable runtime from the FaaS catalog (GET /functions/runtimes). */
export interface RuntimeInfo {
  name: string
  family: string
  languageVersion?: string
  osRelease: string
  architectures: string[]
  handlerFormat: string
  handlerRequired: boolean
  bundledRic: boolean
  deprecatedForCreate: boolean
  deprecatedForUpdate: boolean
  /**
   * Withheld from the create picker because no worker can run it under the
   * version its name claims. Already filtered out by GET /v1/runtimes, so it is
   * only true under ?includeHidden=true.
   */
  hidden: boolean
  successorRuntime?: string
}

/** Presigned artifact upload slot (POST /layers/uploads/presign). */
export interface PresignedUpload {
  method: string
  url: string
  bucket: string
  key: string
  expiresAt?: string
  headers?: Record<string, string>
}

export interface CreateFunctionRequest {
  name: string
  packageType: "image" | "zip"
  imageUri?: string
  codeArtifact?: { bucket: string; key: string }
  runtime?: string
  handler?: string
  architecture?: string
  memorySize?: number
  timeout?: number
  env?: Record<string, string>
  layers?: { name: string; version: number }[]
  region?: string
}

/** Blank-starter deploy: inline files the control plane zips server-side. */
export interface CreateFunctionFromSourceRequest {
  name: string
  /** Central resource group to file the function under; omitted when none. */
  resourceGroupId?: string
  runtime: string
  handler: string
  architecture?: string
  memorySize?: number
  timeout?: number
  env?: Record<string, string>
  files: { path: string; content: string }[]
}

export interface PublishLayerRequest {
  name: string
  description?: string
  codeArtifact: { bucket: string; key: string }
  compatibleRuntimes?: string[]
  compatibleArchitectures?: string[]
  region?: string
}

export interface PutAliasRequest {
  name: string
  functionVersion: string
  description?: string
  additionalVersionWeights?: Record<string, number>
}

/** Raw result of a test invoke — the gateway passes bytes through verbatim. */
export interface InvokeResult {
  status: number
  contentType: string
  body: string
  durationMs: number
}
