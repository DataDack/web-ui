// Starter source for the "Blank" package option, keyed by runtime family.
// Mirrors the serverless-web studio's templates so both consoles generate
// the same default code. The FaaS control plane zips these server-side
// (POST /functions/source) — no artifact upload involved.

export interface StarterTemplate {
  handler: string
  files: { path: string; content: string }[]
}

const NODE: StarterTemplate = {
  handler: "index.handler",
  files: [
    {
      path: "index.js",
      content: `exports.handler = async (event) => {
  console.log('event:', JSON.stringify(event))
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from your function' }),
  }
}
`,
    },
  ],
}

const PYTHON: StarterTemplate = {
  handler: "lambda_function.lambda_handler",
  files: [
    {
      path: "lambda_function.py",
      content: `import json


def lambda_handler(event, context):
    print("event:", json.dumps(event))
    return {
        "statusCode": 200,
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
  puts "event: #{event.to_json}"
  { statusCode: 200, body: { message: 'Hello from your function' }.to_json }
end
`,
    },
  ],
}

/**
 * Bundled-RIC runtimes cannot be authored inline — the artifact must carry a
 * compiled runtime interface client. The placeholder makes that explicit
 * instead of producing a function that fails at invoke.
 */
const PROVIDED: StarterTemplate = {
  handler: "",
  files: [
    {
      path: "bootstrap",
      content: `#!/bin/sh
# Replace this with your compiled runtime interface client.
# It must poll $AWS_LAMBDA_RUNTIME_API for invocations.
exit 1
`,
    },
  ],
}

const BY_FAMILY: Record<string, StarterTemplate> = {
  nodejs: NODE,
  python: PYTHON,
  ruby: RUBY,
  provided: PROVIDED,
  java: PROVIDED,
  dotnet: PROVIDED,
  go: PROVIDED,
}

export function templateForFamily(family: string | undefined): StarterTemplate {
  if (!family) return NODE
  return BY_FAMILY[family] ?? PROVIDED
}
