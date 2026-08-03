// Starter source for authoring a function inline, keyed by runtime family.
//
// Single copy for both consoles: cloud-react's "Blank" package option and
// serverless-web's author-from-template flow generate the same code now. The
// FaaS control plane zips these server-side (POST /functions/source) — no
// artifact upload involved.
//
// Keyed by FAMILY, not by version: the runtime catalog decides which versions
// exist, so nodejs22.x and nodejs24.x share one template and a new version
// needs no change here.

import type { StarterTemplate } from "./types"

export type { StarterTemplate }

/**
 * Node. ESM `export`, not `exports.handler`: every Node runtime the platform
 * offers supports it, and it is what a reader will write next.
 */
const NODE: StarterTemplate = {
  handler: "index.handler",
  files: [
    {
      path: "index.mjs",
      content: `/**
 * @param {object} event   the invocation payload
 * @param {object} context runtime metadata (request id, remaining time, …)
 */
export const handler = async (event, context) => {
  console.log(JSON.stringify({ requestId: context.awsRequestId, event }))

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Hello from your function" }),
  }
}
`,
    },
    {
      // Declares the ESM above. Without it Node treats .mjs fine, but the
      // manifest is what a reader edits first to add a dependency.
      path: "package.json",
      content: `{
  "name": "function",
  "private": true,
  "type": "module"
}
`,
    },
  ],
}

/** Python, with the structured logging a real function wants from day one. */
const PYTHON: StarterTemplate = {
  handler: "lambda_function.lambda_handler",
  files: [
    {
      path: "lambda_function.py",
      content: `import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """Entry point. \`event\` is the invocation payload."""
    logger.info(json.dumps({"request_id": context.aws_request_id, "event": event}))

    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"message": "Hello from your function"}),
    }
`,
    },
  ],
}

const RUBY: StarterTemplate = {
  handler: "lambda_function.lambda_handler",
  files: [
    {
      path: "lambda_function.rb",
      content: `require 'json'

def lambda_handler(event:, context:)
  puts({ request_id: context.aws_request_id, event: event }.to_json)

  {
    statusCode: 200,
    headers: { 'content-type' => 'application/json' },
    body: { message: 'Hello from your function' }.to_json
  }
end
`,
    },
  ],
}

/**
 * Families that can be authored inline. A bundled-RIC runtime (Go, Java, .NET,
 * provided.*) is absent on purpose: it needs a compiled runtime interface
 * client, so there is no source the control plane could zip into a working
 * function. The create form refuses "Blank" for those runtimes and says to
 * upload an archive or use an image instead — it used to generate a `bootstrap`
 * that exited 1, which deployed a function that failed at every invoke.
 */
const BY_FAMILY: Record<string, StarterTemplate> = {
  nodejs: NODE,
  python: PYTHON,
  ruby: RUBY,
}

/** True when a family has inline starter source. */
export function familySupportsBlank(family: string | undefined): boolean {
  return !!family && family in BY_FAMILY
}

/**
 * Starter source for a family, or null when the family cannot be authored
 * inline. Callers must handle null rather than deploying a placeholder.
 */
export function templateForFamily(family: string | undefined): StarterTemplate | null {
  if (!family) return NODE
  return BY_FAMILY[family] ?? null
}
