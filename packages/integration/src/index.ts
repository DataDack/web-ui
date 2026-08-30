// Connected accounts and platform integrations.
//
// Split out of @datadack/ai-and-automations, which is now @datadack/workflows.
// This package depends on that one — for primitives, for the control-plane
// clients, and for the transport and base path the host configures once — so it
// is mounted alongside the workflow routes, never instead of them.
//
// A host with a nested router hands the page to AIAutomationsRoutes:
//
//   <AIAutomationsRoutes integrations={<IntegrationsPage />} />
//
// A host that owns per-route shell metadata mounts it directly, having called
// setAutomationBasePath from @datadack/workflows first.
export { default as IntegrationsPage } from "./pages/Integrations"
export { getPlatformMeta } from "./pages/Integrations/platform-meta"
