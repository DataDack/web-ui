import { useState } from "react"

import { Button, cn, formatBytes, Skeleton } from "@datadack/common-ui"
import {
  Activity,
  AlertTriangle,
  Gauge,
  HardDrive,
  type LucideIcon,
  Network,
  Pencil,
  RefreshCw,
  Server,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { FadeIn, KeyValueGrid, MetricChart, PageHeader, Section } from "@/components/console"
import { extractError } from "@/services/api/client"
import { useScreen } from "@/services/api/screen"

import {
  useAdminAvailabilityZones,
  useAdminPVENode,
  useAdminPVENodeMetrics,
} from "../superadmin.hooks"
import type { PVENodeMetricCF, PVENodeMetricPoint, PVENodeMetricRange } from "../superadmin.types"

// The rrd windows Proxmox keeps, with the label for the left (oldest) edge of
// each chart's time axis. Same set and order as the hypervisor's own summary
// page, so an operator reads the two the same way.
const RANGES: readonly { value: PVENodeMetricRange; label: string; ago: string }[] = [
  { value: "hour", label: "Hour", ago: "1h ago" },
  { value: "day", label: "Day", ago: "24h ago" },
  { value: "week", label: "Week", ago: "7d ago" },
  { value: "month", label: "Month", ago: "30d ago" },
  { value: "year", label: "Year", ago: "1y ago" },
]

// Consolidation function. AVERAGE smooths each bucket; MAX keeps the worst
// sample in it, which is the one that explains a complaint.
const CFS: readonly { value: PVENodeMetricCF; label: string }[] = [
  { value: "AVERAGE", label: "Average" },
  { value: "MAX", label: "Maximum" },
]

const COLOR_CPU = "rgb(132,204,22)" // lime — CPU usage
const COLOR_IOWAIT = "rgb(56,189,248)" // sky — IO delay
const COLOR_LOAD = "rgb(234,179,8)" // amber — load average
const COLOR_MEM = "rgb(99,102,241)" // indigo — memory
const COLOR_SWAP = "rgb(168,85,247)" // violet — swap
const COLOR_ROOT = "rgb(244,114,182)" // pink — root filesystem
const COLOR_NET_IN = "rgb(34,197,94)" // green — traffic in
const COLOR_NET_OUT = "rgb(239,68,68)" // red — traffic out
const PSI_SOME_COLOR = "rgb(234,179,8)"
const PSI_FULL_COLOR = "rgb(239,68,68)"

// The three pressure-stall graphs differ only in which pair of series they read,
// so they are a table rather than three near-identical blocks. "Some" means at
// least one task was delayed on the resource; "Full" means every task was.
const PRESSURE_PANELS: readonly {
  key: string
  i18nKey: string
  title: string
  icon: LucideIcon
  some: (p: PVENodeMetricPoint) => number
  full: (p: PVENodeMetricPoint) => number
}[] = [
  {
    key: "cpu",
    i18nKey: "superAdmin.pveNodes.graphs.cpuPressure",
    title: "CPU pressure stall (%)",
    icon: Gauge,
    some: (p) => p.cpu_psi_some,
    full: (p) => p.cpu_psi_full,
  },
  {
    key: "io",
    i18nKey: "superAdmin.pveNodes.graphs.ioPressure",
    title: "IO pressure stall (%)",
    icon: HardDrive,
    some: (p) => p.io_psi_some,
    full: (p) => p.io_psi_full,
  },
  {
    key: "mem",
    i18nKey: "superAdmin.pveNodes.graphs.memPressure",
    title: "Memory pressure stall (%)",
    icon: Server,
    some: (p) => p.mem_psi_some,
    full: (p) => p.mem_psi_full,
  },
]

/** "7.3 GB / 48 GB", from the live series' byte counts. */
const usedOfTotal = (used: number, total: number) =>
  `${formatBytes(used)} / ${formatBytes(total)}`

/**
 * The same reading from the node row rather than the series — used until the
 * first sample lands, and when the cluster cannot be reached at all. The row's
 * numbers come from the 10-minute poller, so they are coarser by design.
 */
const gbUsedOfTotal = (used: number, total: number) =>
  `${String(Math.round(used))}GB / ${String(Math.round(total))}GB`

export function PVENodeDetailPage() {
  useScreen("superadmin.p-v-e-node-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()

  const [range, setRange] = useState<PVENodeMetricRange>("hour")
  const [cf, setCF] = useState<PVENodeMetricCF>("AVERAGE")

  const { data: node, isLoading: nodeLoading } = useAdminPVENode(id)
  const { data: azs = [] } = useAdminAvailabilityZones()
  const {
    data: metrics,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAdminPVENodeMetrics(id, range, cf)

  const az = azs.find((a) => a.id === node?.availability_zone_id)
  const points = metrics?.points ?? []
  // One point cannot be drawn as a line, and the rrd's newest bucket is still
  // filling, so a series is only "ready" once it has a shape to show.
  const ready = points.length >= 2
  const agoLabel = RANGES.find((r) => r.value === range)?.ago ?? "1h ago"
  const series = (pick: (p: PVENodeMetricPoint) => number) => points.map(pick)

  // A window the node has no samples for is its own state: not an error, and
  // not something skeletons should sit on forever.
  const isEmpty = !isError && !isLoading && points.length === 0
  const latest = points.length > 0 ? points[points.length - 1] : undefined
  const hasSwap = points.some((p) => p.swap_total_bytes > 0)
  // PSI is absent on older kernels and on clusters that do not publish it; the
  // series then reads as a flat zero, which is noise rather than information.
  const hasPressure = points.some(
    (p) => p.cpu_psi_some > 0 || p.io_psi_some > 0 || p.mem_psi_some > 0,
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Server}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.pveNodes.title"), to: "/admin/pve-nodes" },
          { label: node?.name ?? "…" },
        ]}
        title={node?.name ?? t("superAdmin.pveNodes.title")}
        description={t(
          "superAdmin.pveNodes.graphs.subtitle",
          "Live resource graphs read straight from this hypervisor.",
        )}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void navigate(`/admin/pve-nodes/${id}/edit`)}
            >
              <Pencil className="w-4 h-4" />
              {t("superAdmin.actions.edit")}
            </Button>
          </>
        }
      />

      <Section variant="panel">
        {nodeLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : (
          <KeyValueGrid
            items={[
              {
                label: t("superAdmin.pveNodes.fields.ipAddress"),
                value: node?.ip_address ?? "—",
                copyable: true,
              },
              {
                label: t("superAdmin.pveNodes.fields.availabilityZone"),
                value: az?.code ?? node?.availability_zone_id ?? "—",
              },
              { label: t("superAdmin.pveNodes.fields.status"), value: node?.status ?? "—" },
              {
                label: t("superAdmin.pveNodes.graphs.cores", "Cores"),
                value: String(metrics?.cpu_count ?? node?.cpu_total ?? 0),
              },
              {
                label: t("superAdmin.pveNodes.fields.ram"),
                value: latest
                  ? usedOfTotal(latest.mem_used_bytes, latest.mem_total_bytes)
                  : gbUsedOfTotal((node?.ram_used_mb ?? 0) / 1024, (node?.ram_total_mb ?? 0) / 1024),
              },
              {
                label: t("superAdmin.pveNodes.graphs.rootDisk", "Root disk"),
                value: latest
                  ? usedOfTotal(latest.root_used_bytes, latest.root_total_bytes)
                  : gbUsedOfTotal(node?.storage_used_gb ?? 0, node?.storage_total_gb ?? 0),
              },
            ]}
          />
        )}
      </Section>

      {/* Window + consolidation. Both are query keys, so switching either one
          redraws from its own cache instead of refetching the current view. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px]">
          <Activity className="size-3.5 text-status-success" />
          <span className="relative flex size-2">
            <span
              className={cn(
                "absolute inline-flex size-full rounded-full bg-status-success/70",
                isFetching && "animate-ping",
              )}
            />
            <span className="relative inline-flex size-2 rounded-full bg-status-success" />
          </span>
          <span className="text-foreground">{t("superAdmin.pveNodes.graphs.live", "Live")}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {metrics?.node ?? node?.name ?? ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setRange(r.value)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  range === r.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5">
            {CFS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setCF(c.value)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  cf === c.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <Section variant="panel">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-6 text-destructive" />
            <p className="text-[13px] text-foreground">
              {t("superAdmin.pveNodes.graphs.error", "Could not read this node's graphs")}
            </p>
            <p className="max-w-lg font-mono text-[11px] text-muted-foreground">
              {extractError(error, "")}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t("console.table.retry")}
            </Button>
          </div>
        </Section>
      )}

      {isEmpty && (
        <Section variant="panel">
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            {t(
              "superAdmin.pveNodes.graphs.empty",
              "This node has no samples in the selected window yet.",
            )}
          </p>
        </Section>
      )}

      {!isError && !isEmpty && (
        <FadeIn>
          <div className="space-y-6">
            <ChartPanel
              title={t("superAdmin.pveNodes.graphs.cpu", "CPU usage (%)")}
              icon={Gauge}
              primary={{
                label: t("superAdmin.pveNodes.graphs.cpuUsage", "CPU usage"),
                data: series((p) => p.cpu),
                color: COLOR_CPU,
              }}
              overlay={{
                label: t("superAdmin.pveNodes.graphs.ioDelay", "IO delay"),
                data: series((p) => p.iowait),
                color: COLOR_IOWAIT,
              }}
              unit="%"
              percent
              ready={ready}
              agoLabel={agoLabel}
            />

            <ChartPanel
              title={t("superAdmin.pveNodes.graphs.load", "Server load")}
              icon={Activity}
              primary={{
                label: t("superAdmin.pveNodes.graphs.loadAverage", "Load average"),
                data: series((p) => p.loadavg),
                color: COLOR_LOAD,
              }}
              unit=""
              ready={ready}
              agoLabel={agoLabel}
              footnote={
                metrics?.cpu_count
                  ? t("superAdmin.pveNodes.graphs.loadHint", {
                      defaultValue: "across {{cores}} cores",
                      cores: metrics.cpu_count,
                    })
                  : undefined
              }
            />

            <ChartPanel
              title={t("superAdmin.pveNodes.graphs.memory", "Memory usage (%)")}
              icon={Server}
              primary={{
                label: t("superAdmin.pveNodes.graphs.memoryUsed", "RAM used"),
                data: series((p) => p.mem),
                color: COLOR_MEM,
              }}
              unit="%"
              percent
              ready={ready}
              agoLabel={agoLabel}
              footnote={
                latest
                  ? `${formatBytes(latest.mem_used_bytes)} / ${formatBytes(latest.mem_total_bytes)}`
                  : undefined
              }
            />

            <ChartPanel
              title={t("superAdmin.pveNodes.graphs.network", "Network traffic (MB/s)")}
              icon={Network}
              primary={{
                label: t("superAdmin.pveNodes.graphs.netIn", "In"),
                data: series((p) => p.net_in),
                color: COLOR_NET_IN,
              }}
              overlay={{
                label: t("superAdmin.pveNodes.graphs.netOut", "Out"),
                data: series((p) => p.net_out),
                color: COLOR_NET_OUT,
              }}
              unit=" MB/s"
              ready={ready}
              agoLabel={agoLabel}
            />

            <ChartPanel
              title={t("superAdmin.pveNodes.graphs.root", "Root filesystem (%)")}
              icon={HardDrive}
              primary={{
                label: t("superAdmin.pveNodes.graphs.rootUsed", "Root used"),
                data: series((p) => p.root),
                color: COLOR_ROOT,
              }}
              unit="%"
              percent
              ready={ready}
              agoLabel={agoLabel}
              footnote={
                latest
                  ? `${formatBytes(latest.root_used_bytes)} / ${formatBytes(latest.root_total_bytes)}`
                  : undefined
              }
            />

            {hasSwap && (
              <ChartPanel
                title={t("superAdmin.pveNodes.graphs.swap", "Swap usage (%)")}
                icon={HardDrive}
                primary={{
                  label: t("superAdmin.pveNodes.graphs.swapUsed", "Swap used"),
                  data: series((p) => p.swap),
                  color: COLOR_SWAP,
                }}
                unit="%"
                percent
                ready={ready}
                agoLabel={agoLabel}
                footnote={
                  latest
                    ? `${formatBytes(latest.swap_used_bytes)} / ${formatBytes(latest.swap_total_bytes)}`
                    : undefined
                }
              />
            )}

            {hasPressure &&
              PRESSURE_PANELS.map((panel) => (
                <ChartPanel
                  key={panel.key}
                  title={t(panel.i18nKey, panel.title)}
                  icon={panel.icon}
                  primary={{
                    label: t("superAdmin.pveNodes.graphs.psiSome", "Some"),
                    data: series(panel.some),
                    color: PSI_SOME_COLOR,
                  }}
                  overlay={{
                    label: t("superAdmin.pveNodes.graphs.psiFull", "Full"),
                    data: series(panel.full),
                    color: PSI_FULL_COLOR,
                  }}
                  unit="%"
                  ready={ready}
                  agoLabel={agoLabel}
                />
              ))}
          </div>
        </FadeIn>
      )}
    </div>
  )
}

interface ChartSeries {
  label: string
  data: number[]
  color: string
}

/**
 * One graph: a headline reading of the primary series, an optional second line
 * on the same Y-domain (CPU + IO delay, net in + out, PSI some + full), and the
 * window's edges labelled underneath.
 *
 * `percent` locks the domain to 0..100 — without it a memory graph pinned near
 * 40% would auto-scale into a dramatic-looking wave. Series that have no natural
 * ceiling (load average, MB/s, pressure) auto-scale instead.
 */
function ChartPanel({
  title,
  icon: Icon,
  primary,
  overlay,
  unit,
  percent = false,
  ready,
  agoLabel,
  footnote,
}: Readonly<{
  title: string
  icon: LucideIcon
  primary: ChartSeries
  overlay?: ChartSeries
  unit: string
  percent?: boolean
  ready: boolean
  agoLabel: string
  footnote?: string
}>) {
  const { data } = primary
  const current = data.length > 0 ? data[data.length - 1] : 0
  const peak = data.length > 0 ? Math.max(...data) : 0
  const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0
  const decimals = percent ? 1 : 2

  return (
    <Section variant="panel" title={title}>
      {ready ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                {current.toFixed(decimals)}
                {unit}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                peak {peak.toFixed(decimals)}
                {unit} · avg {avg.toFixed(decimals)}
                {unit}
                {footnote ? ` · ${footnote}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <Icon className="size-3.5" />
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: primary.color }}
                />
                {primary.label}
              </span>
              {overlay && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: overlay.color }}
                  />
                  {overlay.label}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3">
            <MetricChart
              data={data}
              color={primary.color}
              unit={percent ? "%" : ""}
              min={0}
              max={percent ? 100 : undefined}
              overlay={overlay ? { data: overlay.data, color: overlay.color } : undefined}
              height={180}
            />
          </div>
          <div className="mt-2 flex justify-between border-t border-border-glass pt-2 text-[11px] text-muted-foreground">
            <span>{agoLabel}</span>
            <span>Now</span>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
      )}
    </Section>
  )
}
