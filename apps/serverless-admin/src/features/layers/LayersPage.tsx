import { useMemo } from 'react'

import type { ColumnDef } from '@tanstack/react-table'
import { Layers, Package } from 'lucide-react'

import { PageHeader } from '@/components/console/PageHeader'
import { cellMono, cellText, ResourceTable } from '@/components/console/ResourceTable'
import { StatCard, StatGrid } from '@/components/console/StatCard'
import { Badge } from '@/components/ui/badge'
import { useDashboard } from '@/lib/queries'
import type { LayerVersion } from '@/lib/schemas'
import { formatBytes, timeAgo } from '@/lib/utils'

export function LayersPage() {
  const { data, isLoading } = useDashboard()
  const layers = data?.detail.layers ?? []

  const columns = useMemo<ColumnDef<LayerVersion, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-mono text-[13px] font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.version}
          </Badge>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => cellText(row.original.description),
      },
      {
        id: 'runtimes',
        header: 'Compatible runtimes',
        cell: ({ row }) => {
          const runtimes = row.original.compatibleRuntimes ?? []
          if (runtimes.length === 0) return cellText(undefined)
          return (
            <div className="flex flex-wrap gap-1">
              {/* Capped: one over-broad layer must not blow out the row height. */}
              {runtimes.slice(0, 3).map((runtime) => (
                <Badge key={runtime} variant="secondary" className="font-mono text-[10px]">
                  {runtime}
                </Badge>
              ))}
              {runtimes.length > 3 && (
                <span className="text-muted-foreground text-[11px]">+{runtimes.length - 3}</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'size',
        header: 'Size',
        cell: ({ row }) => cellMono(formatBytes(row.original.codeArtifact?.sizeBytes ?? 0)),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => cellMono(timeAgo(row.original.createdAt)),
      },
    ],
    [],
  )

  const distinct = new Set(layers.map((layer) => layer.name)).size

  return (
    <>
      <PageHeader
        title="Layers"
        icon={Layers}
        description="Published layer versions available to functions in this control plane."
      />

      <StatGrid className="mb-6">
        <StatCard label="Layer versions" value={layers.length} icon={Layers} loading={isLoading} />
        <StatCard label="Distinct layers" value={distinct} icon={Package} loading={isLoading} />
      </StatGrid>

      <ResourceTable
        data={layers}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Filter layers…"
        emptyIcon={Layers}
        emptyTitle="No layers published"
        emptyDescription="Publish one with POST /v1/layers and its versions will appear here."
      />
    </>
  )
}
