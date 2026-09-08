import { useState } from "react"

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Skeleton,
} from "@datadack/common-ui"
import { GitBranch, Pencil } from "lucide-react"
import { Link } from "react-router-dom"

import { useRouteTableActions, useRouteTables, type RouteTable } from "../../route-tables"
import { VPC_ROUTES } from "../../vpc.constants"
import { useAllSubnets } from "../../vpc.hooks"

export function SubnetAssociations({ table }: Readonly<{ table: RouteTable }>) {
  const subnets = useAllSubnets()
  const tables = useRouteTables()
  const { associate } = useRouteTableActions()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const rows = (subnets.data ?? []).filter((subnet) => subnet.network_id === table.vpc_id)
  const explicit = new Set(table.associations.map((association) => association.subnet_id))
  const allExplicit = new Set(
    (tables.data ?? []).flatMap((item) =>
      item.associations.map((association) => association.subnet_id),
    ),
  )
  const associated = rows.filter(
    (row) => explicit.has(row.id) || (table.is_main && !allExplicit.has(row.id)),
  )
  if (subnets.isLoading || tables.isLoading) return <Skeleton className="h-48 w-full" />
  if (subnets.isError || tables.isError)
    return (
      <div role="alert" className="rounded-lg border p-6">
        Subnet associations could not be loaded.{" "}
        <Button
          variant="outline"
          onClick={() => {
            void subnets.refetch()
            void tables.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 className="font-semibold">
            Subnet associations{" "}
            <span className="ml-1 text-muted-foreground">({associated.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {table.is_main
              ? "Subnets without an explicit association use this main table."
              : "Choose the subnets that explicitly use this table."}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={table.network_status === "deleting"}
          onClick={() => {
            setSelected([...explicit])
            setOpen(true)
          }}
        >
          <Pencil className="mr-2 size-3.5" />
          Edit associations
        </Button>
      </div>
      {associated.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No subnet associations"
          description="Associate a subnet from this VPC to use this route table."
        />
      ) : (
        <div className="divide-y">
          {associated.map((subnet) => (
            <div
              key={subnet.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <Link
                  className="font-medium hover:underline"
                  to={VPC_ROUTES.detail(table.vpc_id) + "?tab=subnets"}
                >
                  {subnet.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{subnet.cidr}</p>
              </div>
              <Badge variant="outline">
                {explicit.has(subnet.id) ? "Explicit" : "Main table fallback"}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!associate.isPending) setOpen(next)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit subnet associations</DialogTitle>
            <DialogDescription>
              Selected subnets will use {table.name}. Moving a subnet replaces its previous explicit
              association.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
            {rows
              .filter((row) => row.status !== "deleting")
              .map((subnet) => (
                <label
                  key={subnet.id}
                  className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selected.includes(subnet.id)}
                    disabled={associate.isPending}
                    onCheckedChange={(checked) => {
                      setSelected((old) =>
                        checked === true
                          ? [...old, subnet.id]
                          : old.filter((id) => id !== subnet.id),
                      )
                    }}
                  />
                  <span>
                    <span className="block text-sm font-medium">{subnet.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{subnet.cidr}</span>
                  </span>
                </label>
              ))}
            {rows.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">This VPC has no subnets.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Removed associations fall back to the VPC’s main route table.
          </p>
          {associate.isError && (
            <p role="alert" className="text-sm text-destructive">
              Associations could not be saved. Please try again.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={associate.isPending}
              onClick={() => {
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              loading={associate.isPending}
              disabled={associate.isPending}
              onClick={() => {
                associate.mutate(
                  { id: table.id, subnet_ids: selected },
                  {
                    onSuccess: () => {
                      setOpen(false)
                    },
                  },
                )
              }}
            >
              Save associations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
