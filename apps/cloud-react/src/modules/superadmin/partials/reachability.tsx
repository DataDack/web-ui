import { useMemo } from "react"

import {
  Button,
  cn,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { History, Loader2, Radar, TriangleAlert } from "lucide-react"

import { useAddressProbeHistory } from "../superadmin.hooks"
import type { AddressProbe, ProbeCheck, ProbeState } from "../superadmin.types"
import { ANOMALY_LABELS, formatDateTime } from "./reachability.utils"

/*
 * Reachability as proxmox-manager measures it: an ICMP echo from the node whose
 * uplink carries the address, hourly and on demand. Shared by the pool page and
 * the Reachability tab so an address reads the same in both.
 */

const PROBE_TONES: Record<ProbeState, string> = {
  responding: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  silent: "border-border-glass bg-background/60 text-muted-foreground",
  never_checked: "border-border-glass bg-background/60 text-muted-foreground/70",
  probe_error: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

const PROBE_DOTS: Record<ProbeState, string> = {
  responding: "bg-emerald-500",
  silent: "bg-muted-foreground/40",
  never_checked: "border border-muted-foreground/40 bg-transparent",
  probe_error: "bg-amber-500",
}

const PROBE_LABELS: Record<ProbeState, string> = {
  responding: "Answering",
  silent: "No reply",
  never_checked: "Not checked",
  probe_error: "Probe error",
}

/** The ping state, the round trip when it answered, and a flag for anything unusual. */
export function ProbePill({ probe }: Readonly<{ probe?: AddressProbe }>) {
  const state: ProbeState = probe?.state ?? "never_checked"
  const unusual = (probe?.open_anomalies?.length ?? 0) > 0
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        title={probe?.last_error ?? undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          PROBE_TONES[state],
        )}
      >
        <span className={cn("size-1.5 rounded-full", PROBE_DOTS[state])} />
        {PROBE_LABELS[state]}
        {state === "responding" && probe?.last_rtt_ms ? (
          <span className="font-mono tabular-nums opacity-80">
            {probe.last_rtt_ms.toFixed(1)}ms
          </span>
        ) : null}
      </span>
      {unusual && (
        <span
          title={probe?.open_anomalies?.map((k) => ANOMALY_LABELS[k]).join(", ")}
          className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400"
        >
          <TriangleAlert className="size-3" />
          Unusual
        </span>
      )}
    </span>
  )
}

/**
 * When the address last answered and how many days ago, or — for a silent
 * address — how long it has been silent. The holder at that last answer rides
 * along, because "who was on this address" is the question an unusual answer
 * raises.
 */
export function LastAnswerCell({ probe }: Readonly<{ probe?: AddressProbe }>) {
  if (!probe || probe.state === "never_checked") {
    return <span className="text-[12px] text-muted-foreground">—</span>
  }
  const days = probe.days_since_last_reachable
  const holder = [probe.last_holder_type, probe.last_holder_name].filter(Boolean).join(" · ")
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      {probe.last_reachable_at ? (
        <span
          className="text-[12px] text-foreground"
          title={formatDateTime(probe.last_reachable_at)}
        >
          {timeAgo(probe.last_reachable_at)}
          {days !== null && days > 0 && (
            <span className="text-muted-foreground">
              {" · "}
              {days === 1 ? "1 day" : `${String(days)} days`}
            </span>
          )}
        </span>
      ) : (
        <span className="text-[12px] text-muted-foreground italic">never answered</span>
      )}
      {probe.state === "silent" && probe.unreachable_since && (
        <span
          className="text-[11px] text-muted-foreground"
          title={formatDateTime(probe.unreachable_since)}
        >
          silent since {timeAgo(probe.unreachable_since)}
        </span>
      )}
      {holder && probe.last_reachable_at && (
        <span className="truncate text-[11px] text-muted-foreground">held by {holder}</span>
      )}
      {probe.last_checked_at && (
        <span
          className="text-[10.5px] text-muted-foreground/70"
          title={formatDateTime(probe.last_checked_at)}
        >
          checked {timeAgo(probe.last_checked_at)}
          {probe.last_trigger === "manual" ? " (manual)" : ""}
        </span>
      )}
    </div>
  )
}

/** The visible, one-press ping for a single address. */
export function PingButton({
  onPing,
  pending,
  disabled,
  label = "Ping",
}: Readonly<{ onPing: () => void; pending: boolean; disabled?: boolean; label?: string }>) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1.5 px-2.5 text-[12px]"
      disabled={pending || disabled}
      onClick={(e) => {
        e.stopPropagation()
        onPing()
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Radar className="size-3.5" />}
      {label}
    </Button>
  )
}

/** Every recent check of one address, newest first. */
export function ProbeHistoryDialog({
  poolId,
  ip,
  onOpenChange,
}: Readonly<{ poolId?: string; ip?: string; onOpenChange: (open: boolean) => void }>) {
  const { data = [], isLoading, isError, refetch } = useAddressProbeHistory(poolId, ip)

  const columns = useMemo<ColumnDef<ProbeCheck>[]>(
    () => [
      {
        id: "checked_at",
        accessorFn: (c) => c.checked_at,
        header: () => "Checked",
        cell: ({ row }) => (
          <span
            className="text-[12px] tabular-nums"
            title={formatDateTime(row.original.checked_at)}
          >
            {formatDateTime(row.original.checked_at)}
          </span>
        ),
      },
      {
        id: "result",
        accessorFn: (c) => c.reachable,
        header: () => "Result",
        cell: ({ row }) => {
          const c = row.original
          if (c.error) {
            return (
              <span className="text-[12px] text-amber-600 dark:text-amber-400" title={c.error}>
                Probe error
              </span>
            )
          }
          return (
            <span
              className={cn(
                "text-[12px]",
                c.reachable ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              {c.reachable
                ? `Answered ${String(c.received)}/${String(c.sent)}`
                : `No reply 0/${String(c.sent)}`}
              {c.reachable && c.rtt_ms > 0 && (
                <span className="font-mono tabular-nums opacity-80">
                  {" "}
                  · {c.rtt_ms.toFixed(1)}ms
                </span>
              )}
            </span>
          )
        },
      },
      {
        id: "holder",
        accessorFn: (c) => c.holder_name ?? "",
        header: () => "Held by",
        cell: ({ row }) => {
          const c = row.original
          const holder = [c.holder_type, c.holder_name].filter(Boolean).join(" · ")
          return (
            <span className="text-[12px] text-muted-foreground">
              {holder || "nothing"} <span className="opacity-70">({c.address_status})</span>
            </span>
          )
        },
      },
      {
        id: "trigger",
        accessorFn: (c) => c.trigger,
        header: () => "Trigger",
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">{row.original.trigger}</span>
        ),
      },
    ],
    [],
  )

  return (
    <Dialog open={!!ip} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            Ping history · <span className="font-mono">{ip}</span>
          </DialogTitle>
          <DialogDescription>
            Checks from the pool&apos;s host node — hourly, plus every manual ping. Kept for 90
            days.
          </DialogDescription>
        </DialogHeader>
        <DataTable<ProbeCheck>
          data={data}
          columns={columns}
          loading={isLoading}
          stickyHeader
          getRowId={(c) => c.id}
          className="[&_[data-slot=table-container]]:max-h-[26rem]"
          error={isError ? "Could not load the history" : undefined}
          onRetry={() => void refetch()}
          empty={
            <EmptyState
              icon={Radar}
              title="Not checked yet"
              description="The first hourly sweep, or a manual ping, will show up here."
            />
          }
        />
      </DialogContent>
    </Dialog>
  )
}
