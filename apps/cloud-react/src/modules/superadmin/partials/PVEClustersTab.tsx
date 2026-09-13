import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@datadack/common-ui"
import {
  AlertTriangle,
  ChevronRight,
  Cpu,
  Globe,
  HardDrive,
  KeyRound,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  ServerCog,
  Trash2,
  Unplug,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { ConfirmDialog, StatusBadge } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  useAdminAvailabilityZones,
  useAdminPVEClusters,
  useAdminPVENodes,
  useDeletePVECluster,
  useRegisterPVECluster,
  useSyncPVECluster,
} from "../superadmin.hooks"
import type { PVECluster, PVENode } from "../superadmin.types"

/** Bytes-free capacity summary shown on a node row. */
function NodeCapacity({ node }: Readonly<{ node: PVENode }>) {
  const ramGB = Math.round(node.ram_total_mb / 1024)
  return (
    <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
      <span className="flex items-center gap-1" title="vCPU">
        <Cpu className="size-3.5" />
        {node.cpu_total}
      </span>
      <span className="flex items-center gap-1" title="RAM">
        <MemoryStick className="size-3.5" />
        {ramGB} GB
      </span>
      <span className="flex items-center gap-1" title="Storage">
        <HardDrive className="size-3.5" />
        {node.storage_total_gb} GB
      </span>
    </div>
  )
}

/**
 * One node inside the hierarchy. Clicking it opens the node's own detail page,
 * so the tree stays a way of finding a node rather than a second place to
 * manage one.
 */
function NodeRow({ node, onOpen }: Readonly<{ node: PVENode; onOpen: (n: PVENode) => void }>) {
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(node)
      }}
      className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      <Server className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[13px] text-foreground truncate">{node.name}</span>
          <StatusBadge status={node.status} />
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">{node.ip_address}</span>
      </div>
      <NodeCapacity node={node} />
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Whether the node can talk to its manager, and whether it can
            authenticate its own webhook deliveries — the two credentials an
            operator actually chases when a node goes quiet. */}
        {node.has_agent_secret ? (
          <KeyRound className="size-3.5 text-emerald-600" aria-label="agent credentials set" />
        ) : (
          <KeyRound
            className="size-3.5 text-muted-foreground/40"
            aria-label="no agent credentials"
          />
        )}
        {node.webhook_registered_at ? (
          <Network className="size-3.5 text-emerald-600" aria-label="webhook registered" />
        ) : (
          <Network
            className="size-3.5 text-muted-foreground/40"
            aria-label="webhook not registered"
          />
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

/** A cluster and the nodes discovered from it, collapsible as one unit. */
function ClusterCard({
  cluster,
  nodes,
  azLabel,
  onOpenNode,
  onSync,
  syncing,
  onDelete,
}: Readonly<{
  cluster: PVECluster
  nodes: PVENode[]
  azLabel: (id: string) => string
  onOpenNode: (n: PVENode) => void
  onSync: (c: PVECluster) => void
  syncing: boolean
  onDelete: (c: PVECluster) => void
}>) {
  const { t } = useTranslation()

  // Where its machines actually are, derived from the nodes. A cluster has no
  // availability zone of its own — it spans racks — so summarising the column
  // that used to be on the cluster would have told an operator every cluster
  // sits in exactly one zone, which stopped being true the moment node
  // placement became settable.
  const unplaced = nodes.filter((n) => !n.availability_zone_id).length
  const zoneSummary = [...new Set(nodes.map((n) => n.availability_zone_id).filter(Boolean))]
    .map((id) => azLabel(id))
    .join(", ")

  // No accordion. A cluster is a PLACE you go into, not a row you unfold:
  // everything about it — its nodes, its networking, its inventory, its manager
  // health — lives on its own page, and expanding a row to see a node list was
  // showing one section of that page while hiding the rest.
  return (
    <Link
      to={`/admin/pve-clusters/${cluster.id}`}
      className="group block rounded-xl border border-border bg-card transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3 p-4">
        <ServerCog className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-foreground group-hover:underline underline-offset-4">
              {cluster.name}
            </span>
            <Badge variant="outline" className="font-mono text-[11px]">
              {t("superAdmin.pveClusters.nodeCount", { count: nodes.length })}
            </Badge>
            {/* Where its machines actually are. A cluster has no zone of its
                own — it spans racks — so this is derived from the nodes, and an
                unplaced one is the number that needs acting on. */}
            {zoneSummary ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Globe className="size-3" />
                {zoneSummary}
              </span>
            ) : null}
            {unplaced > 0 ? (
              <Badge variant="outline" className={cn("gap-1 text-[11px]", TONE_CLASSES.warning)}>
                <AlertTriangle className="size-3" />
                {t("superAdmin.pveClusters.unplaced", { count: unplaced })}
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              {cluster.endpoint} · {cluster.username}
            </span>
            {cluster.last_sync_error ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                <AlertTriangle className="size-3" />
                {t("superAdmin.pveClusters.syncFailed")}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {cluster.last_synced_at
                  ? t("superAdmin.pveClusters.syncedAt", {
                      when: new Date(cluster.last_synced_at).toLocaleString(),
                    })
                  : t("superAdmin.pveClusters.syncedNever")}
              </span>
            )}
          </div>
        </div>

        {/* Actions stop the click from reaching the card, so "Sync" does not
            also navigate — a destructive-adjacent button that silently moves
            you somewhere else is how the wrong cluster gets deleted. */}
        <div
          className="flex shrink-0 items-center gap-1.5"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          role="presentation"
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            loading={syncing}
            disabled={syncing}
            onClick={() => {
              onSync(cluster)
            }}
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            {t("superAdmin.pveClusters.sync")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("superAdmin.actions.delete")}
            onClick={() => {
              onDelete(cluster)
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* The failure text is the operator's only clue why a cluster stopped
          updating, so it is shown verbatim rather than summarised away. */}
      {cluster.last_sync_error ? (
        <p className="mx-4 mb-3 break-words rounded-md bg-destructive/10 px-3 py-2 font-mono text-[12px] text-destructive">
          {cluster.last_sync_error}
        </p>
      ) : null}
    </Link>
  )
}

interface PVEClustersTabProps {
  /** Lifted so the "Register cluster" button can live in the page header. */
  registerOpen: boolean
  onRegisterOpenChange: (open: boolean) => void
}

/**
 * The cluster hierarchy: one card per registered cluster listing its member
 * nodes, plus a section for nodes that belong to no cluster.
 *
 * Rendered as a tab of PVEFleetPage alongside the flat node table. The two used
 * to be separate admin pages, which meant the same fleet was described twice in
 * the sidebar and an operator had to know which page answered their question.
 */
export function PVEClustersTab({
  registerOpen,
  onRegisterOpenChange,
}: Readonly<PVEClustersTabProps>) {
  useScreen("superadmin.p-v-e-clusters")
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: clusters = [], isLoading: loadingClusters } = useAdminPVEClusters()
  const { data: nodes = [], isLoading: loadingNodes } = useAdminPVENodes()
  const { data: azs = [] } = useAdminAvailabilityZones()

  const register = useRegisterPVECluster()
  const sync = useSyncPVECluster()
  const { mutate: removeCluster, isPending: isDeleting } = useDeletePVECluster()

  const [deleting, setDeleting] = useState<PVECluster | null>(null)
  const [form, setForm] = useState({
    endpoint: "",
    username: "",
    token: "",
    availability_zone_id: "",
  })

  const azLabel = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (id: string) => byId.get(id) ?? id
  }, [azs])

  // Group once: nodes belonging to each cluster, plus the ones that belong to
  // none. The orphan group is deliberately visible — a node nobody registered
  // through a cluster is exactly the drift this page exists to surface.
  const { byCluster, orphans } = useMemo(() => {
    const map = new Map<string, PVENode[]>()
    const loose: PVENode[] = []
    for (const n of nodes) {
      if (n.cluster_id) {
        const list = map.get(n.cluster_id) ?? []
        list.push(n)
        map.set(n.cluster_id, list)
      } else {
        loose.push(n)
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    loose.sort((a, b) => a.name.localeCompare(b.name))
    return { byCluster: map, orphans: loose }
  }, [nodes])

  const openNode = (n: PVENode) => void navigate(`/admin/pve-nodes/${n.id}`)

  const canSubmit =
    form.endpoint.trim() !== "" &&
    form.username.trim() !== "" &&
    form.token.trim() !== "" &&
    form.availability_zone_id !== ""

  const submit = () => {
    if (!canSubmit) return
    register.mutate(
      {
        endpoint: form.endpoint.trim(),
        username: form.username.trim(),
        token: form.token.trim(),
        availability_zone_id: form.availability_zone_id,
      },
      {
        onSuccess: () => {
          onRegisterOpenChange(false)
          setForm({ endpoint: "", username: "", token: "", availability_zone_id: "" })
        },
      },
    )
  }

  const loading = loadingClusters || loadingNodes
  // Nothing to show at all — distinct from a registered cluster with no nodes,
  // which still deserves its card so its sync error stays visible.
  const nothingRegistered = clusters.length === 0 && orphans.length === 0
  // Which cluster is mid-sync. Only read while a sync is in flight, so the
  // mutation's variables are always populated at this point.
  const syncingClusterId = sync.isPending ? sync.variables.id : null

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : null}

      {!loading && nothingRegistered ? (
        <EmptyState
          icon={ServerCog}
          title={t("superAdmin.pveClusters.empty")}
          description={t("superAdmin.pveClusters.emptySubtitle")}
          action={{
            label: t("superAdmin.pveClusters.add"),
            onClick: () => {
              onRegisterOpenChange(true)
            },
          }}
        />
      ) : null}

      {!loading && !nothingRegistered ? (
        <div className="space-y-3">
          {clusters.map((c) => (
            <ClusterCard
              key={c.id}
              cluster={c}
              nodes={byCluster.get(c.id) ?? []}
              azLabel={azLabel}
              onOpenNode={openNode}
              onSync={(cl) => {
                sync.mutate({ id: cl.id })
              }}
              syncing={syncingClusterId === c.id}
              onDelete={setDeleting}
            />
          ))}

          {orphans.length > 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50">
              <div className="flex items-center gap-3 p-4">
                <Unplug className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[15px] text-foreground">
                      {t("superAdmin.pveClusters.unassignedTitle")}
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {t("superAdmin.pveClusters.nodeCount", { count: orphans.length })}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("superAdmin.pveClusters.unassignedSubtitle")}
                  </p>
                </div>
              </div>
              <div className="border-t border-border p-2 space-y-0.5">
                {orphans.map((n) => (
                  <NodeRow key={n.id} node={n} onOpen={openNode} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={registerOpen} onOpenChange={onRegisterOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("superAdmin.pveClusters.registerTitle")}</DialogTitle>
            <DialogDescription>{t("superAdmin.pveClusters.registerSubtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cluster-endpoint">
                {t("superAdmin.pveClusters.fields.endpoint")}
              </Label>
              <Input
                id="cluster-endpoint"
                value={form.endpoint}
                placeholder="pve1.example.com"
                onChange={(e) => {
                  setForm((f) => ({ ...f, endpoint: e.target.value }))
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("superAdmin.pveClusters.fields.endpointHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cluster-username">
                {t("superAdmin.pveClusters.fields.username")}
              </Label>
              <Input
                id="cluster-username"
                value={form.username}
                placeholder="root@pam!datadack"
                onChange={(e) => {
                  setForm((f) => ({ ...f, username: e.target.value }))
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("superAdmin.pveClusters.fields.usernameHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cluster-token">{t("superAdmin.pveClusters.fields.token")}</Label>
              <Input
                id="cluster-token"
                type="password"
                autoComplete="off"
                value={form.token}
                onChange={(e) => {
                  setForm((f) => ({ ...f, token: e.target.value }))
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("superAdmin.pveClusters.fields.tokenHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cluster-az">
                {t("superAdmin.pveClusters.fields.availabilityZone")}
              </Label>
              <Select
                value={form.availability_zone_id}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, availability_zone_id: v }))
                }}
              >
                <SelectTrigger id="cluster-az">
                  <SelectValue
                    placeholder={t("superAdmin.pveClusters.fields.availabilityZonePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {azs.map((az) => (
                    <SelectItem key={az.id} value={az.id}>
                      {az.code} — {az.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onRegisterOpenChange(false)
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={!canSubmit} loading={register.isPending}>
              {t("superAdmin.pveClusters.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t("superAdmin.pveClusters.deleteTitle")}
        description={t("superAdmin.pveClusters.deleteConfirm", { name: deleting?.name ?? "" })}
        confirmLabel={t("superAdmin.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleting) return
          removeCluster(
            { id: deleting.id },
            {
              onSuccess: () => {
                setDeleting(null)
              },
            },
          )
        }}
      />
    </div>
  )
}
