import { useMemo } from 'react'

import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, Container, Cpu, Package, Plus, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/console/PageHeader'
import { cellMono, cellText, ResourceTable } from '@/components/console/ResourceTable'
import { StatCard, StatGrid } from '@/components/console/StatCard'
import { StatusBadge } from '@/components/console/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/lib/queries'
import type { FunctionEntity } from '@/lib/schemas'

export function FunctionsPage() {
  const { data, isLoading } = useDashboard()
  const functions = data?.detail.functions ?? []

  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<FunctionEntity, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <Link
            to={`/functions/${encodeURIComponent(row.original.name)}`}
            className="text-foreground hover:text-brand-gold font-mono text-[13px] font-medium underline-offset-4 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'state',
        header: 'State',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.state}
            pulse={row.original.state.toLowerCase() === 'active'}
          />
        ),
      },
      {
        accessorKey: 'packageType',
        header: 'Package',
        cell: ({ row }) => {
          const isImage = row.original.packageType === 'image'
          return (
            <Badge variant="outline" className="gap-1 font-mono text-[11px]">
              {isImage ? <Container className="size-3" /> : <Package className="size-3" />}
              {row.original.packageType}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'runtime',
        header: 'Runtime',
        cell: ({ row }) => cellText(row.original.runtime ?? row.original.runtimeMode),
      },
      {
        accessorKey: 'version.version',
        id: 'version',
        header: 'Version',
        cell: ({ row }) => cellMono(row.original.version?.version),
      },
      {
        accessorKey: 'memorySize',
        header: 'Memory',
        cell: ({ row }) =>
          cellMono(row.original.memorySize ? `${String(row.original.memorySize)} MB` : undefined),
      },
      {
        accessorKey: 'timeout',
        header: 'Timeout',
        cell: ({ row }) =>
          cellMono(row.original.timeout ? `${String(row.original.timeout)}s` : undefined),
      },
      {
        accessorKey: 'namespace',
        header: 'Namespace',
        cell: ({ row }) => cellText(row.original.namespace),
      },
    ],
    [],
  )

  const zipCount = functions.filter((fn) => fn.packageType === 'zip').length

  return (
    <>
      <PageHeader
        title="Functions"
        icon={Zap}
        description="Every function deployed to this control plane, across all namespaces."
        actions={
          <Button
            variant="gold"
            onClick={() => {
              void navigate('/functions/new')
            }}
          >
            <Plus /> Create function
          </Button>
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="Functions" value={functions.length} icon={Zap} loading={isLoading} />
        <StatCard
          label="Active"
          value={functions.filter((fn) => fn.state.toLowerCase() === 'active').length}
          icon={Cpu}
          color="success"
          loading={isLoading}
        />
        <StatCard label="Zip packages" value={zipCount} icon={Package} loading={isLoading} />
        <StatCard
          label="Container images"
          value={functions.length - zipCount}
          icon={Container}
          loading={isLoading}
        />
      </StatGrid>

      <ResourceTable
        data={functions}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Filter functions…"
        emptyIcon={Boxes}
        emptyTitle="No functions deployed"
        emptyDescription="Deploy one with POST /v1/functions and it will appear here."
      />
    </>
  )
}
