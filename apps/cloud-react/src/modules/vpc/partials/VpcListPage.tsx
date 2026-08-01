import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Network, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  copyColumn,
  dateColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  StatGrid,
  statusColumn,
  textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useScreen } from "@/services/api/screen"

import { Badge } from "@DataDack/common-ui"

import { VPC_ROUTES } from "../vpc.constants"
import {
  useAllSecurityGroups,
  useAllSubnets,
  useDeleteVPC,
  useStaticIPs,
  useVPCs,
} from "../vpc.hooks"
import type { VPCNetwork } from "../vpc.types"
import { formatIpCount } from "../vpc.utils"

export function VpcListPage() {
  useScreen("vpc.vpc-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: networks = [], isLoading, isError, refetch, isFetching } = useVPCs()
  const { data: subnets = [], isLoading: subnetsLoading } = useAllSubnets()
  const { data: securityGroups = [], isLoading: sgsLoading } = useAllSecurityGroups()
  const { data: staticIps = [], isLoading: ipsLoading } = useStaticIPs()
  const { mutate: deleteVPC, isPending: isDeleting } = useDeleteVPC()

  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<VPCNetwork | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return networks
    const q = query.toLowerCase()
    return networks.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.cidr.includes(q) ||
        n.region.toLowerCase().includes(q),
    )
  }, [networks, query])

  const subnetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const subnet of subnets) {
      counts.set(subnet.network_id, (counts.get(subnet.network_id) ?? 0) + 1)
    }
    return counts
  }, [subnets])

  const stats = useMemo(
    () => [
      { label: t("vpc.stats.networks"), value: networks.length, loading: isLoading },
      {
        label: t("vpc.stats.subnets"),
        value: subnets.length,
        loading: subnetsLoading,
      },
      {
        label: t("vpc.stats.securityGroups"),
        value: securityGroups.length,
        loading: sgsLoading,
      },
      {
        label: t("vpc.stats.staticIps"),
        value: staticIps.length,
        color: "info" as const,
        loading: ipsLoading,
      },
    ],
    [
      t,
      networks,
      isLoading,
      subnets,
      subnetsLoading,
      securityGroups,
      sgsLoading,
      staticIps,
      ipsLoading,
    ],
  )

  const columns = useMemo<ColumnDef<VPCNetwork>[]>(
    () => [
      copyColumn<VPCNetwork>({
        id: "id",
        header: "ID",
        accessor: (n) => `VPC-${n.tenant_serial}`,
        responsive: "lg",
      }),
      nameColumn<VPCNetwork>({ header: t("vpc.columns.name"), accessor: (n) => n.name }),
      statusColumn<VPCNetwork>({
        header: t("vpc.columns.status"),
        accessor: (n) => n.status,
        pulse: (n) => n.status === "active",
      }),
      copyColumn<VPCNetwork>({
        id: "cidr",
        header: t("vpc.columns.cidr"),
        accessor: (n) => n.cidr,
      }),
      textColumn<VPCNetwork>({
        id: "region",
        header: t("vpc.columns.region"),
        accessor: (n) => n.region,
        muted: true,
        responsive: "md",
      }),
      {
        id: "is_default",
        accessorFn: (n: VPCNetwork) => (n.is_default ? 1 : 0),
        header: () => t("vpc.columns.default"),
        meta: { responsive: "lg" },
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge
              variant="outline"
              className="font-mono text-[11px] text-status-info bg-status-info-bg border-status-info/25"
            >
              {t("vpc.badges.default")}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      textColumn<VPCNetwork>({
        id: "subnets",
        header: t("vpc.columns.subnets"),
        accessor: (n) => subnetCounts.get(n.id) ?? 0,
        mono: true,
        responsive: "lg",
      }),
      textColumn<VPCNetwork>({
        id: "totalIps",
        header: t("vpc.columns.totalIps"),
        accessor: (n) => formatIpCount(n.cidr),
        mono: true,
        muted: true,
        responsive: "xl",
      }),
      dateColumn<VPCNetwork>({
        header: t("common.created"),
        accessor: (n) => n.created_at,
        responsive: "xl",
      }),
      actionsColumn<VPCNetwork>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("vpc.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (n: VPCNetwork) => {
              setToDelete(n)
            },
          },
        ],
      }),
    ],
    [t, subnetCounts],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Network}
        breadcrumbs={[{ label: t("console.nav.groups.networking") }, { label: t("vpc.title") }]}
        title={t("vpc.title")}
        description={t("vpc.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2" onClick={() => void navigate(VPC_ROUTES.CREATE)}>
              <Plus className="w-4 h-4" />
              {t("vpc.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <ResourceTable<VPCNetwork>
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(network) => network.id}
        onRowClick={(network) => void navigate(VPC_ROUTES.detail(network.id))}
        enableColumnVisibility
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("vpc.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        emptyState={
          <EmptyState
            icon={Network}
            title={t("vpc.empty")}
            description={t("vpc.emptySubtitle")}
            action={{
              label: t("vpc.create"),
              onClick: () => void navigate(VPC_ROUTES.CREATE),
            }}
          />
        }
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("vpc.deleteConfirm.title")}
        description={t("vpc.deleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("vpc.actions.delete")}
        confirmText={toDelete?.name}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteVPC(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
