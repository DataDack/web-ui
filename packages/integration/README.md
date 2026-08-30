# @datadack/integration

The integrations surface for the automations section: the platform integrations
a workflow triggers from, and the OAuth accounts those integrations authenticate
with, on one page with a tab per half.

## Relationship to `@datadack/workflows`

This package was split out of `@datadack/ai-and-automations` (now
`@datadack/workflows`), and it **depends on** that package rather than standing
apart from it:

- **Primitives** — `Badge`, `Button`, `Switch`, `Tabs`, `Skeleton` — come from
  `@datadack/workflows/internal`, so a row here looks like a row in the studio.
- **Control-plane clients** — `accountsApi`, `integrationsApi` — are the same
  modules the studio's trigger panels and credential sheets call.
- **Transport and base path** are module-level singletons owned by
  `@datadack/workflows`. The host configures them once, via
  `AIAutomationsProvider` and `setAutomationBasePath`, and both packages read
  them. Duplicating either would give this page an unconfigured transport and
  links pointing at the wrong mount point.

The connect flows (`WhatsAppConnect`, `InstagramConnect`, `ThreadsConnect`) and
the account pickers stayed in `@datadack/workflows`: the workflow studio's
trigger setup is their main caller, so moving them here would have inverted the
dependency.

## Mounting

Inside the workflows package's nested router:

```tsx
import { AIAutomationsRoutes } from "@datadack/workflows"
import { IntegrationsPage } from "@datadack/integration"

<Route path="/automations/*" element={<AIAutomationsRoutes integrations={<IntegrationsPage />} />} />
```

Or as an individual route, in a console whose shell is driven by per-route
metadata:

```tsx
import { setAutomationBasePath } from "@datadack/workflows"
import { IntegrationsPage } from "@datadack/integration"

setAutomationBasePath("/automations")
// { path: "integrations", Component: IntegrationsPage }
```

Either way it must render under an `AIAutomationsProvider`.
