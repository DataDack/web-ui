/*
Copyright (C) 2025 DataDack Technologies Pvt. Ltd.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useContext, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Workflow } from "lucide-react"
import { toast } from "react-toastify"
import { workflowsApi } from "../../api/workflows"
import { automationPath } from "../../../runtime"
import { n8nJsonToCanvasData, collectWorkflowDependencies } from "../../helpers/generateWorkflowN8n"
import StudioTable from "../../components/agents/StudioTable"
import { StatusContext } from "../../context/Status"
import FeatureGate from "../../components/FeatureGate"
const PAGE_SIZE = 20

export default function Workflows() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [statusState] = useContext(StatusContext)

  const maintenanceConfig = useMemo(() => {
    try {
      const raw = statusState?.status?.maintenance_mode
      if (raw) return JSON.parse(raw)
    } catch (e) {}
    return {}
  }, [statusState?.status?.maintenance_mode])

  const featureStatus =
    maintenanceConfig.workflows === true ? "maintenance" : maintenanceConfig.workflows || "off"

  const { data, isLoading } = useQuery({
    queryKey: ["workflows", page, search],
    queryFn: () => workflowsApi.list({ page, pageSize: PAGE_SIZE, keyword: search }),
    keepPreviousData: true,
    enabled: featureStatus === "off",
  })

  const handleImport = useCallback(
    async (json) => {
      try {
        const name = json.name || "Imported Workflow"

        // Convert n8n JSON nodes/connections to React Flow canvas format
        let canvasData = ""
        let n8nJsonStr = "{}"
        let metadata = "{}"

        if (json.nodes && Array.isArray(json.nodes)) {
          // This is an n8n workflow JSON — convert to canvas
          const { nodes, edges } = n8nJsonToCanvasData(json)
          canvasData = JSON.stringify({ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } })
          n8nJsonStr = JSON.stringify(json)

          // Collect dependencies from canvas nodes
          const dependencies = collectWorkflowDependencies(nodes)
          if (Object.keys(dependencies).length > 0) {
            metadata = JSON.stringify({ dependencies })
          }
        } else if (json.canvas_data) {
          // Our own export format with canvas_data already present
          canvasData =
            typeof json.canvas_data === "string"
              ? json.canvas_data
              : JSON.stringify(json.canvas_data)
          n8nJsonStr = json.n8n_json || "{}"
          metadata = json.metadata || "{}"
        }

        const created = await workflowsApi.create({
          name,
          description: json.description || "",
          n8n_json: n8nJsonStr,
          canvas_data: canvasData,
          metadata,
        })

        toast.success(`Workflow "${name}" imported`)
        queryClient.invalidateQueries({ queryKey: ["workflows"] })

        if (created?.id) {
          navigate(automationPath(`workflows/${created.id}`))
        }
      } catch (err) {
        toast.error(`Import failed: ${err.message}`)
      }
    },
    [queryClient, navigate],
  )

  if (featureStatus !== "off") {
    return (
      <FeatureGate
        feature="workflows"
        featureLabel="Workflows"
        status={featureStatus}
        maintenanceConfig={maintenanceConfig}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Workflow size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Workflows</h1>
          <p className="text-xs text-muted-foreground">
            Design AI-driven pipelines that connect models, tools, and data sources
          </p>
        </div>
      </div>

      <StudioTable
        entityLabel="Workflow"
        queryKey="workflows"
        data={data}
        isLoading={isLoading}
        api={workflowsApi}
        page={page}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        hiddenColumns={["agent_mode", "type", "status"]}
        onImport={handleImport}
      />
    </div>
  )
}
