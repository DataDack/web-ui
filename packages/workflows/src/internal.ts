// The shared base that @datadack/integration builds on.
//
// The integrations surface was split into its own package, but it is not a
// standalone island: it renders the same primitives as the studio, talks to the
// same control plane through the same transport, and links back into workflow
// routes. Rather than duplicating any of that, this subpath (imported as
// `@datadack/workflows/internal`) hands the pieces over.
//
// It is NOT part of the public API. Nothing outside the workspace should import
// it, and anything exported here stays in step with the integration package
// rather than with host consoles.

// Where the section is mounted, and how a page reaches its data source. Both
// are module-level singletons — the integration package MUST read them from
// here rather than keeping its own, or it ends up with an unconfigured
// transport and links pointing at the default /automations.
export { automationPath, getTransport } from "./runtime"

export { accountsApi } from "./legacy/api/accounts"
export { integrationsApi } from "./legacy/api/integrations"

// Re-exported from @datadack/common-ui rather than re-implemented. This package
// bundles the design system (see tsup.config.ts), so forwarding it here is what
// keeps the integrations surface on the SAME component instances as the studio
// instead of pulling a second copy in beside them.
export {
  Badge,
  badgeVariants,
  Button,
  buttonVariants,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@datadack/common-ui"
