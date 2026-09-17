import { useCallback, useMemo, useState } from "react"

import { cn, DataTable, EmptyState, timeAgo } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Radar, ShieldCheck, TriangleAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useIPReachability, useProbeIPPool } from "../superadmin.hooks"
import type { IpAnomaly, PoolReachability } from "../superadmin.types"
import { PingButton } from "./reachability"
import { ANOMALY_LABELS, formatDateTime, humanSeconds } from "./reachability.utils"

/**
 * The reachability report across every pool.
 *
 * proxmox-manager on each pool's host node pings every address once an hour and
 * posts the results to the control plane. This tab is the whole-platform view of
 * that record: which pools are being watched, how much of each answers, and the
 * unusual activity found — an address answering again after a day or more of
 * silence, or answering while nothing holds it. The same findings are mailed to
 * the ops group, one mail per pool, with a daily per-pool summary.
 */
export function ReachabilityTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = useIPReachability()
  const probe = useProbeIPPool()
  const [pinging, setPinging] = useState<string | null>(null)

  const pools = useMemo(() => data?.pools ?? [], [data])
  const anomalies = useMemo(() => data?.anomalies ?? [], [data])

  const openPool = useCallback(
    (poolId?: string) => {
      if (poolId) void navigate(`/admin/static-ips/pools/${poolId}`)
    },
    [navigate],
  )

  const pingPool = useCallback(
    (poolId: string) => {
      setPinging(poolId)
      probe.mutate(
        { poolId },
        {
          onSettled: () => {
            setPinging(null)
          },
        },
      )
    },
    [probe],
  )

  const poolColumns = useMemo<ColumnDef<PoolReachability>[]>(
    () => [
      {
        id: "name",
        accessorFn: (p) => p.name,
        header: () => "Pool",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {row.original.region}
              {row.original.node_name ? ` · ${row.original.node_name}` : ""}
            </span>
          </div>
        ),
      },
      {
        id: "watch",
        accessorFn: watchKey,
        header: () => "Monitoring",
        cell: ({ row }) => <WatchState pool={row.original} />,
      },
      {
        id: "answering",
        accessorFn: (p) => p.responding,
        header: () => "Answering",
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] tabular-nums">
                <b className="text-emerald-600 dark:text-emerald-400">{p.responding}</b>
                <span className="text-muted-foreground"> / {p.total}</span>
                {p.silent > 0 && (
                  <span className="text-muted-foreground"> · {p.silent} no reply</span>
                )}
                {p.never_checked > 0 && (
                  <span className="text-muted-foreground"> · {p.never_checked} not checked</span>
                )}
                {p.probe_errors > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}
                    · {p.probe_errors} errors
                  </span>
                )}
              </span>
              <ShareBar pool={p} />
            </div>
          )
        },
      },
      {
        id: "unusual",
        accessorFn: (p) => p.open_anomalies,
        header: () => "Unusual (open)",
        cell: ({ row }) =>
          row.original.open_anomalies > 0 ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-red-600 dark:text-red-400">
              <TriangleAlert className="size-3.5" />
              {row.original.open_anomalies}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">0</span>
          ),
      },
      {
        id: "last_checked",
        accessorFn: (p) => p.last_checked_at ?? "",
        header: () => "Last check",
        cell: ({ row }) => (
          <span
            className="text-[12px] text-muted-foreground"
            title={formatDateTime(row.original.last_checked_at)}
          >
            {row.original.last_checked_at ? timeAgo(row.original.last_checked_at) : "never"}
          </span>
        ),
      },
      {
        id: "ping",
        header: () => null,
        enableSorting: false,
        meta: { interactive: true },
        cell: ({ row }) => (
          <PingButton
            label="Ping now"
            onPing={() => {
              pingPool(row.original.pool_id)
            }}
            pending={probe.isPending && pinging === row.original.pool_id}
            disabled={probe.isPending || !row.original.pve_node_id}
          />
        ),
      },
    ],
    [pingPool, probe.isPending, pinging],
  )

  const anomalyColumns = useMemo<ColumnDef<IpAnomaly>[]>(
    () => [
      {
        id: "detected",
        accessorFn: (a) => a.detected_at,
        header: () => "Detected",
        cell: ({ row }) => (
          <span
            className="text-[12px] tabular-nums"
            title={formatDateTime(row.original.detected_at)}
          >
            {timeAgo(row.original.detected_at)}
          </span>
        ),
      },
      {
        id: "address",
        accessorFn: (a) => a.address,
        header: () => "Address",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="font-mono text-[13px] tabular-nums text-foreground">
              {row.original.address}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {row.original.pool_name ?? "—"}
            </span>
          </div>
        ),
      },
      {
        id: "kind",
        accessorFn: (a) => a.kind,
        header: () => "Finding",
        cell: ({ row }) => {
          const a = row.original
          return (
            <div className="flex max-w-md flex-col gap-0.5 leading-tight">
              <span className="text-[12px] font-medium text-red-600 dark:text-red-400">
                {ANOMALY_LABELS[a.kind]}
                {a.kind === "recovered_after_outage" && a.silent_seconds > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · silent {humanSeconds(a.silent_seconds)}
                  </span>
                )}
              </span>
              <span className="text-[11.5px] text-muted-foreground">{a.detail}</span>
            </div>
          )
        },
      },
      {
        id: "holder",
        accessorFn: (a) => a.holder_name ?? "",
        header: () => "Held by",
        cell: ({ row }) => {
          const a = row.original
          const now = [a.holder_type, a.holder_name].filter(Boolean).join(" · ")
          const before = [a.previous_holder_type, a.previous_holder_name]
            .filter(Boolean)
            .join(" · ")
          return (
            <div className="flex flex-col gap-0.5 leading-tight text-[12px]">
              <span className="text-foreground">
                {now || "nothing"}{" "}
                <span className="text-muted-foreground">({a.address_status})</span>
              </span>
              {before && (
                <span className="text-[11px] text-muted-foreground">at last answer: {before}</span>
              )}
            </div>
          )
        },
      },
      {
        id: "state",
        accessorFn: (a) => (a.resolved_at ? "resolved" : "open"),
        header: () => "State",
        cell: ({ row }) => {
          const a = row.original
          const open = !a.resolved_at
          return (
            <div className="flex flex-col gap-0.5 leading-tight text-[11.5px]">
              <span
                className={
                  open ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"
                }
              >
                {anomalyStateLabel(a)}
              </span>
              <span className="text-muted-foreground">
                {a.notified_at ? "mailed" : "not mailed"}
              </span>
            </div>
          )
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-muted-foreground">
        Every pool address is pinged hourly from its host node&apos;s proxmox-manager. Unusual
        activity — an address answering again after a day or more of silence, or answering while
        attached to nothing — is mailed to the ops group, one mail per pool, plus a daily summary
        per pool.
      </p>

      <DataTable<PoolReachability>
        data={pools}
        columns={poolColumns}
        loading={isLoading}
        stickyHeader
        getRowId={(p) => p.pool_id}
        onRowClick={(p) => {
          openPool(p.pool_id)
        }}
        rowClassName="cursor-pointer hover:bg-muted/40 [&>td]:py-2.5"
        error={isError ? "Could not load reachability" : undefined}
        onRetry={() => void refetch()}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        empty={
          <EmptyState
            icon={Radar}
            title="No IP pools"
            description="Add a pool to start monitoring it."
          />
        }
      />

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TriangleAlert className="size-4 text-red-500" />
          Unusual activity
        </h3>
        <DataTable<IpAnomaly>
          data={anomalies}
          columns={anomalyColumns}
          loading={isLoading}
          stickyHeader
          getRowId={(a) => a.id}
          onRowClick={(a) => {
            openPool(a.inventory_group_id)
          }}
          rowClassName="cursor-pointer even:bg-foreground/[0.015] hover:bg-muted/40 [&>td]:py-2.5"
          className="[&_[data-slot=table-container]]:max-h-[32rem]"
          empty={
            <EmptyState
              icon={ShieldCheck}
              title="Nothing unusual"
              description="No address has come back after a day of silence or answered while unattached."
            />
          }
        />
      </div>
    </div>
  )
}

function watchKey(p: PoolReachability): string {
  if (!p.monitored) return "unwatched"
  return p.stale ? "stale" : "watched"
}

function anomalyStateLabel(a: IpAnomaly): string {
  if (!a.resolved_at) return "Open"
  return a.kind === "recovered_after_outage" ? "Event" : "Resolved"
}

function WatchState({ pool }: Readonly<{ pool: PoolReachability }>) {
  if (!pool.monitored) {
    return (
      <span
        className="text-[12px] text-amber-600 dark:text-amber-400"
        title={pool.unmonitored_reason}
      >
        Not monitored
        <span className="block text-[11px] text-muted-foreground">{pool.unmonitored_reason}</span>
      </span>
    )
  }
  if (pool.stale) {
    return (
      <span className="text-[12px] text-amber-600 dark:text-amber-400">
        Stale
        <span className="block text-[11px] text-muted-foreground">no check in over 2h</span>
      </span>
    )
  }
  return <span className="text-[12px] text-emerald-600 dark:text-emerald-400">Hourly</span>
}

/** Answering / no reply / not checked as one proportional bar. */
function ShareBar({ pool }: Readonly<{ pool: PoolReachability }>) {
  if (pool.total === 0) return null
  const pct = (n: number) => `${String((n / pool.total) * 100)}%`
  return (
    <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-muted">
      <div className="bg-emerald-500" style={{ width: pct(pool.responding) }} />
      <div className="bg-amber-500" style={{ width: pct(pool.probe_errors) }} />
      <div className={cn("bg-muted-foreground/30")} style={{ width: pct(pool.silent) }} />
    </div>
  )
}
