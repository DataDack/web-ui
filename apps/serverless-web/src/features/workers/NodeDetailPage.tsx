import { useMemo } from "react"

import { Activity, Gauge, HardDrive, Network, RefreshCw, Server, ServerOff } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { apiErrorMessage } from "@/lib/api"
import { formatMb, formatRate, orDash } from "@/lib/format"
import { useDashboard, useNodeMetrics } from "@/lib/queries"

import {
  Badge,
  Button,
  EmptyState,
  KeyValueGrid,
  LineTimeChart,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  timeAgo,
  type ChartPoint,
  type KeyValueItem,
} from "@datadack/common-ui"

function regionOf(worker?: { region?: string; zone?: string }): string {
  if (!worker?.region) return "—"
  return worker.zone ? `${worker.region} / ${worker.zone}` : worker.region
}

function percentOf(value?: number): string {
  return value === undefined ? "—" : `${value.toFixed(0)}%`
}

function fixedOf(value?: number, digits = 2): string {
  return value === undefined ? "—" : value.toFixed(digits)
}

function diskOf(freeMb?: number, totalMb?: number): string {
  if (totalMb === undefined) return "—"
  return `${formatMb(freeMb) ?? "—"} free of ${formatMb(totalMb) ?? "—"}`
}

/**
 * One node, and the shape of what it has been doing.
 *
 * The list answers "is anything wrong"; this answers "what has this node been
 * doing", which is the question asked immediately after. A node sitting at 90%
 * CPU and one that spiked once are the same single number in a table, and the
 * difference between them decides whether anyone needs to act — so the series is
 * the point of this page, not decoration on it.
 */
export function NodeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, error, isFetching, isLoading, refetch } = useNodeMetrics(id)
  const dashboard = useDashboard()

  // The registry row, for the things telemetry does not carry: what the node
  // declared it could do, and what it was enrolled as.
  const worker = dashboard.data?.detail.workers.find((w) => w.id === id)

  const series = useMemo(() => data?.series ?? [], [data])

  const cpuPoints = useMemo<ChartPoint[]>(
    () => series.map((p) => ({ timestamp: p.at, values: [p.cpuPercent, p.loadAverage1] })),
    [series],
  )
  const memoryPoints = useMemo<ChartPoint[]>(
    () => series.map((p) => ({ timestamp: p.at, values: [p.freeMemoryMb, p.allocMemoryMb] })),
    [series],
  )
  const networkPoints = useMemo<ChartPoint[]>(
    () =>
      series.map((p) => ({
        // KB/s: raw byte counts render as six-digit ticks that say nothing at a
        // glance, and every rate on this page is read comparatively.
        timestamp: p.at,
        values: [p.netRxBytesPerSec / 1024, p.netTxBytesPerSec / 1024],
      })),
    [series],
  )
  const sandboxPoints = useMemo<ChartPoint[]>(
    () => series.map((p) => ({ timestamp: p.at, values: [p.sandboxCount] })),
    [series],
  )

  const facts = useMemo<KeyValueItem[]>(() => {
    const items: KeyValueItem[] = [
      { label: "Node id", value: id ?? "—", mono: true },
      { label: "Role", value: data?.role ?? "worker" },
      { label: "Last seen", value: data?.lastSeen ? timeAgo(data.lastSeen) : "—" },
      { label: "Samples in window", value: String(data?.samples ?? 0) },
      { label: "CPU cores", value: String(data?.cpuCount ?? worker?.capacityVcpuMillis ?? "—") },
      { label: "Internal IP", value: worker?.internalIp ?? "—", mono: true },
      { label: "Region", value: regionOf(worker) },
      { label: "Backend", value: worker?.backend ?? "—" },
      { label: "Architecture", value: worker?.architecture ?? "—" },
      { label: "Disk", value: diskOf(data?.host?.diskFreeMb, data?.host?.diskTotalMb) },
    ]
    if (worker?.supportedRuntimes?.length) {
      items.push({ label: "Runtimes", value: worker.supportedRuntimes.join(", ") })
    }
    return items
  }, [data, id, worker])

  // A 404 is not an error here. The node may exist and simply have stopped
  // reporting, which is a different thing to say than "request failed" — and it
  // is the thing an operator most needs to be told.
  const silent = !isLoading && !error && data === null

  return (
    <>
      <PageHeader
        title={data?.hostname ?? worker?.hostname ?? (id ?? "Node")}
        icon={Server}
        description="What this node has been doing, over the control plane's rolling in-memory window."
        breadcrumbs={[
          { label: "Fleet", to: "/workers" },
          { label: data?.hostname ?? worker?.hostname ?? "Node" },
        ]}
        renderLink={(crumb, children) => <Link to={crumb.to ?? "/workers"}>{children}</Link>}
        actions={
          <div className="flex items-center gap-2">
            {data ? (
              <>
                <Badge variant="outline" className="text-[11px]">
                  {data.role}
                </Badge>
                <StatusBadge status={data.state || "unknown"} />
              </>
            ) : null}
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              Refresh
            </Button>
          </div>
        }
      />

      {silent ? (
        <EmptyState
          icon={ServerOff}
          title="This node is not reporting"
          description={
            worker
              ? "It is still enrolled, so it has not been removed — but nothing has arrived from it inside the window. Check that the worker process is running and can reach the control plane."
              : "Nothing has arrived from this node inside the window, and no worker is enrolled under this id. It may have been reaped after going silent."
          }
        />
      ) : (
        <>
          <StatGrid className="mb-6">
            <StatCard
              label="CPU"
              value={percentOf(data?.host?.cpuPercent)}
              icon={Gauge}
              color={(data?.host?.cpuPercent ?? 0) >= 85 ? "danger" : undefined}
              loading={isLoading}
            />
            <StatCard
              label="Load (1m)"
              value={fixedOf(data?.host?.loadAverage1)}
              icon={Activity}
              loading={isLoading}
            />
            <StatCard
              label="Memory free"
              value={orDash(formatMb(data?.freeMemoryMb))}
              icon={HardDrive}
              loading={isLoading}
            />
            <StatCard
              label="Network"
              value={`↓${orDash(formatRate(data?.host?.netRxBytesPerSec))} ↑${orDash(formatRate(data?.host?.netTxBytesPerSec))}`}
              icon={Network}
              loading={isLoading}
            />
            <StatCard label="Sandboxes" value={data?.sandboxCount ?? 0} icon={Server} loading={isLoading} />
          </StatGrid>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <LineTimeChart
              title="CPU and load"
              unit="%"
              points={cpuPoints}
              series={[
                { label: "CPU %", color: "var(--chart-1)" },
                { label: "Load 1m", color: "var(--chart-2)" },
              ]}
              emptyLabel="No readings in the window yet"
            />
            <LineTimeChart
              title="Memory"
              unit="MB"
              points={memoryPoints}
              series={[
                { label: "Free", color: "var(--chart-3)" },
                { label: "Allocated", color: "var(--chart-4)" },
              ]}
              emptyLabel="No readings in the window yet"
            />
            <LineTimeChart
              title="Network throughput"
              unit="KB/s"
              points={networkPoints}
              series={[
                { label: "In", color: "var(--chart-1)" },
                { label: "Out", color: "var(--chart-5)" },
              ]}
              emptyLabel="No readings in the window yet"
            />
            <LineTimeChart
              title="Sandboxes"
              points={sandboxPoints}
              series={[{ label: "Running", color: "var(--chart-2)" }]}
              emptyLabel="No readings in the window yet"
            />
          </div>

          <KeyValueGrid items={facts} />

          {data ? (
            <p className="text-muted-foreground mt-4 text-[12px]">
              {data.samples} readings over a rolling {data.window} window, held in memory only —
              this history starts empty after a control-plane restart.
            </p>
          ) : null}
        </>
      )}

      {error ? (
        <p className="text-destructive mt-4 text-[13px]">{apiErrorMessage(error)}</p>
      ) : null}
    </>
  )
}
