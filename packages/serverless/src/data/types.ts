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
