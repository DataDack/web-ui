import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  CopyButton,
  DataTable,
  EmptyState,
  Skeleton,
  TONE_CLASSES,
  cn,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import {
  useFleetStatus,
  useGenerateClusterAgentCredentials,
  useRefreshFleetStatus,
} from "../../superadmin.hooks"
import type { AgentCredentials, FleetNodeStatus, PVECluster } from "../../superadmin.types"

interface ClusterManagerTabProps {
  readonly cluster: PVECluster
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
export function ClusterManagerTab({ cluster }: ClusterManagerTabProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useFleetStatus()
  const refresh = useRefreshFleetStatus()

  const rows = useMemo(
    () => (data?.nodes ?? []).filter((n) => n.cluster_id === cluster.id),
    [data, cluster.id],
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
              <Badge variant="outline" className={TONE_CLASSES.success}>{t("superAdmin.fleet.healthy")}</Badge>
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
            return <Badge variant="outline" className={TONE_CLASSES.success}>{t("superAdmin.fleet.current")}</Badge>
          }
          return (
            <Badge variant="outline" className={cn("gap-1", TONE_CLASSES.warning)}>
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

  return (
    <div className="space-y-4">
      {/* The credential comes first because it is the precondition for
          everything below it: a cluster without one shows every member as "Not
          enrolled", and the table alone gives an operator nowhere to go. */}
      <ManagerCredentials cluster={cluster} />

      {rows.length === 0 ? (
        <EmptyState
          icon={ServerCog}
          title={t("superAdmin.cluster.noManagers")}
          description={t("superAdmin.cluster.noManagersBody")}
        />
      ) : (
        <FleetTable
          columns={columns}
          rows={rows}
          cached={!!data?.cached}
          probedAt={data?.probed_at ?? ""}
          refreshing={refresh.isPending}
          onRefresh={() => {
            refresh.mutate()
          }}
        />
      )}
    </div>
  )
}

function FleetTable({
  columns,
  rows,
  cached,
  probedAt,
  refreshing,
  onRefresh,
}: Readonly<{
  columns: ColumnDef<FleetNodeStatus>[]
  rows: FleetNodeStatus[]
  cached: boolean
  probedAt: string
  refreshing: boolean
  onRefresh: () => void
}>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {cached
            ? t("superAdmin.fleet.cachedAgo", { ago: timeAgo(probedAt) })
            : t("superAdmin.fleet.probedAgo", { ago: timeAgo(probedAt) })}
        </p>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}>
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          {t("superAdmin.fleet.reprobe")}
        </Button>
      </div>
      {/* No Card around the table: DataTable draws its own bordered frame, so
          wrapping it put a box inside a box — two borders, two radii, and a
          gutter of dead space between them. */}
      <DataTable columns={columns} data={rows} />
    </div>
  )
}

/**
 * The cluster's proxmox-manager credential, and the button that mints it.
 *
 * ONE PAIR PER CLUSTER, not per node. Every manager reads it from
 * /etc/pve/datadack/proxmox-manager.conf, which pmxcfs replicates to every
 * member — so a per-node pair could only ever authenticate on the member it was
 * written for. That is stated on the panel rather than left implied, because the
 * blast radius of the rotate button is the whole cluster.
 */
function ManagerCredentials({ cluster }: Readonly<{ cluster: PVECluster }>) {
  const { t } = useTranslation()
  const { mutate: generate, isPending } = useGenerateClusterAgentCredentials()
  const [issued, setIssued] = useState<AgentCredentials | null>(null)
  const [confirmRotate, setConfirmRotate] = useState(false)

  const enrolled = cluster.has_agent_secret && !!cluster.agent_client_id
  const clientID = issued?.client_id ?? cluster.agent_client_id

  const onGenerate = () => {
    generate(
      { id: cluster.id },
      {
        onSuccess: (creds) => {
          setIssued(creds)
          setConfirmRotate(false)
        },
      },
    )
  }

  return (
    <Card
      className={cn("p-4", enrolled ? undefined : "border-status-warning/25 bg-status-warning-bg")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {enrolled ? (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-status-success" />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-status-warning" />
          )}
          <div className="space-y-1">
            <p className="font-medium">
              {enrolled
                ? t("superAdmin.cluster.creds.title")
                : t("superAdmin.cluster.creds.missingTitle")}
            </p>
            <p className="max-w-prose text-sm text-muted-foreground">
              {enrolled
                ? t("superAdmin.cluster.creds.body")
                : t("superAdmin.cluster.creds.missingBody")}
            </p>
            {clientID ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("superAdmin.proxmoxManager.creds.clientId")}
                </span>
                <CopyButton value={clientID} className="text-[12px]" />
              </div>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant={enrolled ? "outline" : "gold"}
          size="sm"
          disabled={isPending}
          onClick={() => {
            // Rotating logs every manager in the cluster out at once, so it asks
            // twice. Minting the first pair breaks nothing and asks once.
            if (!enrolled || confirmRotate) onGenerate()
            else setConfirmRotate(true)
          }}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {(() => {
            if (!enrolled) return t("superAdmin.cluster.creds.generate")
            return confirmRotate
              ? t("superAdmin.cluster.creds.confirmRotate")
              : t("superAdmin.cluster.creds.rotate")
          })()}
        </Button>
      </div>

      {confirmRotate && enrolled && !issued ? (
        <p className="mt-3 text-sm text-status-warning">
          {t("superAdmin.cluster.creds.rotateWarning", { count: cluster.node_count })}
        </p>
      ) : null}

      {issued ? (
        <div className="mt-4 space-y-3 rounded-md border border-status-warning/40 bg-status-warning/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-foreground">
                {t("superAdmin.proxmoxManager.creds.shownOnceTitle")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {t("superAdmin.proxmoxManager.creds.shownOnceBody")}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("superAdmin.proxmoxManager.creds.clientId")}
              </p>
              <CopyButton value={issued.client_id} className="text-[12px]" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("superAdmin.proxmoxManager.creds.secret")}
              </p>
              <CopyButton value={issued.secret} className="text-[12px] break-all" />
            </div>
          </div>
          {/* The two lines, in the file they go in. Copying a pair out of a
              dialog and then working out where to put it is where an enrollment
              actually goes wrong. */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("superAdmin.cluster.creds.installTitle")}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {t("superAdmin.cluster.creds.installBody")}
            </p>
            <CopyButton
              value={`LB_MANAGER_CLIENT_ID=${issued.client_id}\nLB_MANAGER_SECRET=${issued.secret}`}
              className="text-[12px] break-all"
            />
          </div>
        </div>
      ) : null}
    </Card>
  )
}
