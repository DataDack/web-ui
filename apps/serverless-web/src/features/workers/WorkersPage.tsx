import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Activity, Cpu, Gauge, HardDrive, Network, Server, ServerOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { apiErrorMessage } from "@/lib/api"
import { formatMb, formatRate, usageTone } from "@/lib/format"
import { useDashboard, useFleetMetrics } from "@/lib/queries"
import type { NodeView, Worker } from "@/lib/schemas"

import {
  Badge,
  PageHeader,
  DataTable,
  EmptyState,
  StatCard,
  StatGrid,
  StatusBadge,
  cellMono,
  cellText,
  timeAgo,
} from "@datadack/common-ui"

const LIVE_STATES = ["ready", "active"]

/**
 * A row is a NODE, not a worker record.
 *
 * The two lists answer different questions and neither is a superset. The worker
 * registry knows what enrolled and what it declared it could do; the fleet view
 * knows what is actually reporting and what the machine underneath is doing
 * right now. A worker in one and not the other is the interesting case both
 * ways — registered but silent, or reporting under an id nobody registered — so
 * they are merged rather than one being chosen.
 */
interface FleetRow {
  nodeId: string
  hostname: string
  role: string
  state: string
  region?: string
  zone?: string
  internalIp?: string
  backend?: string
  cpuCount?: number
  cpuPercent?: number
  loadAverage1?: number
  capacityMemoryMb?: number
  freeMemoryMb?: number
  allocMemoryMb?: number
  capacityMaxSandboxes?: number
  sandboxCount?: number
  netRxBytesPerSec?: number
  netTxBytesPerSec?: number
  diskFreeMb?: number
  diskTotalMb?: number
  lastSeen?: string
  /** False when the registry has this worker but nothing has reported for it. */
  reporting: boolean
}

/** One registry row joined to whatever the fleet view last heard from it. */
function rowFromWorker(worker: Worker, node?: NodeView): FleetRow {
  return {
    nodeId: worker.id,
    hostname: worker.hostname,
    role: node?.role ?? "worker",
    state: worker.state,
    region: worker.region,
    zone: worker.zone,
    internalIp: worker.internalIp,
    backend: worker.backend,
    cpuCount: node?.cpuCount ?? worker.capacityVcpuMillis,
    cpuPercent: node?.host?.cpuPercent,
    loadAverage1: node?.host?.loadAverage1,
    capacityMemoryMb: worker.capacityMemoryMb,
    freeMemoryMb: node?.freeMemoryMb,
    allocMemoryMb: node?.allocMemoryMb,
    capacityMaxSandboxes: worker.capacityMaxSandboxes,
    sandboxCount: node?.sandboxCount,
    netRxBytesPerSec: node?.host?.netRxBytesPerSec,
    netTxBytesPerSec: node?.host?.netTxBytesPerSec,
    diskFreeMb: node?.host?.diskFreeMb,
    diskTotalMb: node?.host?.diskTotalMb,
    lastSeen: node?.lastSeen ?? worker.lastHeartbeatAt,
    reporting: Boolean(node),
  }
}

/** A node that is reporting but is in no registry row of its own — a gateway, or
 *  a worker whose record was reaped while it kept syncing. */
function rowFromNode(node: NodeView): FleetRow {
  return {
    nodeId: node.nodeId,
    hostname: node.hostname,
    role: node.role,
    state: node.state,
    cpuCount: node.cpuCount,
    cpuPercent: node.host?.cpuPercent,
    loadAverage1: node.host?.loadAverage1,
    capacityMemoryMb: node.totalMemoryMb,
    freeMemoryMb: node.freeMemoryMb,
    allocMemoryMb: node.allocMemoryMb,
    sandboxCount: node.sandboxCount,
    netRxBytesPerSec: node.host?.netRxBytesPerSec,
    netTxBytesPerSec: node.host?.netTxBytesPerSec,
    diskFreeMb: node.host?.diskFreeMb,
    diskTotalMb: node.host?.diskTotalMb,
    lastSeen: node.lastSeen,
    reporting: true,
  }
}

function mergeRows(workers: Worker[], nodes: NodeView[]): FleetRow[] {
  const byId = new Map<string, NodeView>()
  const byHostname = new Map<string, NodeView>()
  for (const node of nodes) {
    byId.set(node.nodeId, node)
    if (node.hostname) byHostname.set(node.hostname, node)
  }

  const rows = workers.map((worker) => {
    // Matched on id first and hostname second. A worker that re-enrolled after a
    // restart carries a new id while the box it runs on is the same, and
    // dropping to hostname keeps its live numbers attached across that.
    const node = byId.get(worker.id) ?? byHostname.get(worker.hostname)
    if (node) {
      byId.delete(node.nodeId)
      byHostname.delete(node.hostname)
    }
    return rowFromWorker(worker, node)
  })

  // Whatever is left is reporting without a registry row. Hiding these would
  // mean the cluster totals never add up to the rows on screen.
  for (const node of byId.values()) rows.push(rowFromNode(node))

  return rows
}

/** A percentage cell that reads as a bar, so a full node is visible at a glance. */
function UsageCell({ percent }: Readonly<{ percent?: number }>) {
  if (percent === undefined) return cellText()
  const clamped = Math.max(0, Math.min(100, percent))
  const tone = usageTone(clamped)
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-14 overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${String(clamped)}%` }} />
      </div>
      <span className="font-mono text-[12px] tabular-nums">{clamped.toFixed(0)}%</span>
    </div>
  )
}

export function WorkersPage() {
  const navigate = useNavigate()
  const dashboard = useDashboard()
  const fleet = useFleetMetrics()

  const cluster = fleet.data
  const workers = dashboard.data?.detail.workers
  const rows = useMemo(() => mergeRows(workers ?? [], cluster?.nodes ?? []), [workers, cluster])

  const columns = useMemo<ColumnDef<FleetRow>[]>(
    () => [
      {
        accessorKey: "hostname",
        header: "Hostname",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-medium">{row.original.hostname}</span>
            {row.original.role === "gateway" ? (
              <Badge variant="outline" className="text-[10px]">
                gateway
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.state || "unknown"}
            pulse={LIVE_STATES.includes(row.original.state.toLowerCase())}
          />
        ),
      },
      {
        accessorKey: "cpuPercent",
        header: "CPU",
        cell: ({ row }) => <UsageCell percent={row.original.cpuPercent} />,
      },
      {
        accessorKey: "loadAverage1",
        header: "Load",
        // Load counts runnable AND uninterruptible tasks, so it rises on IO
        // stalls that CPU% cannot see. The two together say more than either.
        cell: ({ row }) =>
          cellMono(
            row.original.loadAverage1 === undefined
              ? undefined
              : row.original.loadAverage1.toFixed(2),
          ),
      },
      {
        accessorKey: "freeMemoryMb",
        header: "Memory",
        cell: ({ row }) => {
          const { freeMemoryMb, capacityMemoryMb } = row.original
          if (freeMemoryMb === undefined) return cellMono(formatMb(capacityMemoryMb))
          const used =
            capacityMemoryMb && capacityMemoryMb > 0
              ? ((capacityMemoryMb - freeMemoryMb) / capacityMemoryMb) * 100
              : undefined
          return (
            <div className="flex flex-col gap-1">
              <UsageCell percent={used} />
              <span className="text-muted-foreground font-mono text-[11px]">
                {formatMb(freeMemoryMb)} free
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "sandboxCount",
        header: "Sandboxes",
        cell: ({ row }) =>
          cellMono(
            row.original.capacityMaxSandboxes
              ? `${String(row.original.sandboxCount ?? 0)} / ${String(row.original.capacityMaxSandboxes)}`
              : row.original.sandboxCount,
          ),
      },
      {
        accessorKey: "netRxBytesPerSec",
        header: "Network",
        cell: ({ row }) => {
          const rx = formatRate(row.original.netRxBytesPerSec)
          const tx = formatRate(row.original.netTxBytesPerSec)
          if (!rx && !tx) return cellText()
          return (
            <span className="font-mono text-[12px] tabular-nums">
              ↓{rx ?? "—"} ↑{tx ?? "—"}
            </span>
          )
        },
      },
      {
        accessorKey: "diskFreeMb",
        header: "Disk free",
        cell: ({ row }) => cellMono(formatMb(row.original.diskFreeMb)),
      },
      {
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) =>
          cellText(
            row.original.zone
              ? `${row.original.region ?? ""} / ${row.original.zone}`
              : row.original.region,
          ),
      },
      {
        accessorKey: "lastSeen",
        header: "Last seen",
        cell: ({ row }) =>
          row.original.reporting ? (
            cellMono(timeAgo(row.original.lastSeen))
          ) : (
            // Registered and silent. This is the gap worth noticing: the row
            // exists, so nothing looks broken, and no telemetry is arriving.
            <Badge variant="outline" className="text-warning text-[11px]">
              not reporting
            </Badge>
          ),
      },
    ],
    [],
  )

  const loading = dashboard.isLoading || fleet.isLoading
  const error = dashboard.error ?? fleet.error
  const refresh = () => {
    void dashboard.refetch()
    void fleet.refetch()
  }

  return (
    <>
      <PageHeader
        title="Fleet"
        icon={Server}
        description="Every node the platform runs on — workers and gateways — with what each reports about the machine underneath it."
      />

      <StatGrid className="mb-6">
        <StatCard
          label="Nodes reporting"
          value={
            cluster
              ? `${String(cluster.reportingNodes)} (${String(cluster.reportingWorkers)}w / ${String(cluster.reportingGateways)}g)`
              : rows.length
          }
          icon={Server}
          loading={loading}
        />
        <StatCard
          label="Cluster CPU"
          // Averaged across reporting nodes, not summed: adding percentages
          // across four nodes gives 400%, which reads as an emergency.
          value={cluster ? `${cluster.cpuPercent.toFixed(0)}%` : "—"}
          icon={Gauge}
          color={cluster && cluster.cpuPercent >= 85 ? "danger" : undefined}
          loading={loading}
        />
        <StatCard
          label="Memory free"
          value={formatMb(cluster?.freeMemoryMb) ?? "—"}
          icon={HardDrive}
          loading={loading}
        />
        <StatCard
          label="Network"
          value={
            cluster
              ? `↓${formatRate(cluster.netRxBytesPerSec) ?? "—"} ↑${formatRate(cluster.netTxBytesPerSec) ?? "—"}`
              : "—"
          }
          icon={Network}
          loading={loading}
        />
        <StatCard label="Sandboxes" value={cluster?.sandboxCount ?? 0} icon={Cpu} loading={loading} />
        <StatCard
          label="Load average"
          value={cluster ? cluster.loadAverage1.toFixed(2) : "—"}
          icon={Activity}
          loading={loading}
        />
      </StatGrid>

      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Filter nodes…"
        onRowClick={(row) => void navigate(`/workers/${encodeURIComponent(row.nodeId)}`)}
        empty={
          <EmptyState
            icon={ServerOff}
            title="No nodes enrolled"
            description="Functions cannot be placed until a worker joins. Enrol one with client credentials."
          />
        }
        onRefresh={refresh}
        refreshing={dashboard.isFetching || fleet.isFetching}
        error={error ? apiErrorMessage(error) : undefined}
        onRetry={refresh}
      />

      {cluster ? (
        <p className="text-muted-foreground mt-3 text-[12px]">
          Live figures cover a rolling {cluster.window} window and are held in memory only — they
          start empty after a control-plane restart, so they are a view of right now rather than a
          record.
        </p>
      ) : null}
    </>
  )
}
