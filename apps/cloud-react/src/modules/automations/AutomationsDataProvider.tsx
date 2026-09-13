import { useMemo, type ReactNode } from "react"

import { SERVERLESS_ORIGIN } from "@/services/api/serverless-origin"

import { AIAutomationsProvider, type AIAutomationsTransport } from "@datadack/workflows"

import { createAutomationsTransport } from "./automations.client"

// Wires the shared @datadack/workflows components to their data source.
//
// The section is served entirely by the FaaS control plane — agents, workflows,
// credentials, templates, executions and app integrations are all routes under
// /v1/workflows there — so unlike the serverless section there is no gateway
// half.
//
// It reads the origin from the same place ServerlessDataProvider does, and
// deliberately so rather than through a second variable: both sections talk to
// one control plane, and two ways to name its address is two ways for them to
// disagree. Since the domain merge that address is this console's own origin
// and there is no region without it, so the unavailable state this provider
// used to carry — a transport whose every call rejected with "not reachable in
// this region yet" — has no way to occur and is gone.

export function AutomationsDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const transport = useMemo<AIAutomationsTransport>(
    () => createAutomationsTransport({ getBaseUrl: () => SERVERLESS_ORIGIN }),
    [],
  )

  return <AIAutomationsProvider transport={transport}>{children}</AIAutomationsProvider>
}
