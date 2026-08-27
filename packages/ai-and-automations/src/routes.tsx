import {Route,Routes} from "react-router-dom"
import {AIAutomationsHome} from "./pages"
import {setAutomationBasePath} from "./runtime"
import Agents from "./legacy/pages/AIAgents"
import AgentStudio from "./legacy/pages/AIAgents/AgentStudio"
import Workflows from "./legacy/pages/Workflows"
import WorkflowStudio from "./legacy/pages/Workflows/WorkflowStudio"
import TemplateLibrary from "./legacy/pages/Workflows/TemplateLibrary"
import TemplatePreview from "./legacy/pages/Workflows/TemplatePreview"
import WorkflowCredentials from "./legacy/pages/Workflows/WorkflowCredentials"
export interface AIAutomationsRoutesProps {basePath?:string}
export function AIAgentStudio({basePath="/automations"}:AIAutomationsRoutesProps){setAutomationBasePath(basePath);return <AgentStudio/>}
export function AIWorkflowStudio({basePath="/automations"}:AIAutomationsRoutesProps){setAutomationBasePath(basePath);return <WorkflowStudio/>}
export function AIAutomationsRoutes({basePath="/automations"}:AIAutomationsRoutesProps){setAutomationBasePath(basePath);return <Routes><Route index element={<AIAutomationsHome basePath={basePath}/>}/><Route path="agents" element={<Agents/>}/><Route path="agents/:id" element={<AgentStudio/>}/><Route path="workflows" element={<Workflows/>}/><Route path="workflows/:id" element={<WorkflowStudio/>}/><Route path="templates" element={<TemplateLibrary/>}/><Route path="templates/:slug" element={<TemplatePreview/>}/><Route path="credentials" element={<WorkflowCredentials/>}/></Routes>}
