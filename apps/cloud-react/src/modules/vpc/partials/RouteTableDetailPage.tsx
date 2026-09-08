import { useState } from "react"

import {
  Badge,
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  Skeleton,
  textColumn,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, GitBranch, Info, Route, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { ConfirmDialog, PageHeader, StatusBadge } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useRouteTable, useRouteTableActions, type NetworkRoute } from "../route-tables"
import { VPC_ROUTES } from "../vpc.constants"
import { SubnetAssociations } from "./route-tables/SubnetAssociations"

const routeColumns: ColumnDef<NetworkRoute>[] = [
  textColumn<NetworkRoute>({
    id: "destination",
    header: "Destination",
    accessor: (route) => route.destination_cidr,
    mono: true,
  }),
  {
    id: "target",
    header: "Target",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.target_type === "local"
          ? "local"
          : (row.original.target_id ?? row.original.target_type)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "origin",
    header: "Origin",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.target_type === "local" ? "VPC local route" : "Static route"}
      </span>
    ),
  },
]

export function RouteTableDetailPage() {
  useScreen("vpc.routers")
  const { id = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") === "subnets" ? "subnets" : "routes"
  const query = useRouteTable(id)
  const { remove } = useRouteTableActions()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const table = query.data
  if (query.isLoading)
    return (
      <div aria-label="Loading route table" aria-busy="true" className="space-y-5">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (query.isError || !table)
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Route table unavailable"
        description="It may have been deleted, or you may not have access to it."
        action={{ label: "Try again", onClick: () => void query.refetch() }}
      />
    )
  const details = (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-5 font-semibold">Details</h2>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">VPC</dt>
          <dd className="mt-2">
            <Link
              className="text-sm font-medium text-status-info hover:underline"
              to={VPC_ROUTES.detail(table.vpc_id)}
            >
              {table.vpc_name}
            </Link>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{table.cidr}</p>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Main route table</dt>
          <dd className="mt-2 text-sm font-medium">{table.is_main ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Explicit subnet associations</dt>
          <dd className="mt-2 text-sm font-medium">
            {table.associations.length} {table.associations.length === 1 ? "subnet" : "subnets"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Region</dt>
          <dd className="mt-2 font-mono text-sm">{table.region}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Owner account</dt>
          <dd className="mt-2 flex min-w-0 items-center gap-2">
            <CopyButton value={table.account_id} />
          </dd>
        </div>
      </dl>
    </section>
  )
  const routes = (
    <div className="space-y-5">
      {(table.provision_error || table.zone_type !== "evpn") && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warning/5 p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
          <div className="text-sm">
            <p className="font-medium">Routing needs attention</p>
            <p className="mt-1 text-muted-foreground">
              {table.provision_error ||
                "This VPC needs a networking migration before native routes can be verified."}
            </p>
            <Link
              to={VPC_ROUTES.ROUTERS}
              className="mt-2 inline-block text-status-info hover:underline"
            >
              View routers
            </Link>
          </div>
        </div>
      )}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Routes <span className="text-muted-foreground">({table.routes.length})</span>
          </h2>
          <Badge variant="outline">IPv4</Badge>
        </div>
        <DataTable<NetworkRoute>
          columns={routeColumns}
          data={table.routes}
          getRowId={(route) => route.id}
          empty={
            <EmptyState
              icon={Route}
              title="No routes"
              description="This route table has no recorded routes."
            />
          }
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            The local route connects addresses within this VPC and cannot be edited. Custom next-hop
            routes, edge associations, and route propagation are not supported yet.
          </p>
        </div>
      </section>
    </div>
  )
  return (
    <>
      <div className="space-y-5">
        <PageHeader
          icon={Route}
          title={table.name}
          breadcrumbs={[
            { label: "Networking", to: "/networking" },
            { label: "Route tables", to: "/networking/route-tables" },
            { label: table.name },
          ]}
          actions={
            <Button
              variant="outline"
              disabled={table.is_main || table.associations.length > 0}
              title={
                table.is_main
                  ? "The main route table cannot be deleted"
                  : "Remove subnet associations before deleting"
              }
              onClick={() => {
                setDeleting(true)
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          }
        />
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <CopyButton value={table.id} />
          {table.is_main && <Badge variant="outline">Main route table</Badge>}
        </div>
        {details}
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setParams(value === "routes" ? {} : { tab: value }, { replace: true })
          }}
        >
          <TabsList className="mb-5 max-w-full">
            <TabsTrigger value="routes">
              <Route className="mr-2 size-4" />
              Routes
            </TabsTrigger>
            <TabsTrigger value="subnets">
              <GitBranch className="mr-2 size-4" />
              Subnet associations
            </TabsTrigger>
          </TabsList>
          <TabsContent value="routes">{routes}</TabsContent>
          <TabsContent value="subnets">
            <SubnetAssociations table={table} />
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete route table?"
        description={`Delete ${table.name} and its routes. This action cannot be undone.`}
        confirmLabel="Delete route table"
        loading={remove.isPending}
        onConfirm={() => {
          remove.mutate(table.id, {
            onSuccess: () => {
              void navigate("/networking/route-tables")
            },
          })
        }}
      />
    </>
  )
}
