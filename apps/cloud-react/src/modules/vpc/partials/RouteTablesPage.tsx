import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpRight, GitBranch, Plus, RefreshCw, Route, Search } from "lucide-react"
import { Badge, Button, DataTable, EmptyState, Input, textColumn } from "@datadack/common-ui"
import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"
import { routeTablePath, useRouteTables, type RouteTable } from "../route-tables"
import { VPC_ROUTES } from "../vpc.constants"
import { CreateRouteTableDialog } from "./route-tables/CreateRouteTableDialog"

export function RouteTablesPage() {
  useScreen("vpc.routers")
  const tables = useRouteTables()
  const [open, setOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const query = params.get("q") ?? ""
  const filtered = useMemo(() => (tables.data ?? []).filter((table) => `${table.name} ${table.id} ${table.vpc_name} ${table.vpc_id}`.toLowerCase().includes(query.toLowerCase())), [tables.data, query])
  const columns = useMemo<ColumnDef<RouteTable>[]>(() => [
    { id: "name", header: "Name", accessorFn: (table) => table.name, cell: ({ row }) => <Link className="group flex items-center gap-2 font-medium text-foreground hover:text-primary" to={routeTablePath(row.original.id)}><Route className="size-4 shrink-0 text-muted-foreground" /><span>{row.original.name}</span><ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" /></Link> },
    textColumn<RouteTable>({ id: "id", header: "Route table ID", accessor: (table) => table.id, mono: true, responsive: "lg" }),
    { id: "vpc", header: "VPC", cell: ({ row }) => <Link className="text-status-info hover:underline" to={VPC_ROUTES.detail(row.original.vpc_id)}>{row.original.vpc_name}</Link> },
    { id: "main", header: "Main", cell: ({ row }) => row.original.is_main ? <Badge variant="outline">Main</Badge> : <span className="text-muted-foreground">No</span> },
    { id: "associations", header: "Explicit subnets", cell: ({ row }) => <Link className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground" to={`${routeTablePath(row.original.id)}?tab=subnets`}><GitBranch className="size-3.5" />{row.original.associations.length} subnets</Link> },
    textColumn<RouteTable>({ id: "region", header: "Region", accessor: (table) => table.region, responsive: "lg" }),
  ], [])
  return <div className="space-y-5">
    <PageHeader icon={Route} title="Route tables" description="Manage VPC routes and the subnets that use them." breadcrumbs={[{ label: "Networking" }, { label: "Route tables" }]} actions={<><Button variant="ghost" size="icon" aria-label="Refresh route tables" disabled={tables.isFetching} onClick={() => void tables.refetch()}><RefreshCw className={`size-4 ${tables.isFetching ? "animate-spin" : ""}`} /></Button><Button variant="gold" onClick={() => { setOpen(true) }}><Plus className="mr-2 size-4" />Create route table</Button></>} />
    <DataTable<RouteTable> data={filtered} columns={columns} loading={tables.isLoading} error={tables.isError ? "Route tables could not be loaded." : undefined} onRetry={() => void tables.refetch()} getRowId={(table) => table.id} columnToolbar toolbar={<div className="relative w-full max-w-md"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" aria-label="Find route tables" placeholder="Find by name, route table ID, or VPC…" value={query} onChange={(event) => { setParams((previous) => { const next = new URLSearchParams(previous); if (event.target.value) next.set("q", event.target.value); else next.delete("q"); return next }, { replace: true }) }} /></div>} empty={<EmptyState icon={Route} title={query ? "No matching route tables" : "No route tables yet"} description={query ? "Try a different name, ID, or VPC." : "Create a route table to view local routes and organize subnet associations."} action={query ? { label: "Clear search", onClick: () => { setParams({}) } } : { label: "Create route table", onClick: () => { setOpen(true) } }} />} />
    <CreateRouteTableDialog open={open} onOpenChange={setOpen} />
  </div>
}
