import { z } from "zod"

// Validated at the boundary so a control-plane change surfaces next to the
// request rather than as `undefined` inside a component.

export const runtimeSchema = z.object({
  name: z.string(),
  family: z.string(),
  languageVersion: z.string().optional(),
  osRelease: z.string(),
  architectures: z.array(z.string()).default([]),
  handlerFormat: z.string(),
  handlerRequired: z.boolean(),
  /** True when the artifact must carry its own RIC and a `bootstrap` binary. */
  bundledRic: z.boolean(),
  deprecatedForCreate: z.boolean(),
  deprecatedForUpdate: z.boolean(),
  successorRuntime: z.string().optional(),
})

export const runtimeListSchema = z.object({ runtimes: z.array(runtimeSchema).default([]) })

export const functionSummarySchema = z.object({
  name: z.string(),
  packageType: z.string(),
  runtime: z.string().optional(),
  handler: z.string().optional(),
  state: z.string(),
  memorySize: z.number().optional(),
  timeout: z.number().optional(),
  version: z.object({ version: z.string() }).optional(),
})

export const functionListSchema = z.object({
  functions: z.array(functionSummarySchema).default([]),
})

export const codeEntrySchema = z.object({
  path: z.string(),
  sizeBytes: z.number(),
  binary: z.boolean(),
})

export const codeTreeSchema = z.object({
  functionName: z.string(),
  packageType: z.string(),
  runtime: z.string().optional(),
  handler: z.string().optional(),
  imageUri: z.string().optional(),
  version: z.string().optional(),
  editable: z.boolean(),
  reason: z.string().optional(),
  sha256: z.string().optional(),
  baseSha256: z.string().optional(),
  sizeBytes: z.number(),
  draft: z.boolean(),
  files: z.array(codeEntrySchema).default([]),
})

export const codeFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  sizeBytes: z.number(),
  binary: z.boolean(),
  draft: z.boolean(),
})

export type Runtime = z.infer<typeof runtimeSchema>
export type FunctionSummary = z.infer<typeof functionSummarySchema>
export type CodeEntry = z.infer<typeof codeEntrySchema>
export type CodeTree = z.infer<typeof codeTreeSchema>
export type CodeFile = z.infer<typeof codeFileSchema>
