import { useCallback, useMemo, useState } from "react"

import {
  actionsColumn,
  cn,
  DataTable,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  CircleSlash,
  Globe,
  Layers,
  Lock,
  Network,
  Pencil,
  Search,
  SearchX,
  Trash2,
  Waypoints,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { AnimatedNumber } from "@/components/console"

import { ActiveBadge } from "../components/ActiveBadge"
import { cidrContains } from "../ip-utils"
import { useAdminAvailabilityZones, useAdminIPPools } from "../superadmin.hooks"
import type { IpPool } from "../superadmin.types"
import { AddIPPoolDialog } from "./AddIPPoolDialog"
import { DeleteIPPoolDialog } from "./DeleteIPPoolDialog"
import { EditIPPoolDialog } from "./EditIPPoolDialog"

const ALL = "all"

/** Zero-capacity pools would divide by zero; they read as fully used. */
function usedRatio(pool: IpPool): number {
  return pool.usable_count > 0 ? pool.used / pool.usable_count : 1
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

/**
 * A pool matches the search box on its name, its CIDR, its gateway — or on a
 * bare IP address that falls inside its block, which is how an operator holding
 * a customer's address finds the pool it came from.
 */
function matchesQuery(pool: IpPool, azCode: string, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === "") return true
  const haystack = [pool.name, pool.cidr, pool.gateway, pool.region, azCode]
  if (haystack.some((field) => field.toLowerCase().includes(needle))) return true
  return cidrContains(pool.cidr, query.trim())
}

interface Props {
  /** Lifted to the page so the header's primary action can open it. */
  addOpen: boolean
  onAddOpenChange: (open: boolean) => void
}

export function IPPoolsTab({ addOpen, onAddOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: pools = [], isLoading, isError, refetch, isFetching } = useAdminIPPools()
  const { data: azs = [] } = useAdminAvailabilityZones()

  const [query, setQuery] = useState("")
  const [region, setRegion] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  const [pendingDelete, setPendingDelete] = useState<IpPool | null>(null)
  const [editing, setEditing] = useState<IpPool | null>(null)

  // The block's addresses are a page, not a panel: an operator holding addresses
  // back for platform use works through the list, and that deserves a URL.
  const openPool = useCallback(
    (pool: IpPool) => {
      void navigate(`/admin/static-ips/pools/${pool.id}`)
    },
    [navigate],
  )

  const azCode = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (id: string | null) => (id ? (byId.get(id) ?? "") : "")
  }, [azs])

  // Only the regions that actually hold stock — an empty filter option is a
  // dead end.
  const regions = useMemo(
    () =>
      [...new Set(pools.map((p) => p.region).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [pools],
  )

  const filtersActive = query.trim() !== "" || region !== ALL || status !== ALL

  const filtered = useMemo(
    () =>
      pools.filter((pool) => {
        if (region !== ALL && pool.region !== region) return false
        if (status !== ALL && String(pool.is_active) !== status) return false
        return matchesQuery(pool, azCode(pool.availability_zone_id), query)
      }),
    [pools, region, status, query, azCode],
  )

  // Headline figures describe the whole inventory, not the current filter — the
  // filters are a way to find a row, not a way to re-scope the platform.
  const totals = useMemo(
    () =>
      pools.reduce(
        (acc, p) => ({
          usable: acc.usable + p.usable_count,
          available: acc.available + p.available,
          used: acc.used + p.used,
          active: acc.active + (p.is_active ? 1 : 0),
        }),
        { usable: 0, available: 0, used: 0, active: 0 },
      ),
    [pools],
  )

  const columns = useMemo<ColumnDef<IpPool>[]>(
    () => [
      {
        id: "pool",
        accessorFn: (p) => `${p.name} ${p.cidr}`,
        header: () => t("superAdmin.staticIps.pools.columns.pool"),
        cell: ({ row }) => <PoolCell pool={row.original} />,
      },
      {
        id: "location",
        // Sorted on the AZ code, not its uuid — an id sorts into nonsense.
        accessorFn: (p) => `${p.region} ${azCode(p.availability_zone_id)}`,
        header: () => t("superAdmin.staticIps.pools.columns.location"),
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <LocationCell
            region={row.original.region}
            az={azCode(row.original.availability_zone_id)}
          />
        ),
      },
      {
        id: "usage",
        accessorFn: (p) => usedRatio(p),
        header: () => t("superAdmin.staticIps.pools.columns.usage"),
        cell: ({ row }) => <UsageCell pool={row.original} />,
      },
      textColumn<IpPool>({
        id: "gateway",
        header: t("superAdmin.staticIps.pools.columns.gateway"),
        accessor: (p) => p.gateway || "—",
        mono: true,
        responsive: "xl",
      }),
      actionsColumn<IpPool>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("superAdmin.staticIps.pools.viewAddresses"),
            icon: Waypoints,
            onAction: openPool,
          },
          {
            label: t("superAdmin.staticIps.pools.edit"),
            icon: Pencil,
            onAction: setEditing,
          },
          {
            label: t("superAdmin.staticIps.pools.delete"),
            icon: Trash2,
            destructive: true,
            onAction: setPendingDelete,
          },
        ],
      }),
    ],
    [t, azCode, openPool],
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Globe}
          label={t("superAdmin.staticIps.stats.total")}
          value={totals.usable}
          badge={t("superAdmin.staticIps.stats.availableShare", {
            percent: percent(totals.available, totals.usable),
          })}
          ratio={totals.usable > 0 ? totals.available / totals.usable : 0}
          tone="default"
          loading={isLoading}
        />
        <MetricCard
          icon={Network}
          label={t("superAdmin.staticIps.stats.available")}
          value={totals.available}
          badge={`${String(percent(totals.available, totals.usable))}%`}
          ratio={totals.usable > 0 ? totals.available / totals.usable : 0}
          tone="success"
          loading={isLoading}
        />
        <MetricCard
          icon={Waypoints}
          label={t("superAdmin.staticIps.stats.inUse")}
          value={totals.used}
          badge={`${String(percent(totals.used, totals.usable))}%`}
          ratio={totals.usable > 0 ? totals.used / totals.usable : 0}
          tone="info"
          loading={isLoading}
        />
        <MetricCard
          icon={Layers}
          label={t("superAdmin.staticIps.stats.pools")}
          value={pools.length}
          badge={t("superAdmin.staticIps.stats.activeCount", { active: totals.active })}
          ratio={pools.length > 0 ? totals.active / pools.length : 0}
          tone="default"
          loading={isLoading}
        />
      </div>

      <DataTable<IpPool>
        data={filtered}
        columns={columns}
        loading={isLoading}
        stickyHeader
        // Stronger, quieter header type; roomier rows; a capped height so the
        // sticky header has something to stick to on a long list.
        className={cn(
          "[&_th]:h-10 [&_th]:text-[10.5px] [&_th]:font-semibold",
          "[&_[data-slot=table-container]]:max-h-[36rem]",
        )}
        rowClassName="even:bg-foreground/[0.015] hover:bg-muted/40 [&>td]:py-3 cursor-pointer"
        onRowClick={openPool}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(p) => p.id}
        toolbar={
          <>
            <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                }}
                aria-label={t("superAdmin.staticIps.pools.searchPlaceholder")}
                placeholder={t("superAdmin.staticIps.pools.searchPlaceholder")}
                className="pl-8"
              />
            </div>

            <FilterSelect
              value={region}
              onChange={setRegion}
              allLabel={t("superAdmin.staticIps.pools.filters.allRegions")}
              options={regions.map((r) => ({ value: r, label: r }))}
            />

            <FilterSelect
              value={status}
              onChange={setStatus}
              allLabel={t("superAdmin.staticIps.pools.filters.allStatuses")}
              options={[
                { value: "true", label: t("superAdmin.fields.active") },
                { value: "false", label: t("superAdmin.fields.inactive") },
              ]}
            />
          </>
        }
        empty={
          // Pre-filtered data means an emptied table is ambiguous — say which
          // kind of nothing this is rather than offering to create a first pool
          // to someone who simply mistyped a search.
          filtersActive ? (
            <EmptyState
              icon={SearchX}
              title={t("superAdmin.staticIps.pools.noMatches")}
              description={t("superAdmin.staticIps.pools.noMatchesSubtitle")}
            />
          ) : (
            <EmptyState
              icon={Network}
              title={t("superAdmin.staticIps.pools.empty")}
              description={t("superAdmin.staticIps.pools.emptySubtitle")}
              action={{
                label: t("superAdmin.staticIps.pools.createFirst"),
                onClick: () => {
                  onAddOpenChange(true)
                },
              }}
            />
          )
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <AddIPPoolDialog open={addOpen} onOpenChange={onAddOpenChange} />

      <EditIPPoolDialog
        pool={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />

      <DeleteIPPoolDialog
        pool={pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      />
    </div>
  )
}

/* ── Toolbar ───────────────────────────────────────────────────────────── */

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: Readonly<{
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ── Metrics ───────────────────────────────────────────────────────────── */

type MetricTone = "default" | "success" | "info"

const BAR_TONES: Record<MetricTone, string> = {
  default: "bg-foreground/40",
  success: "bg-emerald-500",
  info: "bg-sky-500",
}

const VALUE_TONES: Record<MetricTone, string> = {
  default: "text-foreground",
  success: "text-emerald-500",
  info: "text-sky-500",
}

/**
 * A stat tile that also carries its share of the whole. The bare count answers
 * "how many"; the bar answers "out of how many", which is the question an
 * operator watching inventory drain actually has.
 */
function MetricCard({
  icon: Icon,
  label,
  value,
  badge,
  ratio,
  tone,
  loading,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: number
  badge: string
  /** 0–1; drives the bar's width. */
  ratio: number
  tone: MetricTone
  loading: boolean
}>) {
  if (loading) {
    return (
      <div className="glass-1 space-y-2.5 px-3.5 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-1 w-full" />
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

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <AnimatedNumber
          value={value}
          className={cn(
            "text-2xl leading-7 font-bold tracking-tight tabular-nums",
            VALUE_TONES[tone],
          )}
        />
        <span className="truncate text-[11px] text-muted-foreground">{badge}</span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", BAR_TONES[tone])}
          style={{ width: `${String(Math.min(100, Math.max(0, ratio * 100)))}%` }}
        />
      </div>
    </div>
  )
}

/* ── Cells ─────────────────────────────────────────────────────────────── */

/** Name first, CIDR demoted to a subline, status as a pill beside the name. */
function PoolCell({ pool }: Readonly<{ pool: IpPool }>) {
  const source = `${String(pool.total_count)} mapped pairs`
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-medium text-foreground">{pool.name}</span>
        <ActiveBadge active={pool.is_active} />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{source}</span>
    </div>
  )
}

/**
 * Region over zone, one column instead of two. The zone shows as its letter
 * ("Zone A") because the full code just repeats the region above it — the exact
 * code stays reachable on hover, since that is what an operator greps for.
 */
function LocationCell({ region, az }: Readonly<{ region: string; az: string }>) {
  const { t } = useTranslation()
  const suffix = az.startsWith(region) ? az.slice(region.length) : ""
  const zone =
    suffix === "" ? az : t("superAdmin.staticIps.pools.zone", { zone: suffix.toUpperCase() })

  return (
    <div className="flex flex-col gap-1" title={az || undefined}>
      <span className="font-mono text-[13px] text-foreground">{region || "—"}</span>
      <span className="text-[11px] text-muted-foreground">{zone || "—"}</span>
    </div>
  )
}

/** Capacity as a bar plus the raw counts — "2 / 4" is the number, the bar is the feel. */
function UsageCell({ pool }: Readonly<{ pool: IpPool }>) {
  const { t } = useTranslation()
  const ratio = usedRatio(pool)
  const exhausted = pool.available === 0

  return (
    <div className="flex w-36 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[13px] tabular-nums text-foreground">
          {pool.used} / {pool.usable_count}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-[11px] tabular-nums",
            exhausted ? "text-amber-500" : "text-muted-foreground",
          )}
        >
          {exhausted && <CircleSlash className="size-3" />}
          {exhausted
            ? t("superAdmin.staticIps.pools.exhausted")
            : `${String(Math.round(ratio * 100))}%`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            exhausted ? "bg-amber-500" : "bg-sky-500",
          )}
          style={{ width: `${String(Math.round(ratio * 100))}%` }}
        />
      </div>
      {/* Withheld addresses are neither used nor available, so without this the
          two numbers above simply fail to add up to the block's size. */}
      {pool.blocked > 0 && (
        <span className="flex items-center gap-1 text-[11px] text-sky-500">
          <Lock className="size-3" />
          {t("superAdmin.staticIps.pools.blockedCount", { count: pool.blocked })}
        </span>
      )}
    </div>
  )
}
