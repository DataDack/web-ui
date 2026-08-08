// TEMPORARY — visual QA harness for the CodeEditorPlaceholder / ConfigurationTab
// full-height redesign. Not wired into any nav; delete before committing.
import { useState } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import {
  FunctionDetailPage,
  ServerlessProvider,
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
  handler: "file.exportedFunction",
  architecture: "x86_64",
  memorySize: 128,
  timeout: 3,
  state: "active",
  updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  env: { STAGE: "prod" },
}

const fakeTransport: ServerlessTransport = {
  listRuntimes: async () => [],
  createFromSource: async () => {
    throw new Error("not implemented in preview")
  },
  getFunction: async () => fn,
  listTriggers: async () => [],
  updateFunctionConfig: async () => fn,
}

export function DebugPreviewPage() {
  const [tab, setTab] = useState<FunctionDetailTabValue>(
    (new URLSearchParams(window.location.search).get("tab") as FunctionDetailTabValue) ?? "code",
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ServerlessProvider transport={fakeTransport}>
        <FunctionDetailPage
          name="test"
          activeTab={tab}
          onTabChange={setTab}
          onBack={() => {}}
        />
      </ServerlessProvider>
    </QueryClientProvider>
  )
}
