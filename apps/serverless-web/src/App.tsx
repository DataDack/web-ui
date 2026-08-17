import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/shell/AppShell"
import { AuditPage } from "@/features/audit/AuditPage"
import { DomainsPage } from "@/features/domains/DomainsPage"
import { DebugPreviewPage } from "@/features/functions/DebugPreviewPage"
import { CreateFunctionPage } from "@/features/functions/CreateFunctionPage"
import { FunctionDetailPage } from "@/features/functions/FunctionDetailPage"
import { FunctionsPage } from "@/features/functions/FunctionsPage"
import { LayersPage } from "@/features/layers/LayersPage"
import { LogsPage } from "@/features/logs/LogsPage"
import { MetricsPage } from "@/features/metrics/MetricsPage"
import { WorkersPage } from "@/features/workers/WorkersPage"

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/functions" replace />} />
        <Route path="/functions" element={<FunctionsPage />} />
        <Route path="/functions/new" element={<CreateFunctionPage />} />
        <Route path="/functions/:name" element={<FunctionDetailPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/layers" element={<LayersPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        {/* Every hostname the platform hands out. The registry moved into this
            control plane, so the operator view of it lives here too. */}
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/debug-preview" element={<DebugPreviewPage />} />
        {/* The studio moved into the function detail page's Code tab. */}
        <Route path="/studio" element={<Navigate to="/functions" replace />} />
        {/* Unknown paths fall back rather than rendering an empty shell. */}
        <Route path="*" element={<Navigate to="/functions" replace />} />
      </Route>
    </Routes>
  )
}
