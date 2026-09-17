import { useCallback, useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  cn,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  timeAgo,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Ban,
  CircleCheck,
  History,
  Loader2,
  Lock,
  Network,
  Radar,
  SearchX,
  TriangleAlert,
  Undo2,
  Waypoints,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { AnimatedNumber, PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useNodeName } from "../components/host-nodes"
import {
  useAdminAvailabilityZones,
  useAdminIPPoolAddresses,
  useProbeIPPool,
  useReleasePoolAddress,
  useReservePoolAddresses,
} from "../superadmin.hooks"
import type { PoolAddress, PoolAddressStatus } from "../superadmin.types"
import { LastAnswerCell, PingButton, ProbeHistoryDialog, ProbePill } from "./reachability"
import { formatDateTime } from "./reachability.utils"

const LIST_PATH = "/admin/static-ips"
const ALL = "all"

/**
 * The four states an address in a block can be in, in the order an operator
 * cares about them. `free` is stock; `available` is held by a tenant but
 * attached to nothing; `associated` is live on a resource; `blocked` is withheld
 * by the platform and never offered to anyone.
 */
const STATUSES = ["free", "available", "associated", "blocked"] as const

const TONES: Record<PoolAddressStatus, string> = {
  free: "border-border-glass bg-background/60 text-muted-foreground",
  available: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  associated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  blocked: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

const DOTS: Record<PoolAddressStatus, string> = {
  free: "bg-muted-foreground/40",
  available: "bg-amber-500",
  associated: "bg-emerald-500",
  blocked: "bg-sky-500",
}

const STATUS_LABEL_KEYS: Record<PoolAddressStatus, string> = {
  free: "superAdmin.staticIps.pools.free",
  available: "superAdmin.staticIps.inUse.reserved",
  associated: "superAdmin.staticIps.inUse.associated",
  blocked: "superAdmin.staticIps.addresses.blocked",
}

/**
 * One pool, expanded into every address it contains — allocated or not — with
 * the controls to hold addresses back from tenant allocation.
 *
 * This exists because a pool's row on the list view only says how much stock is
 * left, never which addresses those are. An operator who wants to keep part of a
 * block for the platform's own use has to see the block itself, and blocking is
 * only meaningful per address, so both live here rather than in a dialog.
 */
export function PoolDetailPage() {
  useScreen("superadmin.ip-pool-detail")
  const { t } = useTranslation()
  const { poolId } = useParams<{ poolId: string }>()

  const { data, isLoading, isError, refetch, isFetching } = useAdminIPPoolAddresses(poolId)
  const { data: azs = [] } = useAdminAvailabilityZones()
  const nodeName = useNodeName()
  const reserve = useReservePoolAddresses(poolId)
  const release = useReleasePoolAddress(poolId)
  const probe = useProbeIPPool()
  // Which address a single-address ping is running for, so only that row spins.
  // null while the whole pool is being pinged.
  const [pinging, setPinging] = useState<string | null>(null)
  const [historyIp, setHistoryIp] = useState<string | undefined>()

  const { mutate: runProbe } = probe
  const ping = useCallback(
    (ip?: string) => {
      if (!poolId) return
      setPinging(ip ?? null)
      runProbe(
        { poolId, ipAddresses: ip ? [ip] : undefined },
        {
          onSettled: () => {
            setPinging(null)
          },
        },
      )
    },
    [poolId, runProbe],
  )

  const pool = data?.pool
  const addresses = useMemo(() => data?.addresses ?? [], [data])

  const [status, setStatus] = useState<string>(ALL)
  // Addresses queued for blocking — one row's action or a whole selection. The
  // reason is asked for once, for the batch, which is also how the API takes it.
  const [pendingBlock, setPendingBlock] = useState<string[]>([])
  const [reason, setReason] = useState("")

  const reach = useMemo(
    () =>
      addresses.reduce(
        (acc, a) => {
          const state = a.probe?.state ?? "never_checked"
          acc[state] += 1
          if ((a.probe?.open_anomalies?.length ?? 0) > 0) acc.unusual += 1
          const checked = a.probe?.last_checked_at
          if (checked && Date.parse(checked) > acc.lastCheckedMs) {
            acc.lastCheckedMs = Date.parse(checked)
            acc.lastChecked = checked
          }
          return acc
        },
        {
          responding: 0,
          silent: 0,
          never_checked: 0,
          probe_error: 0,
          unusual: 0,
          lastChecked: "",
          lastCheckedMs: 0,
        },
      ),
    [addresses],
  )

  const counts = useMemo(
    () =>
      addresses.reduce<Record<PoolAddressStatus, number>>(
        (acc, a) => ({ ...acc, [a.status]: acc[a.status] + 1 }),
        { free: 0, available: 0, associated: 0, blocked: 0 },
      ),
    [addresses],
  )

  const filtered = useMemo(
    () => (status === ALL ? addresses : addresses.filter((a) => a.status === status)),
    [addresses, status],
  )

  const azCode = useMemo(() => {
    if (!pool?.availability_zone_id) return ""
    return azs.find((a) => a.id === pool.availability_zone_id)?.code ?? ""
  }, [azs, pool])

  const openBlockDialog = (ips: string[]) => {
    setReason("")
    setPendingBlock(ips)
  }

  const confirmBlock = () => {
    reserve.mutate(
      { ip_addresses: pendingBlock, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setPendingBlock([])
        },
      },
    )
  }

  const columns = useMemo<ColumnDef<PoolAddress>[]>(
    () => [
      {
        id: "address",
        accessorFn: (a) => a.ip_address,
        header: () => t("superAdmin.staticIps.addresses.columns.address"),
        cell: ({ row }) => (
          <span className="font-mono text-[13px] tabular-nums text-foreground">
            {row.original.ip_address}
          </span>
        ),
      },
      {
        id: "associated_address",
        accessorFn: (address) => address.associated_ip,
        header: () => "Associated IP",
        cell: ({ row }) => (
          <span className="font-mono text-[13px] tabular-nums text-foreground">
            {row.original.associated_ip}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (a) => a.status,
        header: () => t("superAdmin.staticIps.addresses.columns.status"),
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: "ping",
        accessorFn: (a) => a.probe?.state ?? "never_checked",
        header: () => "Ping",
        meta: { interactive: true },
        cell: ({ row }) => {
          const a = row.original
          return (
            <div className="flex items-center gap-2">
              <PingButton
                onPing={() => {
                  ping(a.ip_address)
                }}
                pending={probe.isPending && (pinging === a.ip_address || pinging === null)}
                disabled={probe.isPending || !pool?.pve_node_id}
              />
              <ProbePill probe={a.probe} />
            </div>
          )
        },
      },
      {
        id: "last_answer",
        accessorFn: (a) => a.probe?.last_reachable_at ?? "",
        header: () => "Last answer",
        cell: ({ row }) => <LastAnswerCell probe={row.original.probe} />,
      },
      {
        id: "holder",
        // A blocked address has no tenant, so its note stands in as the answer
        // to the same question: what is holding this address open?
        accessorFn: (a) => a.name ?? a.reason ?? "",
        header: () => t("superAdmin.staticIps.addresses.columns.holder"),
        cell: ({ row }) => <HolderCell address={row.original} />,
      },
      actionsColumn<PoolAddress>({
        ariaLabel: t("console.table.actions"),
        actions: (address) => {
          const historyAction = {
            label: "Ping history",
            icon: History,
            onAction: (a: PoolAddress) => {
              setHistoryIp(a.ip_address)
            },
          }
          if (address.status === "blocked") {
            return [
              historyAction,
              {
                label: t("superAdmin.staticIps.addresses.unblock"),
                icon: Undo2,
                onAction: (a: PoolAddress) => {
                  release.mutate(a.ip_address)
                },
              },
            ]
          }
          if (address.status === "free") {
            return [
              historyAction,
              {
                label: t("superAdmin.staticIps.addresses.block"),
                icon: Ban,
                onAction: (a: PoolAddress) => {
                  openBlockDialog([a.ip_address])
                },
              },
            ]
          }
          // An allocated address belongs to a tenant: taking it back is a
          // tenant-visible act and is not offered here.
          return [historyAction]
        },
      }),
    ],
    [t, release, probe.isPending, pinging, pool?.pve_node_id, ping],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Network}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.staticIps.title"), to: LIST_PATH },
          { label: pool?.name ?? t("superAdmin.staticIps.addresses.title") },
        ]}
        title={pool?.name ?? t("superAdmin.staticIps.addresses.title")}
        description="Public addresses and their provider-associated internal addresses."
        actions={
          <Button
            className="gap-2"
            variant="outline"
            disabled={probe.isPending || !pool?.pve_node_id || addresses.length === 0}
            onClick={() => {
              ping()
            }}
          >
            {probe.isPending && pinging === null ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Radar className="size-4" />
            )}
            {probe.isPending && pinging === null ? "Pinging…" : "Ping all now"}
          </Button>
        }
      />

      <InventoryFacts
        count={addresses.length}
        region={pool?.region ?? ""}
        az={azCode}
        gateway={pool?.gateway ? `${pool.gateway}/${String(pool.prefix_length ?? 0)}` : ""}
        host={nodeName(pool?.pve_node_id)}
        loading={isLoading}
      />
      {pool && !pool.assignable && (
        <div className="glass-1 border-amber-500/30 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          {pool.pve_node_id
            ? "These addresses cannot be assigned: the host node or its cluster is unavailable."
            : "These addresses cannot be assigned until the pool has a host node. Set one from Edit on the pools list."}
          {pool.unassignable_reason && (
            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
              {pool.unassignable_reason}
            </span>
          )}
        </div>
      )}

      {!isLoading && pool && (
        <ReachabilityStrip
          answering={reach.responding}
          silent={reach.silent}
          neverChecked={reach.never_checked}
          errors={reach.probe_error}
          unusual={reach.unusual}
          lastChecked={reach.lastChecked}
          placed={!!pool.pve_node_id}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={Waypoints}
          label={t("superAdmin.staticIps.addresses.stats.total")}
          value={addresses.length}
          tone="default"
          loading={isLoading}
        />
        <Metric
          icon={CircleCheck}
          label={t("superAdmin.staticIps.addresses.stats.free")}
          value={counts.free}
          tone="muted"
          loading={isLoading}
        />
        <Metric
          icon={Network}
          label={t("superAdmin.staticIps.addresses.stats.allocated")}
          value={counts.available + counts.associated}
          tone="success"
          loading={isLoading}
        />
        <Metric
          icon={Lock}
          label={t("superAdmin.staticIps.addresses.stats.blocked")}
          value={counts.blocked}
          tone="info"
          loading={isLoading}
        />
      </div>

      <DataTable<PoolAddress>
        data={filtered}
        columns={columns}
        loading={isLoading}
        stickyHeader
        selectable
        getRowId={(a) => a.ip_address}
        // Only free addresses can be withheld, so a mixed selection offers the
        // action for the part of it that can take it rather than failing the
        // whole batch server-side.
        bulkActions={(rows) => {
          const free = rows.filter((r) => r.status === "free").map((r) => r.ip_address)
          if (free.length === 0) return []
          return [
            {
              label: t("superAdmin.staticIps.addresses.blockCount", { count: free.length }),
              icon: Ban,
              onAction: () => {
                openBlockDialog(free)
              },
            },
          ]
        }}
        className={cn(
          "[&_th]:h-10 [&_th]:text-[10.5px] [&_th]:font-semibold",
          "[&_[data-slot=table-container]]:max-h-[36rem]",
        )}
        rowClassName="even:bg-foreground/[0.015] hover:bg-muted/40 [&>td]:py-2.5"
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        toolbar={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("superAdmin.staticIps.addresses.filters.all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(STATUS_LABEL_KEYS[s])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        empty={
          status === ALL ? (
            <EmptyState
              icon={Network}
              title={t("superAdmin.staticIps.addresses.empty")}
              description={t("superAdmin.staticIps.addresses.emptySubtitle")}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={t("superAdmin.staticIps.addresses.noMatches")}
              description={t("superAdmin.staticIps.addresses.noMatchesSubtitle")}
            />
          )
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <ProbeHistoryDialog
        poolId={poolId}
        ip={historyIp}
        onOpenChange={(open) => {
          if (!open) setHistoryIp(undefined)
        }}
      />

      <BlockDialog
        addresses={pendingBlock}
        reason={reason}
        onReasonChange={setReason}
        onOpenChange={(open) => {
          if (!open) setPendingBlock([])
        }}
        onConfirm={confirmBlock}
        loading={reserve.isPending}
      />
    </div>
  )
}

/* ── Dialog ────────────────────────────────────────────────────────────── */

function BlockDialog({
  addresses,
  reason,
  onReasonChange,
  onOpenChange,
  onConfirm,
  loading,
}: Readonly<{
  addresses: string[]
  reason: string
  onReasonChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading: boolean
}>) {
  const { t } = useTranslation()

  return (
    <Dialog open={addresses.length > 0} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("superAdmin.staticIps.addresses.blockTitle")}</DialogTitle>
          <DialogDescription>
            {t("superAdmin.staticIps.addresses.blockBody", { count: addresses.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border-glass bg-background/60 p-2">
          {addresses.map((ip) => (
            <div key={ip} className="font-mono text-[12px] tabular-nums text-foreground">
              {ip}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-reason">{t("superAdmin.staticIps.addresses.reason")}</Label>
          <Input
            id="block-reason"
            value={reason}
            maxLength={255}
            placeholder={t("superAdmin.staticIps.addresses.reasonPlaceholder")}
            onChange={(e) => {
              onReasonChange(e.target.value)
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {t("superAdmin.staticIps.addresses.block")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Cells & chrome ────────────────────────────────────────────────────── */

function StatusPill({ status }: Readonly<{ status: PoolAddressStatus }>) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONES[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[status])} />
      {t(STATUS_LABEL_KEYS[status])}
    </span>
  )
}

function HolderCell({ address }: Readonly<{ address: PoolAddress }>) {
  const { t } = useTranslation()

  if (address.status === "blocked") {
    // The reason is optional AND stored as "" when omitted, so an empty string
    // needs the fallback too — not just an absent field.
    const reason = address.reason?.trim()
    if (reason) {
      return <span className="text-[12px] text-muted-foreground">{reason}</span>
    }
    return (
      <span className="text-[12px] text-muted-foreground/70 italic">
        {t("superAdmin.staticIps.addresses.noReason")}
      </span>
    )
  }
  if (address.holder_type) {
    return (
      <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span
          className={cn(
            "truncate text-[12px] text-foreground",
            address.holder_deleted && "text-muted-foreground line-through",
          )}
        >
          {[address.holder_name, address.name].find(Boolean) ?? "—"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {address.holder_type}
          {address.holder_deleted && <span className="text-destructive"> · deleted</span>}
        </span>
      </div>
    )
  }
  if (address.name) {
    return <span className="truncate text-[12px] text-foreground">{address.name}</span>
  }
  return <span className="text-[12px] text-muted-foreground">—</span>
}

/** The mapping batch's fixed facts, on one line above the address table. */
function InventoryFacts({
  count,
  region,
  az,
  gateway,
  host,
  loading,
}: Readonly<{
  count: number
  region: string
  az: string
  gateway: string
  host: string
  loading: boolean
}>) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="glass-1 flex items-center gap-6 px-4 py-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
    )
  }

  return (
    <div className="glass-1 flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      <Fact label="Mappings" value={String(count)} />
      <Fact label={t("superAdmin.staticIps.dialog.region")} value={region || "—"} />
      <Fact label={t("superAdmin.staticIps.dialog.az")} value={az || "—"} />
      {/* "node bridge" rather than "—": the addresses do get a gateway either
          way, and which one is the thing an operator is checking here. */}
      <Fact label="Gateway" value={gateway || "node bridge"} />
      <Fact label="Host node" value={host || "—"} />
    </div>
  )
}

/**
 * The pool's reachability at a glance. The hourly sweep runs in the host node's
 * proxmox-manager; a pool without a host node is pinged by nothing, and that is
 * said rather than left as a column of "Not checked".
 */
function ReachabilityStrip({
  answering,
  silent,
  neverChecked,
  errors,
  unusual,
  lastChecked,
  placed,
}: Readonly<{
  answering: number
  silent: number
  neverChecked: number
  errors: number
  unusual: number
  lastChecked: string
  placed: boolean
}>) {
  const stale =
    placed && (!lastChecked || Date.now() - new Date(lastChecked).getTime() > 135 * 60 * 1000)
  return (
    <div className="glass-1 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 text-[12px]">
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <Radar className="size-3.5 text-muted-foreground" />
        Reachability
      </span>
      <span className="text-emerald-600 dark:text-emerald-400">
        <b className="tabular-nums">{answering}</b> answering
      </span>
      <span className="text-muted-foreground">
        <b className="tabular-nums">{silent}</b> no reply
      </span>
      <span className="text-muted-foreground">
        <b className="tabular-nums">{neverChecked}</b> not checked
      </span>
      {errors > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          <b className="tabular-nums">{errors}</b> probe errors
        </span>
      )}
      {unusual > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <TriangleAlert className="size-3.5" />
          <b className="tabular-nums">{unusual}</b> unusual
        </span>
      )}
      <span className="ml-auto text-muted-foreground" title={formatDateTime(lastChecked)}>
        {lastChecked ? `last check ${timeAgo(lastChecked)}` : "never checked"} · hourly from the
        host node
      </span>
      {!placed && (
        <span className="w-full text-amber-600 dark:text-amber-400">
          No host node: nothing pings these addresses until one is set.
        </span>
      )}
      {stale && (
        <span className="w-full text-amber-600 dark:text-amber-400">
          No check in over two hours — the host node&apos;s proxmox-manager may not be running the
          sweep.
        </span>
      )}
    </div>
  )
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col gap-0.5 leading-none">
      <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground">{label}</span>
      <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
    </div>
  )
}

type MetricTone = "default" | "muted" | "success" | "info"

const VALUE_TONES: Record<MetricTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  success: "text-emerald-500",
  info: "text-sky-500",
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: Readonly<{
  icon: typeof Network
  label: string
  value: number
  tone: MetricTone
  loading: boolean
}>) {
  if (loading) {
    return (
      <div className="glass-1 space-y-2.5 px-3.5 py-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-12" />
      </div>
    )
  }

  return (
    <div className="glass-1 px-3.5 py-3 transition-colors duration-150 hover:border-border">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
        <span className="truncate text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
          {label}
        </span>
      </div>
      <AnimatedNumber
        value={value}
        className={cn(
          "mt-1.5 block text-2xl leading-7 font-bold tracking-tight tabular-nums",
          VALUE_TONES[tone],
        )}
      />
    </div>
  )
}
