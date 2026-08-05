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
 * Java. Maven layout, because that is what a build step will expect to find and
 * what every Java Lambda example a reader will search for looks like.
 */
const JAVA: StarterTemplate = {
  handler: "example.Handler::handleRequest",
  files: [
    {
      path: "src/main/java/example/Handler.java",
      content: `package example;

import java.util.Map;

/**
 * Entry point. The handler string names this class and this method:
 * example.Handler::handleRequest
 */
public class Handler {

  public Map<String, Object> handleRequest(Map<String, Object> event, Object context) {
    System.out.println("event: " + event);

    return Map.of(
        "statusCode", 200,
        "headers", Map.of("content-type", "application/json"),
        "body", "{\\"message\\":\\"Hello from your function\\"}");
  }
}
`,
    },
    {
      path: "pom.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>example</groupId>
  <artifactId>function</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
</project>
`,
    },
  ],
}

/** .NET. The handler is Assembly::Namespace.Type::Method, hence the repetition. */
const DOTNET: StarterTemplate = {
  handler: "Function::Function.Handler::HandleRequest",
  files: [
    {
      path: "Function.cs",
      content: `using System.Collections.Generic;
using System.Text.Json;

namespace Function;

public class Handler
{
    /// Entry point. The handler string names the assembly, this type and this
    /// method: Function::Function.Handler::HandleRequest
    public object HandleRequest(JsonElement input, object context)
    {
        System.Console.WriteLine($"event: {input}");

        return new Dictionary<string, object>
        {
            ["statusCode"] = 200,
            ["headers"] = new Dictionary<string, string> { ["content-type"] = "application/json" },
            ["body"] = JsonSerializer.Serialize(new { message = "Hello from your function" }),
        };
    }
}
`,
    },
    {
      path: "Function.csproj",
      content: `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <AssemblyName>Function</AssemblyName>
  </PropertyGroup>

</Project>
`,
    },
  ],
}

/**
 * Go. handlerRequired is false for this family — the artifact is an executable,
 * not a named symbol — so the handler here is the binary's name rather than a
 * file.function pair.
 */
const GO: StarterTemplate = {
  handler: "bootstrap",
  files: [
    {
      path: "main.go",
      content: `package main

import (
	"context"
	"encoding/json"
	"fmt"
)

type response struct {
	StatusCode int               \`json:"statusCode"\`
	Headers    map[string]string \`json:"headers"\`
	Body       string            \`json:"body"\`
}

// handle is the entry point. Everything below main is wiring a build step
// supplies; this is the part to edit.
func handle(ctx context.Context, event json.RawMessage) (response, error) {
	fmt.Printf("event: %s\\n", event)

	body, err := json.Marshal(map[string]string{"message": "Hello from your function"})
	if err != nil {
		return response{}, err
	}
	return response{
		StatusCode: 200,
		Headers:    map[string]string{"content-type": "application/json"},
		Body:       string(body),
	}, nil
}

func main() {
	// Replaced by the platform's runtime interface client when the package is
	// built. Until then this is what documents the shape of handle.
	fmt.Println("function starting")
}
`,
    },
    {
      path: "go.mod",
      content: `module function

go 1.22
`,
    },
  ],
}

/**
 * Custom runtime. Unlike the other compiled families this one needs no compiler:
 * the contract is an executable named `bootstrap` at the package root, and a
 * shell script satisfies it. So this template is a complete, working custom
 * runtime — it polls the runtime API, calls handler.sh, and posts the response.
 */
const PROVIDED: StarterTemplate = {
  handler: "bootstrap",
  files: [
    {
      path: "bootstrap",
      content: `#!/bin/sh
# Custom runtime entry point. Lambda's contract is an executable named
# "bootstrap" at the package root that loops on the runtime API:
# fetch an invocation, run the handler, post the response.
set -eu

while true; do
  headers="$(mktemp)"

  # Blocks until an invocation arrives. The request id comes back in a header.
  event="$(curl -sS -LD "$headers" \\
    "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next")"
  request_id="$(grep -Fi Lambda-Runtime-Aws-Request-Id "$headers" | tr -d '[:space:]' | cut -d: -f2)"
  rm -f "$headers"

  if response="$(printf '%s' "$event" | ./handler.sh 2>&1)"; then
    curl -sS -X POST \\
      "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/\${request_id}/response" \\
      -d "$response" >/dev/null
  else
    curl -sS -X POST \\
      "http://\${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/\${request_id}/error" \\
      -d "{\\"errorMessage\\":\\"handler failed\\",\\"errorType\\":\\"HandlerError\\"}" >/dev/null
  fi
done
`,
    },
    {
      path: "handler.sh",
      content: `#!/bin/sh
# Your function. The invocation payload arrives on stdin; whatever this writes
# to stdout becomes the response body.
set -eu

event="$(cat)"
echo "event: \${event}" >&2

printf '{"statusCode":200,"headers":{"content-type":"application/json"},"body":"{\\\\"message\\\\":\\\\"Hello from your function\\\\"}"}'
`,
    },
  ],
}

/**
 * Every family the runtime catalog offers has starter source.
 *
 * The compiled families (Java, .NET, Go) are here on the understanding that the
 * platform compiles a package before it runs: their templates are source, not
 * artifacts, so until that build step exists a function deployed from one of
 * them stores its code but has no `bootstrap` to execute. provided.* is the
 * exception — a custom runtime's contract is a shell-executable `bootstrap`, so
 * that template runs as-is.
 */
const BY_FAMILY: Record<string, StarterTemplate> = {
  nodejs: NODE,
  python: PYTHON,
  ruby: RUBY,
  java: JAVA,
  dotnet: DOTNET,
  go: GO,
  provided: PROVIDED,
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
