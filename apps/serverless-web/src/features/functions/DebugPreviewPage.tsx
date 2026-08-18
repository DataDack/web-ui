// TEMPORARY — visual QA harness for the function detail page: the nav rail, the
// Code workbench (explorer / editor / deployment panel / output dock) and the
// Configuration sections, all served by an in-memory transport so the page can
// be looked at without a control plane running. Not wired into any nav.
import { useState } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import {
  FunctionDetailPage,
  ServerlessProvider,
  type FunctionCode,
  type FunctionDetailTabValue,
  type FunctionEntity,
  type ServerlessTransport,
} from "@datadack/serverless"

const queryClient = new QueryClient()

const fn: FunctionEntity = {
  name: "test",
  resourceGroupId: "",
  region: "ap-south-1",
  functionArn: "arn:aws:lambda:ap-south-1:000000000001:function:test",
  packageType: "zip",
  runtime: "nodejs20.x",
  handler: "index.handler",
  architecture: "x86_64",
  memorySize: 128,
  timeout: 3,
  state: "active",
  updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  env: { STAGE: "prod", TABLE_NAME: "alpha-production-users", API_KEY_SECRET: "s3cr3t" },
  version: { version: "4", createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
}

/** The in-memory package the harness edits, so Save/Deploy have somewhere to go. */
const files: Record<string, string> = {
  "index.js": `// Import required AWS SDK clients and commands
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const handler = async (event) => {
  const payload = JSON.parse(event.body)

  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: { id: payload.id, timestamp: Date.now() },
  })

  await docClient.send(command)

  return { statusCode: 200, body: JSON.stringify({ message: "Success" }) }
}
`,
  "package.json": `{
  "name": "test",
  "version": "1.0.0",
  "type": "module"
}
`,
  "lib/transform.js": "export const transform = (row) => ({ ...row, seen: true })\n",
  "README.md": "# test\n\nA harness fixture.\n",
}

function codeView(): FunctionCode {
  return {
    functionName: fn.name,
    packageType: "zip",
    runtime: fn.runtime,
    handler: fn.handler,
    version: "4",
    editable: true,
    sha256: "a1b2c3d4e5f6a7b8",
    baseSha256: "a1b2c3d4e5f6a7b8",
    sizeBytes: Object.values(files).reduce((total, body) => total + body.length, 0),
    draft: false,
    files: Object.entries(files).map(([path, body]) => ({
      path,
      sizeBytes: body.length,
      binary: false,
    })),
  }
}

const fakeTransport: ServerlessTransport = {
  listRuntimes: async () => [],
  createFromSource: async () => {
    throw new Error("not implemented in preview")
  },
  getFunction: async () => fn,
  listTriggers: async () => [],
  updateFunctionConfig: async () => fn,
  listFunctionUrls: async () => [
    { domain: "test-000000000001.faas.local", functionName: fn.name, authType: "NONE" },
  ],
  listVersions: async () => [fn.version!],
  listAliases: async () => [],
  invokeFunction: async (_name, payload) => ({
    status: 200,
    durationMs: 42,
    body: JSON.stringify({ message: "Success", echo: JSON.parse(payload) }),
    executedVersion: "4",
    logs: "START RequestId: 0000\nEND RequestId: 0000\n",
  }),
  getFunctionCode: async () => codeView(),
  getFunctionCodeFile: async (_name, path) => ({
    path,
    content: files[path] ?? "",
    sizeBytes: files[path]?.length ?? 0,
    binary: false,
    draft: false,
  }),
  putFunctionCodeFile: async (_name, path, content) => {
    files[path] = content
    return codeView()
  },
  deleteFunctionCodeFile: async (_name, path) => {
    delete files[path]
    return codeView()
  },
  discardFunctionCodeDraft: async () => codeView(),
  deployFunctionCodeDraft: async () => fn,
}

export function DebugPreviewPage() {
  const [tab, setTab] = useState<FunctionDetailTabValue>(
    (new URLSearchParams(window.location.search).get("tab") as FunctionDetailTabValue) ?? "code",
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ServerlessProvider transport={fakeTransport}>
        <FunctionDetailPage name="test" activeTab={tab} onTabChange={setTab} onBack={() => {}} />
      </ServerlessProvider>
    </QueryClientProvider>
  )
}
