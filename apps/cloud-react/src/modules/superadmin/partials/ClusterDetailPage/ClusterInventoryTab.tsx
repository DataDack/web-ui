import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TONE_CLASSES,
  cn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  GhostIcon,
  Container,
  Network,
  PlugZap,
  Search,
  Server,
  Waypoints,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useQueryParamState } from "@/hooks/use-query-param-state"

import { useClusterInventory } from "../../superadmin.hooks"
import type { InventoryGroup, InventoryItem } from "../../superadmin.types"

const GROUPS = ["network", "vm", "lxc"] as const

const TILE_TONE = {
  warning: "text-status-warning",
  bad: "text-destructive",
  muted: "text-muted-foreground",
} as const

const KIND_ICON = {
  qemu: Server,
  lxc: Container,
  zone: Network,
  vnet: Waypoints,
} as const

/**
 * What the cluster is carrying, read from Proxmox.
 *
 * Three pages, because networks, virtual machines and containers are three
 * different jobs — someone chasing a leaked VNet is not also looking at which
 * VMs are stopped. Zones and VNets stay on ONE page: a VNet is meaningless
 * without its zone, and separating them splits a single question in two.
 *
 * Within a page, platform-owned and tenant rows stay in one table with a filter
 * over them. Splitting those is how the platform's own zone gets mistaken for a
 * tenant's, and how a drifted row falls between two views.
 */
interface ClusterInventoryTabProps {
  readonly clusterId: string
}

export function ClusterInventoryTab({ clusterId }: ClusterInventoryTabProps) {
  const { t } = useTranslation()
  const [group, setGroup] = useQueryParamState<InventoryGroup>("inv", GROUPS, "vm")
  const [scope, setScope] = useState("")
  const [state, setState] = useState("")
  const [node, setNode] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)

  const query = useMemo(
    () => ({ group, scope, state, node, q, page, limit: 50 }),
    [group, scope, state, node, q, page],
  )
  const { data, isFetching } = useClusterInventory(clusterId, query)

  // Any filter change invalidates the page number: staying on page 4 of a
  // narrower result set shows an empty table that reads as "nothing here".
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("superAdmin.cluster.item"),
        cell: ({ row }) => {
          const i = row.original
          const Icon = KIND_ICON[i.kind]
          // The secondary line carries the identifiers an operator needs to act
          // on the row elsewhere — a VMID for a pct/qm command, a VNI for an SDN
          // one — rather than repeating the kind they just filtered by.
          const detail = [
            i.kind === "qemu" || i.kind === "lxc" ? i.id : null,
            i.zone,
            i.vni ? `VNI ${i.vni}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{i.name || i.id}</span>
                  {i.template ? (
                    <Badge variant="secondary">{t("superAdmin.cluster.template")}</Badge>
                  ) : null}
                </div>
                {detail ? (
                  <p className="truncate font-mono text-xs text-muted-foreground">{detail}</p>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        id: "state",
        header: t("superAdmin.cluster.state"),
        cell: ({ row }) => <StateBadge item={row.original} />,
      },
      {
        id: "scope",
        header: t("superAdmin.cluster.scope"),
        cell: ({ row }) => (
          <Badge variant={row.original.scope === "tenant" ? "outline" : "secondary"}>
            {t(`superAdmin.cluster.scopes.${row.original.scope}`)}
          </Badge>
        ),
      },
      {
        id: "owner",
        header: t("superAdmin.cluster.owner"),
        cell: ({ row }) => <OwnerCell item={row.original} />,
      },
      // Size and node are guest facts. On the networks page they would be a
      // column of dashes, which is worse than no column: it implies the data is
      // missing rather than inapplicable.
      ...(group === "network"
        ? []
        : [
            {
              id: "where",
              header: t("superAdmin.cluster.onNode"),
              cell: ({ row }: { row: { original: InventoryItem } }) => (
                <span className="text-sm text-muted-foreground">{row.original.node ?? "—"}</span>
              ),
            },
            {
              id: "size",
              header: t("superAdmin.cluster.size"),
              cell: ({ row }: { row: { original: InventoryItem } }) =>
                row.original.cpus ? (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {row.original.cpus} vCPU · {Math.round((row.original.memory_mb ?? 0) / 1024)} GB
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                ),
            },
          ]),
    ],
    [t, group],
  )

  if (!data) return <Skeleton className="h-96 w-full" />

  // An unreachable cluster and an idle one look identical without this.
  if (data.error) {
    return (
      <EmptyState
        icon={PlugZap}
        title={t("superAdmin.cluster.inventoryUnreachable")}
        description={data.error}
      />
    )
  }

  const s = data.summary

  return (
    <div className="space-y-4">
      <Tabs value={group} onValueChange={reset((v: string) => { setGroup(v as InventoryGroup) })}>
        <TabsList>
          <TabsTrigger value="vm">{t("superAdmin.cluster.groups.vm")}</TabsTrigger>
          <TabsTrigger value="lxc">{t("superAdmin.cluster.groups.lxc")}</TabsTrigger>
          <TabsTrigger value="network">{t("superAdmin.cluster.groups.network")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Drift first. This view exists to surface rows that do not line up, and
          the counts are what say whether to look at all. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("superAdmin.cluster.total")}
          value={s.total}
          active={!state && !scope}
          onClick={() => {
            setScope("")
            reset(setState)("")
          }}
        />
        <Tile
          icon={GhostIcon}
          tone={s.orphans > 0 ? "warning" : "muted"}
          label={t("superAdmin.cluster.orphans")}
          hint={t("superAdmin.cluster.orphansHint")}
          value={s.orphans}
          active={state === "orphan"}
          onClick={() => { reset(setState)(state === "orphan" ? "" : "orphan") }}
        />
        <Tile
          icon={AlertTriangle}
          tone={s.missing > 0 ? "bad" : "muted"}
          label={t("superAdmin.cluster.missing")}
          hint={t("superAdmin.cluster.missingHint")}
          value={s.missing}
          active={state === "missing"}
          onClick={() => { reset(setState)(state === "missing" ? "" : "missing") }}
        />
        <Tile
          label={t("superAdmin.cluster.scopes.tenant")}
          hint={t("superAdmin.cluster.platformCount", { count: s.platform })}
          value={s.tenant}
          active={scope === "tenant"}
          onClick={() => { reset(setScope)(scope === "tenant" ? "" : "tenant") }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { reset(setQ)(e.target.value) }}
            placeholder={t("superAdmin.cluster.searchPlaceholder")}
            className="pl-8"
            aria-label={t("superAdmin.cluster.searchPlaceholder")}
          />
        </div>
        {data.nodes.length > 0 ? (
          <Select value={node || "all"} onValueChange={(v) => { reset(setNode)(v === "all" ? "" : v) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("superAdmin.cluster.allNodes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("superAdmin.cluster.allNodes")}</SelectItem>
              {data.nodes.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {/* DataTable draws its own bordered frame, so it is not wrapped in one —
          a Card here put a box inside a box. The empty state draws none and is
          left as it is, matching every other tab on this page. */}
      <div className={cn(isFetching && "opacity-70 transition-opacity")}>
        {data.items.length === 0 ? (
          <EmptyState
            icon={group === "network" ? Network : Boxes}
            title={t("superAdmin.cluster.nothingMatches")}
            description={t("superAdmin.cluster.nothingMatchesBody")}
          />
        ) : (
          <DataTable columns={columns} data={data.items} />
        )}
      </div>

      {data.pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {t("superAdmin.cluster.pageOf", { page: data.page, pages: data.pages, total: data.total })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => { setPage(data.page - 1) }}
            >
              <ChevronLeft className="size-4" />
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.pages}
              onClick={() => { setPage(data.page + 1) }}
            >
              {t("common.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Who owns this, and a way to get to them.
 *
 * An account id is not owner information — nobody recognises 3f2a91c4 — so the
 * name leads and the account number sits under it, which is what an operator
 * actually quotes in a ticket. The whole cell is the link, because "find the
 * owner" is the next thing they do after finding the row.
 */
function OwnerCell({ item }: Readonly<{ item: InventoryItem }>) {
  const { t } = useTranslation()

  if (!item.account_id) {
    // No account means the platform's own, or nothing claims it. Both are real
    // answers and neither is a link to anywhere.
    return (
      <span className="text-sm text-muted-foreground">
        {item.owner_name || t(`superAdmin.cluster.scopes.${item.scope}`)}
      </span>
    )
  }

  return (
    <Link
      to={`/admin/accounts/${item.account_id}/resources`}
      className="group/owner -mx-2 flex min-w-0 items-center gap-2 rounded px-2 py-1 hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium group-hover/owner:underline underline-offset-4">
          {item.account_name || item.account_id.slice(0, 8)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[item.account_number, item.owner_name].filter(Boolean).join(" · ") ||
            t(`superAdmin.cluster.scopes.${item.scope}`)}
        </p>
      </div>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/owner:opacity-100" />
    </Link>
  )
}

/** The two drift states read very differently, so they do not share a colour. */
function StateBadge({ item }: Readonly<{ item: InventoryItem }>) {
  const { t } = useTranslation()
  if (item.state === "orphan") {
    return (
      <Badge variant="outline" className={cn("gap-1", TONE_CLASSES.warning)}>
        <GhostIcon className="size-3" />
        {t("superAdmin.cluster.states.orphan")}
      </Badge>
    )
  }
  if (item.state === "missing") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" />
        {t("superAdmin.cluster.states.missing")}
      </Badge>
    )
  }
  if (item.status) {
    return (
      <Badge variant="outline" className={item.status === "running" ? TONE_CLASSES.success : TONE_CLASSES.neutral}>{item.status}</Badge>
    )
  }
  return <Badge variant="outline" className={TONE_CLASSES.success}>{t("superAdmin.cluster.states.ok")}</Badge>
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "muted",
  active,
  onClick,
}: Readonly<{
  icon?: typeof Boxes
  label: string
  value: number
  hint?: string
  tone?: "warning" | "bad" | "muted"
  active: boolean
  onClick: () => void
}>) {
  const toneClass = TILE_TONE[tone]
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
        {Icon ? <Icon className="size-4" /> : null}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 truncate text-sm text-muted-foreground">{hint}</p> : null}
    </Card>
  )
}
