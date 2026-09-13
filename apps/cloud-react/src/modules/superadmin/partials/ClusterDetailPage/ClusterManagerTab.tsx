import { useMemo } from "react"

import { Badge, Button, Card, DataTable, EmptyState, Skeleton, cn, timeAgo } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, ExternalLink, RefreshCw, ServerCog } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useFleetStatus, useRefreshFleetStatus } from "../../superadmin.hooks"
import type { FleetNodeStatus } from "../../superadmin.types"

interface ClusterManagerTabProps {
  readonly clusterId: string
}

/**
 * This cluster's managers and template state.
 *
 * Backed by the same fleet probe as the sidebar's platform-health page, narrowed
 * to one cluster. Two different questions share one probe on purpose: "is
 * anything wrong anywhere" is what an operator opens the console to ask, and "is
 * THIS cluster healthy" is what they ask once they are standing in front of one.
 * Probing twice would double the outbound connections for the same answer.
 */
export function ClusterManagerTab({ clusterId }: ClusterManagerTabProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useFleetStatus()
  const refresh = useRefreshFleetStatus()

  const rows = useMemo(
    () => (data?.nodes ?? []).filter((n) => n.cluster_id === clusterId),
    [data, clusterId],
  )

  const columns = useMemo<ColumnDef<FleetNodeStatus>[]>(
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
      {
        id: "manager",
        header: t("superAdmin.proxmoxManager.title"),
        cell: ({ row }) => {
          const n = row.original
          if (n.manager_status === "no_manager") {
            // Never enrolled is a different problem from one that will not
            // answer — conflating them sends someone to debug a network path
            // that was never supposed to exist.
            return <Badge variant="secondary">{t("superAdmin.fleet.notEnrolled")}</Badge>
          }
          if (n.manager_status === "unreachable") {
            return (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{t("superAdmin.fleet.unreachable")}</Badge>
                <a
                  href={n.manager_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground hover:text-foreground"
                  title={n.manager_url}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            )
          }
          return (
            <div className="flex items-baseline gap-2">
              <Badge variant="success">{t("superAdmin.fleet.healthy")}</Badge>
              <span className="text-xs tabular-nums text-muted-foreground">{n.latency_ms} ms</span>
              {n.manager_version ? (
                <span className="font-mono text-xs text-muted-foreground">{n.manager_version}</span>
              ) : null}
            </div>
          )
        },
      },
      {
        id: "templates",
        header: t("superAdmin.fleet.templates"),
        cell: ({ row }) => {
          const n = row.original
          // Unknown is not "fine": a node whose manager will not answer cannot
          // report its templates, and a green tick there is how a broken node
          // passes inspection.
          if (n.template_state === "unknown" || n.manager_status !== "healthy") {
            return <span className="text-sm text-muted-foreground">{t("superAdmin.fleet.unknown")}</span>
          }
          if (!n.templates_out_of_date) {
            return <Badge variant="success">{t("superAdmin.fleet.current")}</Badge>
          }
          return (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="size-3" />
              {t("superAdmin.fleet.behindCount", {
                missing: n.templates_missing,
                stale: n.templates_stale,
              })}
            </Badge>
          )
        },
      },
      {
        id: "seen",
        header: t("superAdmin.fleet.lastSeen"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.last_seen_at ? timeAgo(row.original.last_seen_at) : "—"}
          </span>
        ),
      },
    ],
    [t],
  )

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ServerCog}
        title={t("superAdmin.cluster.noManagers")}
        description={t("superAdmin.cluster.noManagersBody")}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data?.cached
            ? t("superAdmin.fleet.cachedAgo", { ago: timeAgo(data.probed_at) })
            : t("superAdmin.fleet.probedAgo", { ago: timeAgo(data?.probed_at ?? "") })}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={refresh.isPending}
          onClick={() => {
            refresh.mutate()
          }}
        >
          <RefreshCw className={cn("size-4", refresh.isPending && "animate-spin")} />
          {t("superAdmin.fleet.reprobe")}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <DataTable columns={columns} data={rows} />
      </Card>
    </div>
  )
}
