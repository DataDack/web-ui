import { z } from "zod/v4"

import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import type { RuntimeInfo } from "../../serverless.types"

/**
 * A handler names a file and an exported symbol — "index.handler",
 * "lambda_function.lambda_handler". Every runtime the platform offers uses that
 * shape, and the control plane rejects anything else, so the form should too.
 */
const HANDLER_SHAPE = /^[\w./-]+\.\w+$/

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
      packageType: z.enum(["zip", "image", "blank"]),
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

      // POST /functions/source types runtime and handler as required, and a
      // bundled-RIC runtime has no inline source to zip in the first place. Both
      // used to reach the server and come back as
      // "runtime and handler are required for zip package".
      if (values.packageType === "blank") {
        if (selected.bundledRic) {
          ctx.addIssue({
            code: "custom",
            path: ["runtime"],
            message: `${selected.name} needs a compiled artifact — upload a .zip or use a container image instead of starting blank`,
          })
        }
        if (values.handler.trim() === "") {
          ctx.addIssue({
            code: "custom",
            path: ["handler"],
            message: selected.handlerFormat
              ? `A handler is required to start from a template — ${selected.handlerFormat}`
              : "A handler is required to start from a template",
          })
        }
      }

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

      const handler = values.handler.trim()
      if (selected.handlerRequired) {
        if (handler === "") {
          ctx.addIssue({
            code: "custom",
            path: ["handler"],
            message: selected.handlerFormat
              ? `A handler is required — ${selected.handlerFormat}`
              : "A handler is required",
          })
        } else if (!HANDLER_SHAPE.test(handler)) {
          ctx.addIssue({
            code: "custom",
            path: ["handler"],
            message: "Expected file.function — for example index.handler",
          })
        }
      }
    })

export type FormValues = z.infer<ReturnType<typeof makeSchema>>
