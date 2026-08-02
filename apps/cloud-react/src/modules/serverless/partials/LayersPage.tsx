import { useMemo } from "react"

import {
  Badge,
  PageHeader,
  DataTable,
  EmptyState,
  cellMono,
  cellText,
  formatBytes,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Layers } from "lucide-react"

import { useServerlessLayers } from "../serverless.hooks"
import type { LayerVersion } from "../serverless.types"

/** Published layer versions — shared dependency archives functions reference. */
export function ServerlessLayersPage() {
  const {
    data,
    isLoading,
    isError: serverlessLayersError,
    refetch: refetchServerlessLayers,
  } = useServerlessLayers()
  const layers = data ?? []

  const columns = useMemo<ColumnDef<LayerVersion>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => cellMono(row.original.name),
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.version}
          </Badge>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => cellText(row.original.description),
      },
      {
        id: "runtimes",
        header: "Compatible runtimes",
        cell: ({ row }) => {
          const runtimes = row.original.compatibleRuntimes ?? []
          if (runtimes.length === 0) return cellText()
          return (
            <div className="flex flex-wrap gap-1">
              {runtimes.slice(0, 3).map((runtime) => (
                <Badge key={runtime} variant="secondary" className="font-mono text-[10px]">
                  {runtime}
                </Badge>
              ))}
              {runtimes.length > 3 && cellText(`+${String(runtimes.length - 3)}`)}
            </div>
          )
        },
      },
      {
        id: "size",
        header: "Size",
        cell: ({ row }) => cellText(formatBytes(row.original.codeArtifact?.sizeBytes ?? 0)),
      },
      {
        accessorKey: "createdAt",
        header: "Published",
        cell: ({ row }) => cellText(timeAgo(row.original.createdAt)),
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Layers"
        description="Shared dependency archives functions reference by name and version."
        icon={Layers}
      />
      <DataTable
        data={layers}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Filter layers…"
        empty={
          <EmptyState
            icon={Layers}
            title="No layers yet"
            description="Publish a layer to share dependencies across functions."
          />
        }
        error={serverlessLayersError ? "Failed to load" : undefined}
        onRetry={() => void refetchServerlessLayers()}
        retryLabel={"Try again"}
      />
    </div>
  )
}
