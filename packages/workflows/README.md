# `@datadack/workflows`

Reusable UI for AI Agents, Workflows, Workflow Templates, and Credentials.

Formerly `@datadack/ai-and-automations`. The integrations surface — connected
accounts and platform integrations — split out into
[`@datadack/integration`](../integration), which depends on this package for its
primitives, its control-plane clients, and the transport and base path a host
configures here. The connect flows and account pickers stayed, because the
workflow studio's trigger setup is their main caller.

```tsx
import { IntegrationsPage } from "@datadack/integration"
import { AIAutomationsProvider, AIAutomationsRoutes } from "@datadack/workflows"
import { Route, Routes } from "react-router-dom"

export function App() {
  return (
    <AIAutomationsProvider transport={transport}>
      <Routes>
        <Route
          path="/automations/*"
          element={
            <AIAutomationsRoutes
              basePath="/automations"
              integrations={<IntegrationsPage />}
            />
          }
        />
      </Routes>
    </AIAutomationsProvider>
  )
}
```

The host supplies only an `AIAutomationsTransport`; authentication, API origin,
and HTTP-client choice therefore stay with the host application. The bundled
serverless host adapter targets `/v1/ai-and-automations`.

Backend metadata is account-scoped in the FaaS Postgres database. Credential
values use the existing encrypted `faas_secrets` store. Templates, execution
logs, and resource audits use the configured object store beneath
`ai_and_automations/`.
