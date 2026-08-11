import { z } from "zod/v4"

import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import type { RuntimeInfo } from "../../serverless.types"

/**
 * A handler's shape depends on the family, and the control plane checks the
 * matching one — so a single pattern here would reject handlers the server
 * accepts. Mirrors the catalog's HandlerPattern per family:
 *
 *   script  index.handler, lambda_function.lambda_handler
 *   java    example.Handler::handleRequest
 *   dotnet  Function::Function.Handler::HandleRequest
 *
 * A family whose artifact is an executable (go, provided.*) has no symbol to
 * name, so anything non-empty passes — handlerRequired is false there anyway.
 */
const SCRIPT_HANDLER_SHAPE = /^[\w./-]+\.\w+$/
const JAVA_HANDLER_SHAPE = /^[\w.$]+::[\w$]+$/
const DOTNET_HANDLER_SHAPE = /^[\w.]+::[\w.]+::[\w.]+$/

function handlerShapeFor(family: string): RegExp | null {
  switch (family) {
    case "java":
      return JAVA_HANDLER_SHAPE
    case "dotnet":
      return DOTNET_HANDLER_SHAPE
    case "go":
    case "provided":
      return null
    default:
      return SCRIPT_HANDLER_SHAPE
  }
}

/**
 * An OCI image reference: registry/repository with an optional tag or digest.
 * Loose on purpose — the registry is the authority on whether an image exists —
 * but it does catch the common mistakes of pasting a bare name or a URL.
 */
const IMAGE_URI_SHAPE = /^[\w.-]+(?::\d+)?\/[\w./-]+(?::[\w.-]+|@sha256:[a-f0-9]{64})?$/

/**
 * The form's rules, built from the naming policy AND the runtime catalog.
 *
 * The catalog already states what each runtime demands — whether a handler is
 * required, which architectures it runs on, whether it may still be used for a
 * new function — and the form used to ignore all of it, so those rules only
 * surfaced as a rejected API call after the wizard was filled in. Passing the
 * catalog in lets every one of them fail on the step where it can be fixed.
 */
export const makeSchema = (rule: NamingRule, runtimes: RuntimeInfo[]) =>
  z
    .object({
      name: namingNameSchema(rule),
      // Empty means "no group" — the account's default is applied at submit,
      // and a function may legitimately belong to none.
      resourceGroupId: z.string(),
      // Rows rather than a record so the editor can hold a half-typed pair
      // without it colliding with an existing key. Blank rows are dropped at
      // submit; a keyed row must have a key to mean anything.
      tags: z
        .array(z.object({ key: z.string(), value: z.string() }))
        .superRefine((rows, ctx) => {
          const seen = new Set<string>()
          rows.forEach((row, index) => {
            const key = row.key.trim()
            if (key === "") {
              // A wholly blank row is just an unfilled one; a value with no key
              // would be silently discarded, which is worth saying.
              if (row.value.trim() !== "") {
                ctx.addIssue({ code: "custom", path: [index, "key"], message: "A tag needs a key" })
              }
              return
            }
            if (seen.has(key)) {
              ctx.addIssue({ code: "custom", path: [index, "key"], message: `Duplicate tag ${key}` })
            }
            seen.add(key)
          })
        }),
      packageType: z.enum(["image", "blank"]),
      imageUri: z.string(),
      runtime: z.string(),
      handler: z.string(),
      architecture: z.string(),
      memorySize: z.number().min(64).max(10240),
      timeout: z.number().min(1).max(900),
    })
    .superRefine((values, ctx) => {
      if (values.packageType === "image") {
        const uri = values.imageUri.trim()
        if (uri === "") {
          ctx.addIssue({ code: "custom", path: ["imageUri"], message: "Image URI is required" })
        } else if (!IMAGE_URI_SHAPE.test(uri)) {
          ctx.addIssue({
            code: "custom",
            path: ["imageUri"],
            message: "Expected registry/repository[:tag] — for example ghcr.io/acme/api:1.0",
          })
        }
        // An image carries its own entrypoint, so the runtime fields below do
        // not apply to it.
        return
      }

      if (values.runtime === "") {
        ctx.addIssue({ code: "custom", path: ["runtime"], message: "Pick a runtime" })
        return
      }

      const selected = runtimes.find((r) => r.name === values.runtime)
      if (!selected) return // catalog still loading; the server is the backstop

      if (selected.deprecatedForCreate) {
        ctx.addIssue({
          code: "custom",
          path: ["runtime"],
          message: selected.successorRuntime
            ? `${selected.name} can no longer be used for a new function — use ${selected.successorRuntime}`
            : `${selected.name} can no longer be used for a new function`,
        })
      }

      if (!selected.architectures.includes(values.architecture)) {
        ctx.addIssue({
          code: "custom",
          path: ["architecture"],
          message: `${values.runtime} runs on ${selected.architectures.join(" or ")}`,
        })
      }

      const handlerIssue = handlerProblem(selected, values.handler)
      if (handlerIssue) {
        ctx.addIssue({ code: "custom", path: ["handler"], message: handlerIssue })
      }
    })

/**
 * What is wrong with this handler for this runtime, or null when nothing is.
 *
 * A runtime whose artifact is an executable declares handlerRequired false and
 * its handler is deliberately empty — demanding one there would block every Go
 * and provided.* function from being created at all.
 */
function handlerProblem(runtime: RuntimeInfo, raw: string): string | null {
  if (!runtime.handlerRequired) return null

  const handler = raw.trim()
  if (handler === "") {
    return runtime.handlerFormat
      ? `A handler is required — ${runtime.handlerFormat}`
      : "A handler is required"
  }

  const shape = handlerShapeFor(runtime.family)
  if (shape && !shape.test(handler)) {
    return runtime.handlerFormat
      ? `Expected ${runtime.handlerFormat}`
      : "Expected file.function — for example index.handler"
  }
  return null
}

export type FormValues = z.infer<ReturnType<typeof makeSchema>>
