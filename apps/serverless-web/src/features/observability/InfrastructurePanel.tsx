import { useMemo } from "react"

import { Server } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { formatMb, formatRate, orDash, usageTone } from "@/lib/format"
import type { ClusterView, NodeView } from "@/lib/schemas"

import { Badge, EmptyState, StatusBadge, timeAgo } from "@datadack/common-ui"

/**
 * The machines under the workload, beside the workload's own numbers.
 *
 * Separating them is how an incident takes an hour: latency doubles, the
 * function charts show it, and nothing on the same screen says the node it runs
 * on is at 95% CPU. Both live here so the question "is this the code or the
 * box" is answered by looking rather than by opening a second tool.
 */

/** A labelled bar. Percentages are read comparatively, and a number alone makes
 *  the reader do the comparing. */
function Meter({ label, percent, detail }: Readonly<{ label: string; percent?: number; detail?: string }>) {
  const clamped = percent === undefined ? undefined : Math.max(0, Math.min(100, percent))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-[11px]">{label}</span>
        <span className="font-mono text-[11px] tabular-nums">
          {clamped === undefined ? "—" : `${clamped.toFixed(0)}%`}
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${clamped === undefined ? "bg-muted" : usageTone(clamped)}`}
          style={{ width: `${String(clamped ?? 0)}%` }}
        />
      </div>
      {detail ? <span className="text-muted-foreground text-[11px]">{detail}</span> : null}
    </div>
  )
}

/**
 * Why a node refused, not just how often.
 *
 * Each reason is a different fault with a different fix: unauthorized means the
 * control plane and the node disagree about a credential, misdirected means an
 * address resolves to more than one machine, no-capacity is a scaling decision,
 * and draining is normal. Summing them would have hidden the misrouting outage
 * behind a number that looked like ordinary throttling.
 */
function rejectionReasons(node: NodeView): { label: string; count: number }[] {
  const serve = node.serve
  if (!serve) return []
  return [
    { label: "unauthorized", count: serve.rejectedUnauthorized ?? 0 },
    { label: "misdirected", count: serve.rejectedMisdirected ?? 0 },
    { label: "no capacity", count: serve.rejectedNoCapacity ?? 0 },
    { label: "not assigned", count: serve.rejectedNotAssigned ?? 0 },
    // Draining is deliberate and expected during a rollout, so it is not shown
    // as a fault alongside the others.
  ].filter((reason) => reason.count > 0)
}

function memoryPercent(node: NodeView): number | undefined {
  const total = node.host?.totalMemoryMb ?? node.totalMemoryMb
  const free = node.host?.availableMemoryMb ?? node.freeMemoryMb
  if (!total || free === undefined) return undefined
  return ((total - free) / total) * 100
}

export function InfrastructurePanel({
  cluster,
  loading,
}: Readonly<{ cluster?: ClusterView; loading: boolean }>) {
  const navigate = useNavigate()

  // Grouped by role, because the two answer different questions. A saturated
  // gateway and a saturated worker mean different things and are fixed
  // differently, and interleaving them buries whichever there are fewer of.
  const grouped = useMemo(() => {
    const nodes = cluster?.nodes ?? []
    return {
      gateway: nodes.filter((n) => n.role === "gateway"),
      worker: nodes.filter((n) => n.role !== "gateway"),
    }
  }, [cluster])

  if (!loading && (cluster?.nodes.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No nodes reporting"
        description="Workers report on their sync and the gateway reports on its own timer. Nothing has arrived inside the window."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {(["worker", "gateway"] as const).map((role) =>
        grouped[role].length === 0 ? null : (
          <section key={role}>
            <h3 className="text-muted-foreground mb-2 text-[12px] font-medium uppercase tracking-wide">
              {role === "worker" ? "Workers" : "Gateways"}
              <span className="ml-2 font-mono normal-case">{grouped[role].length}</span>
            </h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {grouped[role].map((node) => (
                <button
                  key={node.nodeId}
                  type="button"
                  onClick={() => void navigate(`/workers/${encodeURIComponent(node.nodeId)}`)}
                  className="border-border bg-card hover:border-brand-gold/50 flex flex-col gap-3 rounded-xl border p-3 text-left transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[12px] font-medium">
                      {node.hostname || node.nodeId}
                    </span>
                    <StatusBadge status={node.state || "unknown"} />
                  </div>

                  <Meter
                    label="CPU"
                    percent={node.host?.cpuPercent}
                    detail={
                      node.host?.cpuCores
                        ? `${String(node.host.cpuCores)} cores · load ${(node.host.loadAverage1 ?? 0).toFixed(2)}`
                        : undefined
                    }
                  />
                  <Meter
                    label="Memory"
                    percent={memoryPercent(node)}
                    detail={`${orDash(formatMb(node.host?.availableMemoryMb ?? node.freeMemoryMb))} available`}
                  />

                  {/* Throughput and refusals, per node. This is the row that
                      makes load distribution visible: a fleet balancing evenly
                      and a fleet sending everything to one node look identical
                      in a cluster total, and this platform lost a week to the
                      second case. */}
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">req/s</span>
                      <span className="font-mono tabular-nums">
                        {node.servedPerSec.toFixed(node.servedPerSec < 10 ? 1 : 0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">refused/s</span>
                      <span
                        className={`font-mono tabular-nums ${node.rejectedPerSec > 0 ? "text-status-danger" : ""}`}
                      >
                        {node.rejectedPerSec.toFixed(node.rejectedPerSec < 10 ? 1 : 0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {/* Latency before the function's code starts. It is the
                          clearest saturation signal a node produces, and it is
                          not the function's fault. */}
                      <span className="text-muted-foreground">queue</span>
                      <span
                        className={`font-mono tabular-nums ${node.meanWaitMs >= 50 ? "text-status-warning" : ""}`}
                      >
                        {node.meanWaitMs < 1 ? "0" : node.meanWaitMs.toFixed(0)} ms
                      </span>
                    </div>
                  </div>

                  {rejectionReasons(node).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {rejectionReasons(node).map((reason) => (
                        <Badge
                          key={reason.label}
                          variant="outline"
                          className="text-status-danger text-[10px]"
                        >
                          {reason.label} {reason.count}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
                    <span>
                      ↓{orDash(formatRate(node.host?.netRxBytesPerSec))} ↑
                      {orDash(formatRate(node.host?.netTxBytesPerSec))}
                    </span>
                    <span>{orDash(formatMb(node.host?.diskFreeMb))} disk</span>
                    <span>
                      {/* A gateway has no sandboxes; this column carries its
                          in-flight requests, which is the same question. */}
                      {node.role === "gateway"
                        ? `${String(node.sandboxCount ?? 0)} in flight`
                        : `${String(node.sandboxCount ?? 0)} sandboxes`}
                    </span>
                    <span>{timeAgo(node.lastSeen)}</span>
                  </div>

                  {/* Workers sharing a machine share its limits. Saying so on
                      the card stops two cards reading as two machines' worth of
                      headroom. */}
                  {node.host?.hostId ? (
                    <Badge variant="outline" className="w-fit font-mono text-[10px]">
                      host {node.host.hostId.slice(0, 8)}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  )
}
