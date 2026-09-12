import { useMemo, useState } from "react"

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
  CheckCircle2,
  ExternalLink,
  MapPinOff,
  PlugZap,
  RefreshCw,
  Server,
  ServerCog,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useFleetStatus, useRefreshFleetStatus } from "../../superadmin.hooks"
import type { FleetNodeStatus } from "../../superadmin.types"

/** The filters an operator actually wants, which are all "show me the broken ones". */
type Filter = "all" | "attention" | "unreachable" | "templates" | "unplaced"

/**
 * What counts as needing attention, in one place.
 *
 * The tile, the filter and the empty state all ask this question, and three
 * copies of it would eventually disagree about whether an unplaced node is a
 * problem — it is: placement matches a region through a node's zone, so a node
 * without one is in the fleet and doing nothing.
 */
function needsAttention(n: FleetNodeStatus): boolean {
  return (
    n.manager_status === "unreachable" ||
    n.node_status !== "online" ||
    n.templates_out_of_date ||
    !n.placed
  )
}

/** Applies a filter. Extracted so the page component stays readable. */
function applyFilter(all: FleetNodeStatus[], filter: Filter): FleetNodeStatus[] {
  switch (filter) {
    case "attention":
      return all.filter(needsAttention)
    case "unreachable":
      return all.filter((n) => n.manager_status === "unreachable")
    case "templates":
      return all.filter((n) => n.templates_out_of_date)
    case "unplaced":
      return all.filter((n) => !n.placed)
    default:
      return all
  }
}

/**
 * Fleet health: is anything wrong, across every node, in one answer.
 *
 * All of this existed per node already, behind two endpoints reachable by
 * clicking into a node. That is unusable as an answer to "are the templates
 * synced" — it is one question per node, and nobody asks it a thousand times.
 * The result was that nobody knew, which is the same as not having the feature.
 *
 * The page is ordered worst-first by the server, and it opens on the rows that
 * need attention rather than on a full inventory: a dashboard's job on arrival
 * is to say whether anything needs doing.
 */
export function FleetStatusPage() {
  const { t } = useTranslation()
  useScreen("superadmin.fleet-status")

  const { data, isLoading, isError } = useFleetStatus()
  const refresh = useRefreshFleetStatus()
  const [filter, setFilter] = useState<Filter>("all")

  const rows = useMemo(() => applyFilter(data?.nodes ?? [], filter), [data, filter])

  const columns = useMemo<ColumnDef<FleetNodeStatus>[]>(
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
        id: "cluster",
        header: t("superAdmin.fleet.cluster"),
        cell: ({ row }) =>
          row.original.cluster_id ? (
            <Link
              to={`/admin/pve-clusters/${row.original.cluster_id}`}
              className="text-sm hover:underline underline-offset-4"
            >
              {row.original.cluster_name ?? row.original.cluster_id}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: "placement",
        header: t("superAdmin.fleet.placement"),
        cell: ({ row }) =>
          row.original.placed ? (
            <Badge variant="secondary">{t("superAdmin.fleet.placed")}</Badge>
          ) : (
            // Not a cosmetic warning: an unplaced node is matched by no region,
            // so it receives no workloads and nothing else reports that.
            <Badge variant="warning" className="gap-1">
              <MapPinOff className="size-3" />
              {t("superAdmin.cluster.unplaced")}
            </Badge>
          ),
      },
      {
        id: "manager",
        header: t("superAdmin.proxmoxManager.title"),
        cell: ({ row }) => <ManagerCell node={row.original} />,
      },
      {
        id: "templates",
        header: t("superAdmin.fleet.templates"),
        cell: ({ row }) => <TemplatesCell node={row.original} />,
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={ServerCog}
        title={t("superAdmin.fleet.loadFailed")}
        description={t("superAdmin.fleet.loadFailedSubtitle")}
        action={
          <Button variant="outline" onClick={() => { refresh.mutate(); }}>
            <RefreshCw className="size-4" />
            {t("common.retry")}
          </Button>
        }
      />
    )
  }

  const attention = data.nodes.filter(needsAttention).length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("superAdmin.fleet.title")}
        description={t("superAdmin.fleet.subtitle")}
        actions={
          <div className="flex items-center gap-3">
            {/* Surfaced, not hidden: a silently cached "healthy" is how a dead
                fleet looks fine to whoever is deciding whether to act. */}
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {data.cached
                ? t("superAdmin.fleet.cachedAgo", { ago: timeAgo(data.probed_at) })
                : t("superAdmin.fleet.probedAgo", { ago: timeAgo(data.probed_at) })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={refresh.isPending}
              onClick={() => { refresh.mutate(); }}
            >
              <RefreshCw className={cn("size-4", refresh.isPending && "animate-spin")} />
              {t("superAdmin.fleet.reprobe")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          active={filter === "attention"}
          onClick={() => { setFilter(filter === "attention" ? "all" : "attention"); }}
          icon={attention > 0 ? AlertTriangle : CheckCircle2}
          tone={attention > 0 ? "warning" : "good"}
          value={String(attention)}
          label={t("superAdmin.fleet.needAttention")}
          hint={t("superAdmin.fleet.ofTotal", { total: data.total })}
        />
        <Tile
          active={filter === "unreachable"}
          onClick={() => { setFilter(filter === "unreachable" ? "all" : "unreachable"); }}
          icon={PlugZap}
          tone={data.managers_unreachable > 0 ? "bad" : "muted"}
          value={String(data.managers_unreachable)}
          label={t("superAdmin.fleet.managersUnreachable")}
          hint={t("superAdmin.fleet.managersHealthy", { count: data.managers_healthy })}
        />
        <Tile
          active={filter === "templates"}
          onClick={() => { setFilter(filter === "templates" ? "all" : "templates"); }}
          icon={Server}
          tone={data.templates_out_of_date > 0 ? "warning" : "good"}
          value={String(data.templates_out_of_date)}
          label={t("superAdmin.fleet.templatesBehind")}
          hint={t("superAdmin.fleet.templatesHint")}
        />
        <Tile
          active={filter === "unplaced"}
          onClick={() => { setFilter(filter === "unplaced" ? "all" : "unplaced"); }}
          icon={MapPinOff}
          tone={data.unplaced > 0 ? "warning" : "muted"}
          value={String(data.unplaced)}
          label={t("superAdmin.cluster.unplaced")}
          hint={t("superAdmin.fleet.unplacedHint")}
        />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={
              filter === "all"
                ? t("superAdmin.fleet.noNodes")
                : t("superAdmin.fleet.nothingMatches")
            }
            description={
              filter === "all"
                ? t("superAdmin.fleet.noNodesBody")
                : t("superAdmin.fleet.nothingMatchesBody")
            }
            action={
              filter === "all" ? undefined : (
                <Button variant="outline" onClick={() => { setFilter("all"); }}>
                  {t("superAdmin.fleet.showAll")}
                </Button>
              )
            }
          />
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </Card>
    </div>
  )
}

/** "no_manager" is not a failure — it means the node was never enrolled, which
 *  sends an operator somewhere completely different from an unreachable one. */
function ManagerCell({ node }: Readonly<{ node: FleetNodeStatus }>) {
  const { t } = useTranslation()
  if (node.manager_status === "no_manager") {
    return <Badge variant="secondary">{t("superAdmin.fleet.notEnrolled")}</Badge>
  }
  if (node.manager_status === "unreachable") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive">{t("superAdmin.fleet.unreachable")}</Badge>
        <a
          href={node.manager_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-muted-foreground hover:text-foreground"
          title={node.manager_url}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    )
  }
  return (
    <div className="flex items-baseline gap-2">
      <Badge variant="success">{t("superAdmin.fleet.healthy")}</Badge>
      <span className="text-xs tabular-nums text-muted-foreground">{node.latency_ms} ms</span>
      {node.manager_version ? (
        <span className="font-mono text-xs text-muted-foreground">{node.manager_version}</span>
      ) : null}
    </div>
  )
}

function TemplatesCell({ node }: Readonly<{ node: FleetNodeStatus }>) {
  const { t } = useTranslation()
  if (node.template_state === "unknown" || node.manager_status !== "healthy") {
    // Unknown is not "fine". A node whose manager will not answer cannot report
    // its templates, and showing a green tick there is how a broken node passes.
    return <span className="text-sm text-muted-foreground">{t("superAdmin.fleet.unknown")}</span>
  }
  if (!node.templates_out_of_date) {
    return <Badge variant="success">{t("superAdmin.fleet.current")}</Badge>
  }
  return (
    <Badge variant="warning" className="gap-1">
      <AlertTriangle className="size-3" />
      {t("superAdmin.fleet.behindCount", {
        missing: node.templates_missing,
        stale: node.templates_stale,
      })}
    </Badge>
  )
}

function Tile({
  icon: Icon,
  value,
  label,
  hint,
  tone,
  active,
  onClick,
}: Readonly<{
  icon: typeof Server
  value: string
  label: string
  hint: string
  tone: "good" | "warning" | "bad" | "muted"
  active: boolean
  onClick: () => void
}>) {
  const toneClass = {
    good: "text-success",
    warning: "text-warning",
    bad: "text-destructive",
    muted: "text-muted-foreground",
  }[tone]
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "cursor-pointer p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-primary",
      )}
    >
      <div className={cn("flex items-center gap-2", toneClass)}>
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-sm text-muted-foreground">{hint}</p>
    </Card>
  )
}
