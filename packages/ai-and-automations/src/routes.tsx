import {Route,Routes} from "react-router-dom"
import {AIAutomationsHome} from "./pages"
import Agents from "./legacy/pages/AIAgents"
import AgentStudio from "./legacy/pages/AIAgents/AgentStudio"
import Workflows from "./legacy/pages/Workflows"
import WorkflowStudio from "./legacy/pages/Workflows/WorkflowStudio"
import TemplateLibrary from "./legacy/pages/Workflows/TemplateLibrary"
import TemplatePreview from "./legacy/pages/Workflows/TemplatePreview"
import WorkflowCredentials from "./legacy/pages/Workflows/WorkflowCredentials"
export interface AIAutomationsRoutesProps {basePath?:string}
export function AIAutomationsRoutes({basePath="/automations"}:AIAutomationsRoutesProps){const root=basePath.replace(/^\//,"").replace(/\/$/,"");return <Routes><Route path={root} element={<AIAutomationsHome basePath={basePath}/>}/><Route path={`${root}/agents`} element={<Agents/>}/><Route path={`${root}/agents/:id`} element={<AgentStudio/>}/><Route path={`${root}/workflows`} element={<Workflows/>}/><Route path={`${root}/workflows/:id`} element={<WorkflowStudio/>}/><Route path={`${root}/templates`} element={<TemplateLibrary/>}/><Route path={`${root}/templates/:slug`} element={<TemplatePreview/>}/><Route path={`${root}/credentials`} element={<WorkflowCredentials/>}/></Routes>}
