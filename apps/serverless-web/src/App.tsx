import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/shell/AppShell"
import { AuditPage } from "@/features/audit/AuditPage"
import { DomainsPage } from "@/features/domains/DomainsPage"
import { CreateFunctionPage } from "@/features/functions/CreateFunctionPage"
import { DebugPreviewPage } from "@/features/functions/DebugPreviewPage"
import { FunctionDetailPage } from "@/features/functions/FunctionDetailPage"
import { FunctionsPage } from "@/features/functions/FunctionsPage"
import { LayersPage } from "@/features/layers/LayersPage"
import { LogsPage } from "@/features/logs/LogsPage"
import { MetricsPage } from "@/features/metrics/MetricsPage"
import { NodeDetailPage } from "@/features/workers/NodeDetailPage"
import { WorkersPage } from "@/features/workers/WorkersPage"

import { IntegrationsPage } from "@datadack/integration"
import { AIAgentStudio, AIAutomationsRoutes, AIWorkflowStudio } from "@datadack/workflows"

export function App() {
  return (
    <Routes>
      {/* Editors own the entire viewport. Their studio canvases already include
          their own toolbar/navigation and must not be constrained by AppShell. */}
      <Route path="/automations/agents/:id" element={<AIAgentStudio />} />
      <Route path="/automations/workflows/:id" element={<AIWorkflowStudio />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/functions" replace />} />
        <Route path="/functions" element={<FunctionsPage />} />
        <Route path="/functions/new" element={<CreateFunctionPage />} />
        <Route path="/functions/:name" element={<FunctionDetailPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/workers/:id" element={<NodeDetailPage />} />
        <Route path="/layers" element={<LayersPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        {/* Every hostname the platform hands out. The registry moved into this
            control plane, so the operator view of it lives here too. */}
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/debug-preview" element={<DebugPreviewPage />} />
        <Route
          path="/automations/*"
          element={<AIAutomationsRoutes integrations={<IntegrationsPage />} />}
        />
        {/* The studio moved into the function detail page's Code tab. */}
        <Route path="/studio" element={<Navigate to="/functions" replace />} />
        {/* Unknown paths fall back rather than rendering an empty shell. */}
        <Route path="*" element={<Navigate to="/functions" replace />} />
      </Route>
    </Routes>
  )
}
