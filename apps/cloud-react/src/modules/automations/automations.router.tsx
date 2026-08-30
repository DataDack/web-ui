import type { RouteObject } from "react-router-dom"

// The AI & Workflows section.
//
// Its pages come from @datadack/workflows and @datadack/integration — the same
// packages the serverless admin console mounts — so the studio, the tables and
// the trigger panels are one implementation rather than two.
//
// They are mounted as INDIVIDUAL routes rather than through the package's own
// nested <Routes>, because this console's shell is driven by per-route `handle`
// metadata (hideSidebar, fullBleed) and a nested router has no way to express
// it. The trade is that this file declares the mount point; setAutomationBasePath
// below is what keeps the package's internal links pointing back here.
const BASE_PATH = "/automations"

/**
 * Load a page from the package with the section's mount point already declared.
 *
 * Idempotent — the package keeps one module-level base path — and called per
 * chunk rather than once at startup, so a deep link straight into the studio
 * gets a correct base path without depending on some earlier page having run.
 */
async function loadPackage() {
  const pkg = await import("@datadack/workflows")
  pkg.setAutomationBasePath(BASE_PATH)
  return pkg
}

/**
 * Load the integrations page with the section's mount point already declared.
 *
 * The base path is a singleton owned by @datadack/workflows, and
 * @datadack/integration reads it from there — so it is set through loadPackage
 * here too, rather than assumed to have been set by whichever page ran first.
 */
async function loadIntegrations() {
  const [{ IntegrationsPage }] = await Promise.all([import("@datadack/integration"), loadPackage()])
  return IntegrationsPage
}

export const automationsRoutes: RouteObject[] = [
  {
    // A layout route, so the section's transport provider is mounted lazily
    // with it. See AutomationsLayout: mounting the provider in main.tsx instead
    // drags the whole package — canvas, dnd kit, node registry — into the
    // console's entry chunk for every user.
    path: "automations",
    lazy: async () => {
      const { AutomationsLayout } = await import("./AutomationsLayout")
      return { Component: AutomationsLayout }
    },
    children: [
      {
        // Landing: what exists, what ran, and what is broken.
        index: true,
        lazy: async () => {
          const { AIAutomationsOverview } = await loadPackage()
          return { Component: AIAutomationsOverview }
        },
      },
      {
        path: "workflows",
        lazy: async () => {
          const { AIAutomationsWorkflows } = await loadPackage()
          return { Component: AIAutomationsWorkflows }
        },
      },
      {
        // The canvas is a workbench, not a page: it carries its own node palette
        // on one side and a configuration panel on the other, so the console's
        // service sidebar would be a third column competing with both. fullBleed
        // drops the shell's gutter too — the same treatment the serverless
        // function editor gets, for the same reason.
        path: "workflows/:id",
        handle: { hideSidebar: true, fullBleed: true },
        lazy: async () => {
          const { AIWorkflowStudio } = await loadPackage()
          return { Component: () => <AIWorkflowStudio basePath={BASE_PATH} /> }
        },
      },
      {
        path: "integrations",
        lazy: async () => ({ Component: await loadIntegrations() }),
      },
    ],
  },
]
