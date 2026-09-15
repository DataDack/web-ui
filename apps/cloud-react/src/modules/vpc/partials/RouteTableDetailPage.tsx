import { useMemo, useState } from "react"

import {
  actionsColumn,
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
  type RowAction,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, GitBranch, Info, Pencil, Plus, Route, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { ConfirmDialog, PageHeader, StatusBadge } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  ROUTE_TARGET_LABELS,
  useRouteTable,
  useRouteTableActions,
  type NetworkRoute,
} from "../route-tables"
import { VPC_ROUTES } from "../vpc.constants"
import { routeTargetLabel, useRouteTargets, type RouteTargets } from "./route-tables/route-targets"
import { RouteDialog } from "./route-tables/RouteDialog"
import { SubnetAssociations } from "./route-tables/SubnetAssociations"

function routeColumns({
  targets,
  editable,
  onEdit,
  onDelete,
}: {
  targets: RouteTargets
  editable: boolean
  onEdit: (route: NetworkRoute) => void
  onDelete: (route: NetworkRoute) => void
}): ColumnDef<NetworkRoute>[] {
  return [
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
        <span className="min-w-0">
          <span className="block truncate text-sm">{routeTargetLabel(targets, row.original)}</span>
          <span className="block text-xs text-muted-foreground">
            {ROUTE_TARGET_LABELS[row.original.target_type] ?? row.original.target_type}
          </span>
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
    actionsColumn<NetworkRoute>({
      ariaLabel: "Route actions",
      // The local route is derived from the VPC's CIDR rather than stored as an
      // editable row, and the API refuses both edits and deletes of it — so it
      // gets no menu at all rather than one that fails on click.
      actions: (route) =>
        route.target_type === "local" || !editable
          ? []
          : ([
              { label: "Edit route", icon: Pencil, onAction: onEdit },
              { label: "Delete route", icon: Trash2, destructive: true, onAction: onDelete },
            ] satisfies RowAction<NetworkRoute>[]),
    }),
  ]
}

export function RouteTableDetailPage() {
  useScreen("vpc.routers")
  const { id = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") === "subnets" ? "subnets" : "routes"
  const query = useRouteTable(id)
  const { remove, deleteRoute } = useRouteTableActions()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  // null while closed; { route: undefined } is the add form, a route the edit form.
  const [routeForm, setRouteForm] = useState<{ route?: NetworkRoute } | null>(null)
  const [routeToDelete, setRouteToDelete] = useState<NetworkRoute | null>(null)
  const table = query.data
  const targets = useRouteTargets(table?.vpc_id ?? "")
  // The API refuses every route write while the VPC is tearing down, so the
  // affordances come off rather than failing on click.
  const routesEditable = table?.network_status !== "deleting"
  const columns = useMemo(
    () =>
      routeColumns({
        targets,
        editable: routesEditable,
        onEdit: (route) => {
          setRouteForm({ route })
        },
        onDelete: setRouteToDelete,
      }),
    [targets, routesEditable],
  )
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            Routes <span className="text-muted-foreground">({table.routes.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <Badge variant="outline">IPv4</Badge>
            <Button
              variant="outline"
              disabled={!routesEditable}
              title={routesEditable ? undefined : "This VPC is being deleted"}
              onClick={() => {
                setRouteForm({})
              }}
            >
              <Plus className="mr-2 size-4" />
              Add route
            </Button>
          </div>
        </div>
        <DataTable<NetworkRoute>
          columns={columns}
          data={table.routes}
          getRowId={(route) => route.id}
          empty={
            <EmptyState
              icon={Route}
              title="No routes"
              description="Add a route to send traffic outside this VPC to a gateway or peering."
              action={
                routesEditable
                  ? {
                      label: "Add route",
                      onClick: () => {
                        setRouteForm({})
                      },
                    }
                  : undefined
              }
            />
          }
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            The local route connects addresses within this VPC and cannot be edited. Other routes
            may target an internet gateway, a NAT gateway, or a peering in this VPC; instance and
            VPN next hops are not supported by the fabric. Peering routes are added to the main
            table for you when a peering is accepted.
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
      {routeForm && (
        // Keyed so the add form and each edited row start from their own values
        // instead of whatever the previous opening left behind.
        <RouteDialog
          key={routeForm.route?.id ?? "new-route"}
          table={table}
          route={routeForm.route}
          open
          onOpenChange={(next) => {
            if (!next) setRouteForm(null)
          }}
        />
      )}
      <ConfirmDialog
        open={routeToDelete !== null}
        onOpenChange={(next) => {
          if (!next) setRouteToDelete(null)
        }}
        title="Delete route?"
        description={
          routeToDelete
            ? `Traffic for ${routeToDelete.destination_cidr} will follow the rest of this table instead.`
            : ""
        }
        confirmLabel="Delete route"
        loading={deleteRoute.isPending}
        onConfirm={() => {
          if (!routeToDelete) return
          deleteRoute.mutate(
            { tableID: table.id, routeID: routeToDelete.id },
            {
              onSuccess: () => {
                setRouteToDelete(null)
              },
            },
          )
        }}
      />
    </>
  )
}
