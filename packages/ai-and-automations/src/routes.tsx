import { Route, Routes } from "react-router-dom"

import Agents from "./legacy/pages/AIAgents"
import AgentStudio from "./legacy/pages/AIAgents/AgentStudio"
import Integrations from "./legacy/pages/Integrations"
import Overview from "./legacy/pages/Overview"
import Workflows from "./legacy/pages/Workflows"
import TemplateLibrary from "./legacy/pages/Workflows/TemplateLibrary"
import TemplatePreview from "./legacy/pages/Workflows/TemplatePreview"
import WorkflowCredentials from "./legacy/pages/Workflows/WorkflowCredentials"
import WorkflowStudio from "./legacy/pages/Workflows/WorkflowStudio"
import { setAutomationBasePath } from "./runtime"

export interface AIAutomationsRoutesProps {
  /**
   * Where this section is mounted in the host console. Every internal link is
   * built from it, so a host that mounts the section somewhere other than
   * /automations must say so — otherwise the pages link out of themselves.
   */
  basePath?: string
}

// The two studios are exported separately because they are full-screen
// workbenches: a host mounts them OUTSIDE its console shell, so the canvas gets
// the whole viewport rather than sharing it with a sidebar.
export function AIAgentStudio({ basePath = "/automations" }: Readonly<AIAutomationsRoutesProps>) {
  setAutomationBasePath(basePath)
  return <AgentStudio />
}

export function AIWorkflowStudio({ basePath = "/automations" }: Readonly<AIAutomationsRoutesProps>) {
  setAutomationBasePath(basePath)
  return <WorkflowStudio />
}

export function AIAutomationsRoutes({
  basePath = "/automations",
}: Readonly<AIAutomationsRoutesProps>) {
  setAutomationBasePath(basePath)
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="agents" element={<Agents />} />
      <Route path="agents/:id" element={<AgentStudio />} />
      <Route path="workflows" element={<Workflows />} />
      <Route path="workflows/:id" element={<WorkflowStudio />} />
      <Route path="integrations" element={<Integrations />} />
      <Route path="templates" element={<TemplateLibrary />} />
      <Route path="templates/:slug" element={<TemplatePreview />} />
      <Route path="credentials" element={<WorkflowCredentials />} />
    </Routes>
  )
}
