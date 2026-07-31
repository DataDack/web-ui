import type { Runtime } from './schemas'

/** Starter source for a new function, keyed by runtime family. */
export interface Template {
  handler: string
  files: { path: string; content: string }[]
}

const NODE: Template = {
  handler: 'index.handler',
  files: [
    {
      path: 'index.js',
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

const PYTHON: Template = {
  handler: 'lambda_function.lambda_handler',
  files: [
    {
      path: 'lambda_function.py',
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

const RUBY: Template = {
  handler: 'lambda_function.lambda_handler',
  files: [
    {
      path: 'lambda_function.rb',
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
 * compiled runtime interface client. The template is a placeholder that makes
 * the requirement explicit rather than producing a function that fails at invoke.
 */
const PROVIDED: Template = {
  handler: '',
  files: [
    {
      path: 'bootstrap',
      content: `#!/bin/sh
# Replace this with your compiled runtime interface client.
# It must poll $AWS_LAMBDA_RUNTIME_API for invocations.
exit 1
`,
    },
  ],
}

const BY_FAMILY: Record<string, Template> = {
  nodejs: NODE,
  python: PYTHON,
  ruby: RUBY,
  provided: PROVIDED,
  java: PROVIDED,
  dotnet: PROVIDED,
  go: PROVIDED,
}

export function templateFor(runtime: Runtime | undefined): Template {
  if (!runtime) return NODE
  return BY_FAMILY[runtime.family] ?? PROVIDED
}
