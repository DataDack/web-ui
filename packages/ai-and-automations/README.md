# `@datadack/ai-and-automations`

Reusable UI for AI Agents, Workflows, Workflow Templates, and Credentials.

```tsx
import {
  AIAutomationsProvider,
  AIAutomationsRoutes,
} from "@datadack/ai-and-automations"
import { Route, Routes } from "react-router-dom"

export function App() {
  return (
    <AIAutomationsProvider transport={transport}>
      <Routes>
        <Route
          path="/automations/*"
          element={<AIAutomationsRoutes basePath="/automations" />}
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
