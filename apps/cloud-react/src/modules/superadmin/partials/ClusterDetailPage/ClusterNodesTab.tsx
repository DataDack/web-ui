import { useMemo } from "react"

import { Badge, Button, DataTable, EmptyState, cn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, MapPinOff, RefreshCw, Server } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useAdminAvailabilityZones, useSyncPVECluster } from "../../superadmin.hooks"
import type { PVENode } from "../../superadmin.types"

/**
 * This cluster's machines.
 *
 * Placement is the column that decides whether a machine does any work at all,
 * so it sits beside the name rather than at the end: every scheduler matches a
 * region through a node's availability zone, and a node without one is in the
 * cluster and receives nothing, with no error anywhere saying so.
 */
export function ClusterNodesTab({
  clusterId,
  nodes,
}: Readonly<{ clusterId: string; nodes: PVENode[] }>) {
  const { t } = useTranslation()
  const { data: zones } = useAdminAvailabilityZones()
  const sync = useSyncPVECluster()

  const zoneName = useMemo(() => {
    const byId = new Map((zones ?? []).map((z) => [z.id, z.code || z.name]))
    return (id?: string) => (id ? (byId.get(id) ?? id) : "")
  }, [zones])

  const columns = useMemo<ColumnDef<PVENode>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("superAdmin.pveFleet.node"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to={`/admin/pve-nodes/${row.original.id}`}
              className="font-medium hover:underline underline-offset-4"
            >
              {row.original.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{row.original.ip_address}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("superAdmin.pveFleet.status"),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "online" ? "success" : "secondary"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "zone",
        header: t("superAdmin.availabilityZones.title"),
        cell: ({ row }) =>
          row.original.availability_zone_id ? (
            <span className="text-sm">{zoneName(row.original.availability_zone_id)}</span>
          ) : (
            <Link to={`/admin/pve-nodes/${row.original.id}`}>
              <Badge variant="warning" className="gap-1">
                <MapPinOff className="size-3" />
                {t("superAdmin.cluster.placeIt")}
              </Badge>
            </Link>
          ),
      },
      {
        id: "capacity",
        header: t("superAdmin.cluster.capacity"),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.cpu_total} vCPU · {Math.round(row.original.ram_total_mb / 1024)} GB ·{" "}
            {row.original.storage_total_gb} GB
          </span>
        ),
      },
      {
        id: "creds",
        header: t("superAdmin.cluster.credentials"),
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Badge variant={row.original.has_agent_secret ? "success" : "secondary"}>
              {t("superAdmin.cluster.agent")}
            </Badge>
            <Badge variant={row.original.has_webhook_secret ? "success" : "secondary"}>
              {t("superAdmin.cluster.webhook")}
            </Badge>
          </div>
        ),
      },
    ],
    [t, zoneName],
  )

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title={t("superAdmin.cluster.noMembers")}
        description={t("superAdmin.cluster.noMembersBody")}
        action={
          <Button
            variant="outline"
            disabled={sync.isPending}
            onClick={() => {
              sync.mutate({ id: clusterId })
            }}
          >
            <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} />
            {t("superAdmin.pveFleet.sync")}
          </Button>
        }
      />
    )
  }

  const unplaced = nodes.filter((n) => !n.availability_zone_id).length

  return (
    <div className="space-y-4">
      {unplaced > 0 ? (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">
              {t("superAdmin.cluster.unplacedTitle", { count: unplaced })}
            </p>
            <p className="text-sm text-muted-foreground">{t("superAdmin.cluster.unplacedBody")}</p>
          </div>
        </div>
      ) : null}
      <DataTable columns={columns} data={nodes} />
    </div>
  )
}
