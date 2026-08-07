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
}
