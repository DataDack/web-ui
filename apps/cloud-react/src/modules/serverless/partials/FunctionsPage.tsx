import { useMemo } from "react"

import {
  PageHeader,
  ResourceTable,
  StatCard,
  StatGrid,
  StatusBadge,
  cellMono,
  cellText,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Activity, Boxes, Container, Package, Zap } from "lucide-react"
import { Link } from "react-router-dom"

import { useServerlessFunctions } from "../serverless.hooks"
import type { FunctionEntity } from "../serverless.types"

/**
 * Serverless landing: the account's functions. Built from the shared
 * @datadack/serverless-ui kit — the same components the serverless-web
 * console renders this list with, so the two surfaces stay visually and
 * behaviorally identical.
 */
export function ServerlessFunctionsPage() {
  const { data, isLoading } = useServerlessFunctions()
  const functions = data ?? []

  const columns = useMemo<ColumnDef<FunctionEntity>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            to={`/serverless/functions/${encodeURIComponent(row.original.name)}`}
            className="font-mono text-[13px] font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "runtime",
        header: "Runtime",
        cell: ({ row }) =>
          cellMono(row.original.packageType === "image" ? "container image" : row.original.runtime),
      },
      {
        accessorKey: "memorySize",
        header: "Memory",
        cell: ({ row }) =>
          cellText(row.original.memorySize ? `${String(row.original.memorySize)} MB` : null),
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => <StatusBadge status={row.original.state} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => cellText(timeAgo(row.original.updatedAt)),
      },
    ],
    [],
  )

  const active = functions.filter((fn) => fn.state.toLowerCase() === "active").length

  return (
    <div>
      <PageHeader
        title="Serverless"
        description="Deploy functions that scale to zero — pay per invocation."
        icon={Zap}
      />

      <StatGrid className="mb-5">
        <StatCard label="Functions" value={functions.length} icon={Boxes} loading={isLoading} />
        <StatCard
          label="Active"
          value={active}
          icon={Activity}
          color="success"
          loading={isLoading}
        />
        <StatCard
          label="Container images"
          value={functions.filter((fn) => fn.packageType === "image").length}
          icon={Container}
          loading={isLoading}
        />
        <StatCard
          label="Zip packages"
          value={functions.filter((fn) => fn.packageType !== "image").length}
          icon={Package}
          loading={isLoading}
        />
      </StatGrid>

      <ResourceTable
        data={functions}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Filter functions…"
        emptyIcon={Zap}
        emptyTitle="No functions yet"
        emptyDescription="Deploy your first function to see it here."
      />
    </div>
  )
}
