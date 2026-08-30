import { useMemo } from "react"

import { Activity, Gauge, HardDrive, Network, RefreshCw, Server, ServerOff } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { apiErrorMessage } from "@/lib/api"
import { formatMb, formatRate, orDash } from "@/lib/format"
import { useDashboard, useNodeMetrics } from "@/lib/queries"
import type { NodeDetail } from "@/lib/schemas"

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
/** Percent, from a ratio the control plane already derived over the window. */
function ratioPercent(ratio?: number): string {
  if (ratio === undefined || ratio <= 0) return "0%"
  return `${(ratio * 100).toFixed(ratio < 0.1 ? 1 : 0)}%`
}

function countOf(value?: number): string {
  return value === undefined ? "—" : value.toLocaleString()
}

function msOf(value?: number): string {
  if (value === undefined || value === 0) return "—"
  return `${value < 10 ? value.toFixed(1) : value.toFixed(0)} ms`
}

/**
 * The worker's execution-environment pool.
 *
 * Every number here was computed by the worker and served only on its own
 * /v1/worker/status — reachable by curling one container's ephemeral host port
 * and nowhere else. It now rides the sync, so this is the first place an
 * operator can see it without getting onto the box.
 */
function poolFacts(node?: NodeDetail): KeyValueItem[] {
  const pool = node?.pool
  if (!pool) return []
  return [
    { label: "Environments", value: countOf(pool.environments) },
    { label: "Idle", value: countOf(pool.idle) },
    { label: "Busy", value: countOf(pool.busy) },
    { label: "Creating", value: countOf(pool.creating) },
    // Warmth that was paid for, as opposed to warmth that happened.
    { label: "Provisioned", value: countOf(pool.provisioned) },
    { label: "Invocations", value: countOf(pool.invocations) },
    // The ratio behind p99, over the window rather than the process lifetime.
    { label: "Cold starts", value: countOf(pool.coldStarts) },
    { label: "Warm starts", value: countOf(pool.warmStarts) },
    { label: "Cold start rate", value: ratioPercent(node.coldStartRatio) },
    // Refused because the pool was at its ceiling — not the same as a capacity
    // rejection, which never reached the pool.
    { label: "Throttles", value: countOf(pool.throttles) },
    // Against cold starts, this says whether the idle timeout is tuned or is
    // manufacturing its own cold starts.
    { label: "Reaped", value: countOf(pool.reaped) },
    // A platform fault: a broken package or a missing runtime.
    { label: "Init failures", value: countOf(pool.initFailures) },
    // NOT a platform fault. Separate so nobody is paged for customer code.
    { label: "Function errors", value: countOf(pool.functionErrors) },
  ]
}

/** The gateway's edge counters, previously only on its own admin listener. */
function edgeFacts(node?: NodeDetail): KeyValueItem[] {
  const edge = node?.edge
  if (!edge) return []
  return [
    { label: "Known hosts", value: countOf(edge.knownHosts) },
    { label: "Cache entries", value: countOf(edge.cacheEntries) },
    { label: "Resolutions", value: countOf(edge.resolutions) },
    // The cutover's instrument: the per-product lookup cannot be retired until
    // this is flat at zero.
    { label: "Registry fallbacks", value: countOf(edge.fallbacks) },
    { label: "Fallback rate", value: ratioPercent(node.fallbackRatio) },
    { label: "Shed", value: countOf(edge.shed) },
    { label: "Certificates served", value: countOf(edge.certificatesServed) },
    // The number with no other home: a refused handshake never becomes a
    // request, so it is absent from every other figure on this page.
    { label: "Certificates refused", value: countOf(edge.certificatesRefused) },
    // Any non-zero value is a defect.
    { label: "Panics", value: countOf(edge.panics) },
    // Upstream, not end-to-end: this is the split that says whether the edge is
    // slow or the thing behind it is.
    { label: "Upstream p50", value: msOf(edge.upstreamP50Ms) },
    { label: "Upstream p95", value: msOf(edge.upstreamP95Ms) },
    { label: "Upstream p99", value: msOf(edge.upstreamP99Ms) },
  ]
}

/**
 * Cumulative serve counters.
 *
 * The card shows rates, which answer "what is happening now". These are the
 * totals behind them, plus the two the card has no room for: the in-flight PEAK,
 * which is the number that says whether a ceiling was ever actually reached, and
 * the WORST single queue wait, because a mean hides the tail callers notice.
 */
function serveFacts(node?: NodeDetail): KeyValueItem[] {
  const serve = node?.serve
  if (!serve) return []
  return [
    { label: "Served", value: countOf(serve.served) },
    { label: "Failed", value: countOf(serve.failed) },
    { label: "In flight", value: countOf(serve.inflightNow) },
    { label: "In-flight peak", value: countOf(serve.inflightPeak) },
    { label: "Queue mean", value: msOf(node.meanWaitMs) },
    { label: "Queue worst", value: msOf(serve.waitMaxMs) },
    { label: "Refused: unauthorized", value: countOf(serve.rejectedUnauthorized) },
    // The one that named the misrouting outage in a single glance.
    { label: "Refused: misdirected", value: countOf(serve.rejectedMisdirected) },
    { label: "Refused: no capacity", value: countOf(serve.rejectedNoCapacity) },
    { label: "Refused: not assigned", value: countOf(serve.rejectedNotAssigned) },
    // Expected during a rollout, so it is reported and not styled as a fault.
    { label: "Refused: draining", value: countOf(serve.rejectedDraining) },
  ]
}

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

  // Role-specific, and empty for the other role — which is why a section with no
  // items is dropped rather than showing a gateway a block of zeroed pool
  // counters. Built as one list so the component stays a renderer.
  const detailSections = useMemo(
    () =>
      [
        { title: "Requests", items: serveFacts(data ?? undefined) },
        { title: "Execution environments", items: poolFacts(data ?? undefined) },
        { title: "Edge", items: edgeFacts(data ?? undefined) },
      ].filter((section) => section.items.length > 0),
    [data],
  )

  // A 404 is not an error here. The node may exist and simply have stopped
  // reporting, which is a different thing to say than "request failed" — and it
  // is the thing an operator most needs to be told.
  const silent = !isLoading && !error && data === null

  return (
    <>
      <PageHeader
        title={data?.hostname ?? worker?.hostname ?? id ?? "Node"}
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
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
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
            <StatCard
              label="Sandboxes"
              value={data?.sandboxCount ?? 0}
              icon={Server}
              loading={isLoading}
            />
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

          {/* Everything the node reports that the summary card has no room for.
              These were being collected and dropped: the pool numbers reached
              the control plane and stopped there, and the gateway's counters
              were readable only on its own admin listener. */}
          {detailSections.map((section) => (
            <section key={section.title} className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-[12px] font-medium uppercase tracking-wide">
                {section.title}
              </h3>
              <KeyValueGrid items={section.items} />
            </section>
          ))}

          {data ? (
            <p className="text-muted-foreground mt-4 text-[12px]">
              {data.samples} readings over a rolling {data.window} window, held in memory only —
              this history starts empty after a control-plane restart.
            </p>
          ) : null}
        </>
      )}

      {error ? <p className="text-destructive mt-4 text-[13px]">{apiErrorMessage(error)}</p> : null}
    </>
  )
}
