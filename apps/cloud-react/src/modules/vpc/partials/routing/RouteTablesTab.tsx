import { useMemo } from "react"

import { Badge, DataTable, EmptyState, Input, textColumn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpRight, GitBranch, Route, Search } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { routeTablePath, useRouteTables, type RouteTable } from "../../route-tables"
import { VPC_ROUTES } from "../../vpc.constants"

export function RouteTablesTab({ onCreate }: Readonly<{ onCreate: () => void }>) {
  const tables = useRouteTables()
  const [params, setParams] = useSearchParams()
  const query = params.get("q") ?? ""
  const filtered = useMemo(
    () =>
      (tables.data ?? []).filter((table) =>
        `${table.name} ${table.id} ${table.vpc_name} ${table.vpc_id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [tables.data, query],
  )
  const columns = useMemo<ColumnDef<RouteTable>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (table) => table.name,
        cell: ({ row }) => (
          <Link
            className="group flex items-center gap-2 font-medium text-foreground hover:text-primary"
            to={routeTablePath(row.original.id)}
          >
            <Route className="size-4 shrink-0 text-muted-foreground" />
            <span>{row.original.name}</span>
            <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </Link>
        ),
      },
      textColumn<RouteTable>({
        id: "id",
        header: "Route table ID",
        accessor: (table) => table.id,
        mono: true,
        responsive: "lg",
      }),
      {
        id: "vpc",
        header: "VPC",
        cell: ({ row }) => (
          <Link
            className="text-status-info hover:underline"
            to={VPC_ROUTES.detail(row.original.vpc_id)}
          >
            {row.original.vpc_name}
          </Link>
        ),
      },
      {
        id: "main",
        header: "Main",
        cell: ({ row }) =>
          row.original.is_main ? (
            <Badge variant="outline">Main</Badge>
          ) : (
            <span className="text-muted-foreground">No</span>
          ),
      },
      {
        id: "associations",
        header: "Explicit subnets",
        cell: ({ row }) => (
          <Link
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            to={`${routeTablePath(row.original.id)}?tab=subnets`}
          >
            <GitBranch className="size-3.5" />
            {row.original.associations.length}{" "}
            {row.original.associations.length === 1 ? "subnet" : "subnets"}
          </Link>
        ),
      },
      textColumn<RouteTable>({
        id: "region",
        header: "Region",
        accessor: (table) => table.region,
        responsive: "lg",
      }),
    ],
    [],
  )
  return (
    <DataTable<RouteTable>
      data={filtered}
      columns={columns}
      loading={tables.isLoading}
      error={tables.isError ? "Route tables could not be loaded." : undefined}
      onRetry={() => void tables.refetch()}
      getRowId={(table) => table.id}
      columnToolbar
      toolbar={
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Find route tables"
            placeholder="Find by name, route table ID, or VPC…"
            value={query}
            onChange={(event) => {
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous)
                  if (event.target.value) next.set("q", event.target.value)
                  else next.delete("q")
                  return next
                },
                { replace: true },
              )
            }}
          />
        </div>
      }
      empty={
        <EmptyState
          icon={Route}
          title={query ? "No matching route tables" : "No route tables yet"}
          description={
            query
              ? "Try a different name, ID, or VPC."
              : "Every VPC gets a main route table automatically. Create another to give some of its subnets different routes."
          }
          action={
            query
              ? {
                  label: "Clear search",
                  onClick: () => {
                    setParams((previous) => {
                      const next = new URLSearchParams(previous)
                      next.delete("q")
                      return next
                    })
                  },
                }
              : { label: "Create route table", onClick: onCreate }
          }
        />
      }
    />
  )
}
