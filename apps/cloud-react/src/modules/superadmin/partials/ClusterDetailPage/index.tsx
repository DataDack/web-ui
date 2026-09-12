import { useMemo } from "react"

import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Skeleton,
  cn,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  ArrowLeft,
  Cpu,
  ExternalLink,
  MapPin,
  MemoryStick,
  RefreshCw,
  Server,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  useAdminAvailabilityZones,
  useClusterDetail,
  useSyncPVECluster,
} from "../../superadmin.hooks"
import type { PVENode } from "../../superadmin.types"

/**
 * One cluster, as an operator thinks about it.
 *
 * The fleet page lists clusters and lists nodes as two flat tables, and neither
 * answers "what IS this cluster" — which zones its machines are in, how many are
 * unplaced, how much hardware it has, where to click to reach Proxmox. That was
 * assembled by cross-referencing two tables and a tfvars file, which is how a
 * node ends up placed in the wrong zone.
 *
 * The page leads with what needs attention rather than with an inventory: an
 * unplaced node receives no workloads at all, and that is the single most
 * actionable thing a cluster can tell you.
 */
export function ClusterDetailPage() {
  const { t } = useTranslation()
  const { clusterId } = useParams<{ clusterId: string }>()
  const navigate = useNavigate()
  useScreen("superadmin.cluster-detail")

  const { data, isLoading, isError } = useClusterDetail(clusterId)
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
          <Link
            to={`/admin/pve-nodes/${row.original.id}`}
            className="font-medium hover:underline underline-offset-4"
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: "ip_address", header: t("superAdmin.pveFleet.address") },
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
        // Placement is the column that decides whether this machine does any
        // work at all, so it is not buried at the end.
        id: "zone",
        header: t("superAdmin.availabilityZones.title"),
        cell: ({ row }) =>
          row.original.availability_zone_id ? (
            <span className="text-sm">{zoneName(row.original.availability_zone_id)}</span>
          ) : (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="size-3" />
              {t("superAdmin.cluster.unplaced")}
            </Badge>
          ),
      },
      {
        id: "capacity",
        header: t("superAdmin.cluster.capacity"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.original.cpu_total} vCPU · {Math.round(row.original.ram_total_mb / 1024)} GB ·{" "}
            {row.original.storage_total_gb} GB
          </span>
        ),
      },
    ],
    [t, zoneName],
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Server}
        title={t("superAdmin.cluster.loadFailed")}
        description={t("superAdmin.cluster.loadFailedSubtitle")}
        action={
          <Button variant="outline" onClick={() => {
              void navigate("/admin/pve-clusters")
            }}>
            <ArrowLeft className="size-4" />
            {t("superAdmin.cluster.backToFleet")}
          </Button>
        }
      />
    )
  }

  const { cluster, nodes, unplaced_nodes: unplaced } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title={cluster.name}
        description={t("superAdmin.cluster.subtitle", { endpoint: cluster.endpoint })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/pve-clusters">
                <ArrowLeft className="size-4" />
                {t("superAdmin.cluster.backToFleet")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={sync.isPending}
              onClick={() => { sync.mutate({ id: cluster.id }); }}
            >
              <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} />
              {t("superAdmin.pveFleet.sync")}
            </Button>
            {/* The reason this page exists at all, for most visits. */}
            {data.console_url ? (
              <Button size="sm" asChild>
                <a href={data.console_url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="size-4" />
                  {t("superAdmin.cluster.openProxmox")}
                </a>
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Attention first. An unplaced node is a machine the platform will never
          schedule onto — it is in the cluster and doing nothing, and no error
          anywhere says so. */}
      {unplaced > 0 ? (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="font-medium">
                {t("superAdmin.cluster.unplacedTitle", { count: unplaced })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("superAdmin.cluster.unplacedBody")}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {cluster.last_sync_error ? (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="font-medium">{t("superAdmin.cluster.syncFailing")}</p>
              <p className="font-mono text-sm break-all text-muted-foreground">
                {cluster.last_sync_error}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Server}
          label={t("superAdmin.cluster.nodes")}
          value={`${data.online_nodes} / ${data.node_count}`}
          hint={t("superAdmin.cluster.nodesOnline")}
        />
        <Stat
          icon={MapPin}
          label={t("superAdmin.cluster.zones")}
          value={String(data.availability_zone_ids.length)}
          hint={
            data.availability_zone_ids.map((z) => zoneName(z)).join(", ") ||
            t("superAdmin.cluster.noZones")
          }
        />
        <Stat icon={Cpu} label={t("superAdmin.cluster.cpu")} value={`${data.cpu_total} vCPU`} />
        <Stat
          icon={MemoryStick}
          label={t("superAdmin.cluster.memory")}
          value={`${Math.round(data.ram_total_mb / 1024)} GB`}
          hint={`${data.storage_total_gb} GB ${t("superAdmin.cluster.storage")}`}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-medium">{t("superAdmin.cluster.members")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("superAdmin.cluster.membersHint")}
            </p>
          </div>
          {cluster.last_synced_at ? (
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("superAdmin.cluster.syncedAgo", { ago: timeAgo(cluster.last_synced_at) })}
            </span>
          ) : null}
        </div>
        {nodes.length === 0 ? (
          <EmptyState
            icon={Server}
            title={t("superAdmin.cluster.noMembers")}
            description={t("superAdmin.cluster.noMembersBody")}
          />
        ) : (
          <DataTable columns={columns} data={nodes} />
        )}
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: Readonly<{
  icon: typeof Server
  label: string
  value: string
  hint?: string
}>) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 truncate text-sm text-muted-foreground">{hint}</p> : null}
    </Card>
  )
}
