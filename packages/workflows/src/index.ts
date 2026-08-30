export {
  AIAutomationsProvider,
  useAIAutomations,
  type AIAutomationsProviderProps,
} from "./provider"
export {
  AIAutomationsRoutes,
  AIAgentStudio,
  AIWorkflowStudio,
  type AIAutomationsRoutesProps,
  type AIAutomationsRoutesWithIntegrationsProps,
} from "./routes"
// Where this section is mounted. AIAutomationsRoutes sets it for you; a host
// that mounts the pages below individually — because its router owns the shell
// metadata for each one — has to declare it, or every internal link points at
// the default /automations.
export { setAutomationBasePath } from "./runtime"
// The section's own pages, exported so a host can mount one on a route of its
// own rather than taking the whole nested router.
export { default as AIAutomationsOverview } from "./legacy/pages/Overview"
export { default as AIAutomationsWorkflows } from "./legacy/pages/Workflows"
export type {
  AIAutomationsTransport,
  AutomationCredential,
  AutomationDefinition,
  AutomationKind,
  AutomationTemplate,
  ExecutionEvent,
  SaveAutomation,
  SaveCredential,
} from "./types"
